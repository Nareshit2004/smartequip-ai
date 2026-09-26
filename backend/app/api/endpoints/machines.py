from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import json
import datetime

from app.core.database import get_db
from app.models.machine import Machine
from app.models.sensor import SensorData, AIPrediction
from app.schemas.machine import MachineCreate, MachineResponse
from app.utils.simulator import simulator_instance
from app.ai.inference import ai_service

router = APIRouter()

@router.post("/", response_model=MachineResponse)
async def create_machine(machine_in: MachineCreate, db: AsyncSession = Depends(get_db)):
    data = machine_in.model_dump()
    raw_status = (data.get('status') or 'HEALTHY').upper()
    if raw_status in ['ACTIVE', 'HEALTHY']:
        status = 'HEALTHY'
        health_score = 94.0
    elif raw_status in ['WARNING', 'MAINTENANCE']:
        status = 'WARNING'
        health_score = 68.0
    elif raw_status in ['HIGH_RISK', 'HIGH RISK']:
        status = 'HIGH_RISK'
        health_score = 48.0
    elif raw_status in ['CRITICAL', 'DANGER']:
        status = 'CRITICAL'
        health_score = 25.0
    else:
        status = 'HEALTHY'
        health_score = 90.0

    data['status'] = status
    data['health_score'] = health_score
            
    machine = Machine(**data)
    db.add(machine)
    await db.commit()
    await db.refresh(machine)

    # Automatically generate 20 initial baseline telemetry records
    sensor_rows = []
    now = datetime.datetime.now(datetime.timezone.utc)
    for i in range(20):
        t_stamp = now - datetime.timedelta(minutes=(20 - i) * 5)
        reading = simulator_instance.generate_reading(machine.id, machine.type, machine.status)
        s_data = SensorData(
            machine_id=machine.id,
            timestamp=t_stamp,
            temperature=reading["temperature"],
            vibration=reading["vibration"],
            pressure=reading["pressure"],
            rpm=reading["rpm"],
            current=reading["current"],
            voltage=reading["voltage"],
            is_anomaly=reading["is_anomaly"]
        )
        db.add(s_data)
        sensor_rows.append([
            s_data.temperature, s_data.vibration, s_data.pressure,
            s_data.rpm, s_data.current, s_data.voltage
        ])
    await db.commit()

    # Automatically run initial AI inference and store prediction
    try:
        ai_res = ai_service.predict_machine_state(sensor_rows)
        pred = AIPrediction(
            machine_id=machine.id,
            failure_risk=ai_res["failure_risk"],
            rul_days=ai_res["rul_days"],
            confidence=ai_res["confidence"],
            health_score=ai_res["health_score"],
            explanation_json=json.dumps(ai_res.get("explanation", {})),
            unreliable_sensors_json=json.dumps(ai_res.get("unreliable_sensors", [])),
            root_cause_analysis=ai_res.get("root_cause_analysis", ""),
            recommendation=ai_res.get("recommendation", "")
        )
        db.add(pred)
        # Update machine health score to match AI inference result
        machine.health_score = ai_res["health_score"]
        machine.status = ai_res["status"]
        await db.commit()
        await db.refresh(machine)
    except Exception as e:
        print(f"Initial AI prediction on new machine error: {e}")

    return machine

@router.get("/", response_model=List[MachineResponse])
async def read_machines(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Machine).offset(skip).limit(limit))
    machines = result.scalars().all()
    return machines

@router.get("/{machine_id}", response_model=MachineResponse)
async def read_machine(machine_id: str, db: AsyncSession = Depends(get_db)):
    try:
        numeric_id = int(str(machine_id).replace("M-", "").strip())
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid machine ID")
    result = await db.execute(select(Machine).filter(Machine.id == numeric_id))
    machine = result.scalars().first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine
