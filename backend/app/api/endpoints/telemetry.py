from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.sensor import SensorData, AIPrediction
from app.schemas.sensor import SensorDataCreate, SensorDataResponse, AIPredictionResponse, AIFeedbackCreate
from app.utils.simulator import simulator_instance
from app.ai.inference import ai_service
from app.models.machine import Machine
from app.models.lineage import AIDataLineage
from app.models.maintenance import Notification
from app.models.feedback import AIFeedback
from app.ai.machine_profiles import (
    extract_actual_features,
    get_actual_preprocessing_steps,
    get_real_historical_evidence
)
import uuid
import datetime

router = APIRouter()

@router.post("/simulate/{machine_id}", response_model=SensorDataResponse)
async def simulate_telemetry(machine_id: str, db: AsyncSession = Depends(get_db)):
    try:
        numeric_id = int(str(machine_id).replace("M-", "").strip())
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid machine ID")
        
    # Verify machine exists
    result = await db.execute(select(Machine).filter(Machine.id == numeric_id))
    machine = result.scalars().first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
        
    # Generate simulated reading with machine-specific baselines
    reading = simulator_instance.generate_reading(numeric_id, machine.type, machine.status)
    
    # Save to DB
    sensor_data = SensorData(
        machine_id=numeric_id,
        temperature=reading["temperature"],
        vibration=reading["vibration"],
        pressure=reading["pressure"],
        rpm=reading["rpm"],
        current=reading["current"],
        voltage=reading["voltage"],
        is_anomaly=reading["is_anomaly"]
    )
    db.add(sensor_data)
    await db.commit()
    await db.refresh(sensor_data)
    
    return sensor_data


@router.get("/history/{machine_id}", response_model=List[SensorDataResponse])
async def get_historical_telemetry(machine_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)):
    try:
        numeric_id = int(str(machine_id).replace("M-", "").strip())
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid machine ID")
    result = await db.execute(
        select(SensorData)
        .filter(SensorData.machine_id == numeric_id)
        .order_by(SensorData.timestamp.desc())
        .limit(limit)
    )
    sensors = result.scalars().all()
    # Return chronologically
    sensors.reverse()
    return sensors

@router.get("/last-prediction/{machine_id}", response_model=AIPredictionResponse)
async def get_last_prediction(machine_id: str, db: AsyncSession = Depends(get_db)):
    """Return the most recent AI prediction for a machine, or 404 if none yet."""
    try:
        numeric_id = int(str(machine_id).replace("M-", "").strip())
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid machine ID")
    import json as _json
    result = await db.execute(
        select(AIPrediction)
        .filter(AIPrediction.machine_id == numeric_id)
        .order_by(AIPrediction.timestamp.desc())
        .limit(1)
    )
    pred = result.scalars().first()
    if not pred:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No AI prediction found for this machine")
    # Deserialize stored JSON fields
    unreliable = _json.loads(pred.unreliable_sensors_json) if pred.unreliable_sensors_json else []
    explanation = _json.loads(pred.explanation_json) if pred.explanation_json else {}
    setattr(pred, "unreliable_sensors", unreliable)
    setattr(pred, "explanation", explanation)
    # root_cause_analysis and recommendation are now real DB columns — no override needed
    return pred

@router.post("/ai-health-check/{machine_id}", response_model=AIPredictionResponse)
async def run_ai_health_check(machine_id: str, db: AsyncSession = Depends(get_db)):
    try:
        numeric_id = int(str(machine_id).replace("M-", "").strip())
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid machine ID")
        
    # Fetch recent sensor data for this machine (e.g. last 10 readings for window)
    result = await db.execute(
        select(SensorData)
        .filter(SensorData.machine_id == numeric_id)
        .order_by(SensorData.timestamp.desc())
        .limit(10)
    )
    sensors = result.scalars().all()
    
    if len(sensors) < 10:
        # Auto-simulate 10 points if missing
        from app.utils.simulator import simulator_instance
        for _ in range(10):
            reading = simulator_instance.generate_reading(numeric_id)
            sensor_data = SensorData(
                machine_id=numeric_id,
                temperature=reading["temperature"],
                vibration=reading["vibration"],
                pressure=reading["pressure"],
                rpm=reading["rpm"],
                current=reading["current"],
                voltage=reading["voltage"],
                is_anomaly=reading["is_anomaly"]
            )
            db.add(sensor_data)
        await db.commit()
        
        # Re-fetch
        result = await db.execute(
            select(SensorData)
            .filter(SensorData.machine_id == numeric_id)
            .order_by(SensorData.timestamp.desc())
            .limit(10)
        )
        sensors = result.scalars().all()
    # Prepare data for AI model (needs chronologial order)
    sensors.reverse()
    sensor_list = [
        [s.temperature, s.vibration, s.pressure, s.rpm, s.current, s.voltage] 
        for s in sensors
    ]
    
    # Run Inference
    ai_results = ai_service.predict_machine_state(sensor_list)
    
    # Save AI Prediction to DB
    unreliable = ai_results.get("unreliable_sensors", [])
    import json
    prediction = AIPrediction(
        machine_id=numeric_id,
        failure_risk=ai_results["failure_risk"],
        rul_days=ai_results["rul_days"],
        confidence=ai_results["confidence"],
        health_score=ai_results["health_score"],
        explanation_json=json.dumps(ai_results.get("explanation", {})),
        unreliable_sensors_json=json.dumps(unreliable),
        root_cause_analysis=ai_results.get("root_cause_analysis", ""),
        recommendation=ai_results.get("recommendation", "")
    )
    db.add(prediction)
    
    # Update Machine Health Score in Machine table
    machine_result = await db.execute(select(Machine).filter(Machine.id == numeric_id))
    machine = machine_result.scalars().first()
    if machine:
        machine.health_score = ai_results["health_score"]
        machine.status = ai_results["status"]
        
    # Auto-generate notification for critical thresholds
    if ai_results["failure_risk"] > 70 or ai_results["health_score"] < 40 or ai_results["is_anomaly"]:
        notif_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
        notif_msg = f"Critical risk detected! Risk: {ai_results['failure_risk']}%, RUL: {ai_results['rul_days']} days."
        if ai_results["is_anomaly"]:
            notif_msg = f"High anomaly score detected! Score: {ai_results['anomaly_score']}."
            
        notif = Notification(
            notification_id=notif_id,
            machine_id=f"M-{numeric_id}",
            machine_name=machine.name if machine else f"Machine {numeric_id}",
            type="critical_risk",
            severity="Critical",
            message=notif_msg
        )
        db.add(notif)
        
    # Auto-generate notification for Sensor Reliability
    unreliable_sensors = ai_results.get("unreliable_sensors", [])
    if unreliable_sensors:
        sensor_list = ", ".join(unreliable_sensors)
        notif_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
        notif = Notification(
            notification_id=notif_id,
            machine_id=f"M-{numeric_id}",
            machine_name=machine.name if machine else f"Machine {numeric_id}",
            type="sensor_reliability_warning",
            severity="Warning",
            message=f"Sensor drift or freezing detected on: {sensor_list}. Recommend recalibration."
        )
        db.add(notif)
        
    await db.commit()
    await db.refresh(prediction)
    
    # Save Lineage Metadata (non-blocking style capture)
    try:
        m_type = machine.type if machine else "General Equipment"
        m_name = machine.name if machine else f"Machine {numeric_id}"
        
        sensor_ids, sensor_names, feature_display_names, feature_vals = extract_actual_features(sensors, m_type)
        raw_count = len(sensors)
        processed_count = len(sensors)
        preproc_steps = get_actual_preprocessing_steps(raw_count, processed_count, window_size=min(max(raw_count, 1), 60))
        hist_evidence = await get_real_historical_evidence(db, f"M-{numeric_id}")

        lineage_id = f"LIN-{uuid.uuid4().hex[:8]}"
        lineage_record = AIDataLineage(
            lineage_id=lineage_id,
            result_type="health_check",
            result_id=str(prediction.id),
            machine_id=f"M-{numeric_id}",
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
                "health_score": ai_results.get("health_score")
            },
            confidence=ai_results["confidence"]
        )
        db.add(lineage_record)
        await db.commit()
    except Exception as e:
        print(f"Failed to capture lineage: {e}")
        # Does not block the prediction
        
    # We must attach unreliable_sensors to the returned object so Pydantic serializes it
    setattr(prediction, "unreliable_sensors", unreliable)
    # Also attach explanation so the UI has it readily available
    setattr(prediction, "explanation", ai_results.get("explanation", {}))
    # Attach Phase 6 fields
    setattr(prediction, "recommendation", ai_results.get("recommendation", ""))
    setattr(prediction, "root_cause_analysis", ai_results.get("root_cause_analysis", ""))
    
    return prediction

@router.post("/feedback")
async def submit_ai_feedback(feedback: AIFeedbackCreate, db: AsyncSession = Depends(get_db)):
    """Store human-in-the-loop feedback regarding AI predictions."""
    fb_record = AIFeedback(
        machine_id=feedback.machine_id,
        action_taken=feedback.action_taken,
        override_reason=feedback.override_reason
    )
    db.add(fb_record)
    await db.commit()
    return {"status": "success", "message": "Feedback recorded."}
