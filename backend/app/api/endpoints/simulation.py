from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.sensor import SensorData
from app.ai.inference import ai_service
from app.models.machine import Machine
from app.models.lineage import AIDataLineage
from app.models.maintenance import Notification
from app.ai.machine_profiles import (
    extract_actual_features,
    get_actual_preprocessing_steps,
    get_real_historical_evidence
)
from datetime import datetime
import uuid

from typing import List, Optional, Union
from app.utils.simulator import simulator_instance

router = APIRouter()

class WhatIfRequest(BaseModel):
    machine_id: Union[int, str]
    operating_duration_days: float = 7.0
    machine_load_modifier: float = 1.0 # 1.0 is normal, 1.2 is 20% higher load
    action: Optional[str] = None # e.g. "delay_maintenance", "reduce_load"

class WhatIfResponse(BaseModel):
    simulated_health_score: float
    simulated_failure_risk: float
    simulated_rul_days: float
    warning_message: Optional[str] = None

@router.post("/what-if", response_model=WhatIfResponse)
async def run_what_if_simulation(request: WhatIfRequest, db: AsyncSession = Depends(get_db)):
    # 1. Fetch current machine state
    m_id = int(str(request.machine_id).replace('M-', ''))
    machine_result = await db.execute(select(Machine).filter(Machine.id == m_id))
    machine = machine_result.scalars().first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
        
    # Fetch last 10 sensor readings to base our simulation on
    result = await db.execute(
        select(SensorData)
        .filter(SensorData.machine_id == m_id)
        .order_by(SensorData.timestamp.desc())
        .limit(10)
    )
    sensors = list(result.scalars().all())
    if len(sensors) < 10:
        for _ in range(10 - len(sensors)):
            reading = simulator_instance.generate_reading(m_id, machine.type, machine.status)
            s_data = SensorData(
                machine_id=m_id,
                temperature=reading["temperature"],
                vibration=reading["vibration"],
                pressure=reading["pressure"],
                rpm=reading["rpm"],
                current=reading["current"],
                voltage=reading["voltage"],
                is_anomaly=reading["is_anomaly"]
            )
            db.add(s_data)
            sensors.append(s_data)
        await db.commit()
        
    sensors.reverse()
    
    # 2. Modify the data based on the scenario
    simulated_sensor_list = []
    
    # Calculate degradation multiplier based on time + load
    degradation_factor = (request.operating_duration_days * 0.05) * request.machine_load_modifier
    
    for s in sensors:
        # Increase values to simulate wear over time, scaled by load
        temp = s.temperature * (1.0 + (0.02 * degradation_factor))
        vib = s.vibration * (1.0 + (0.05 * degradation_factor))
        press = s.pressure * (1.0 + (0.01 * degradation_factor))
        rpm = s.rpm * (1.0 - (0.01 * degradation_factor)) # RPM drops with wear
        curr = s.current * (1.0 + (0.03 * degradation_factor))
        volt = s.voltage
        
        simulated_sensor_list.append([temp, vib, press, rpm, curr, volt])
        
    # 3. Run Inference on the HYPOTHETICAL data
    ai_results = ai_service.predict_machine_state(simulated_sensor_list)
    
    warning = None
    if ai_results["failure_risk"] > 70:
        warning = "CRITICAL: Simulated conditions lead to extremely high failure risk. Maintenance strongly recommended."
    elif ai_results["rul_days"] < request.operating_duration_days:
        warning = f"WARNING: Machine is likely to fail before the simulated duration ({request.operating_duration_days} days)."
        
    if warning:
        notif_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
        notif = Notification(
            notification_id=notif_id,
            machine_id=f"M-{m_id}",
            machine_name=machine.name,
            type="predicted_failure",
            severity="Warning",
            message=warning
        )
        db.add(notif)
        
    # Save Lineage Metadata (non-blocking style capture)
    try:
        m_type = machine.type if machine else "General Equipment"
        m_name = machine.name if machine else f"Machine {m_id}"
        
        sensor_ids, sensor_names, feature_display_names, feature_vals = extract_actual_features(sensors, m_type)
        raw_count = len(sensors)
        processed_count = len(sensors)
        extra_steps = [
            f"Scenario modification: load modifier {request.machine_load_modifier}x",
            f"Scenario projection: {request.operating_duration_days} days operating window"
        ]
        preproc_steps = get_actual_preprocessing_steps(raw_count, processed_count, window_size=min(max(raw_count, 1), 60), extra_steps=extra_steps)
        hist_evidence = await get_real_historical_evidence(db, f"M-{m_id}")

        lineage_id = f"LIN-{uuid.uuid4().hex[:8]}"
        lineage_record = AIDataLineage(
            lineage_id=lineage_id,
            result_type="what_if_simulation",
            result_id=None,
            machine_id=f"M-{m_id}",
            machine_type=m_type,
            machine_name=m_name,
            model_name="Transformer Time-Series Health Model",
            model_version="v2.4.1",
            framework="PyTorch",
            model_run_id=f"RUN-{uuid.uuid4().hex[:6].upper()}",
            input_start_time=sensors[-1].timestamp if sensors else None,
            input_end_time=sensors[0].timestamp if sensors else None,
            input_sample_count=len(sensors),
            sensor_ids=sensor_ids,
            sensor_names=sensor_names,
            preprocessing_steps=preproc_steps,
            feature_names=feature_display_names,
            historical_evidence=hist_evidence,
            output_summary={
                "prediction": ai_results["status"],
                "failure_risk": ai_results["failure_risk"],
                "rul_days": ai_results["rul_days"],
                "simulated_duration_days": request.operating_duration_days,
                "simulated_load_modifier": request.machine_load_modifier
            },
            confidence=ai_results["confidence"]
        )
        db.add(lineage_record)
        await db.commit()
    except Exception as e:
        print(f"Failed to capture lineage: {e}")
        # Does not block the simulation
        
    return WhatIfResponse(
        simulated_health_score=ai_results["health_score"],
        simulated_failure_risk=ai_results["failure_risk"],
        simulated_rul_days=ai_results["rul_days"],
        warning_message=warning
    )
