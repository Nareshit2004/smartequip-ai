import asyncio
import sys
import os
import random
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.models.machine import Machine
from app.models.maintenance import WorkOrder, FaultReport
from app.models.sensor import SensorData, AIPrediction
from app.utils.simulator import simulator_instance
from sqlalchemy.future import select
from sqlalchemy import delete

async def seed():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Machine))
        existing = res.scalars().all()
        force = "--force" in sys.argv
        if not force and len(existing) >= 15:
            print("15 or more machines already exist. Skipping seed to remain idempotent (use --force to reseed).")
            return

        print("Clearing existing dev records for a clean 15-machine seed...")
        from app.models.user import User
        await db.execute(delete(AIPrediction))
        await db.execute(delete(SensorData))
        await db.execute(delete(WorkOrder))
        await db.execute(delete(FaultReport))
        await db.execute(delete(User))
        await db.execute(delete(Machine))
        await db.commit()

        machine_definitions = [
            ("CNC Lathe Alpha", "Lathe", "HEALTHY", 95.0),
            ("CNC Milling Machine Beta", "Milling", "HEALTHY", 92.0),
            ("Hydraulic Press Gamma", "Press", "CRITICAL", 25.0),
            ("Industrial Compressor Delta", "Compressor", "WARNING", 65.0),
            ("Injection Molding Machine Epsilon", "Molding", "HEALTHY", 88.0),
            ("Robotic Welding Cell Zeta", "Welding", "HEALTHY", 98.0),
            ("Industrial Pump Eta", "Pump", "CRITICAL", 12.0),
            ("Conveyor Drive System Theta", "Conveyor", "HEALTHY", 85.0),
            ("Industrial Air Compressor Iota", "Compressor", "WARNING", 72.0),
            ("CNC Grinding Machine Kappa", "Grinding", "HEALTHY", 96.0),
            ("Gearbox Assembly Unit Lambda", "Assembly", "HEALTHY", 91.0),
            ("Industrial Boiler Unit Mu", "Boiler", "CRITICAL", 35.0),
            ("Automated Cutting Machine Nu", "Cutting", "WARNING", 58.0),
            ("Hydraulic Pump System Xi", "Pump", "HEALTHY", 89.0),
            ("Industrial Fan System Omicron", "Conveyor", "HEALTHY", 99.0) # Conveyor behavior matches fan
        ]

        machines = []
        for name, m_type, status, h_score in machine_definitions:
            machines.append(Machine(name=name, type=m_type, status=status, health_score=h_score))
        
        db.add_all(machines)
        await db.commit()
        
        # Re-query to get assigned IDs
        res = await db.execute(select(Machine))
        saved_machines = res.scalars().all()
        
        print("Seeding historical telemetry (100 points per machine)...")
        sensor_data_list = []
        for m in saved_machines:
            # Generate 100 historical points going back 100 minutes
            base_time = datetime.utcnow() - timedelta(minutes=100)
            
            for i in range(100):
                # We do NOT want random permanent failures during seeding
                reading = simulator_instance.generate_reading(m.id, m.type, m.status, force_healthy=True)
                sensor_data_list.append(SensorData(
                    machine_id=m.id,
                    timestamp=base_time + timedelta(minutes=i),
                    temperature=reading["temperature"],
                    vibration=reading["vibration"],
                    pressure=reading["pressure"],
                    rpm=reading["rpm"],
                    current=reading["current"],
                    voltage=reading["voltage"],
                    is_anomaly=reading["is_anomaly"]
                ))
        
        # Batch insert sensors
        db.add_all(sensor_data_list)
        await db.commit()

        print("Generating synchronized initial AI predictions for all machines...")
        from app.ai.inference import ai_service
        import json
        for m in saved_machines:
            # Query the 10 most recent readings for this machine in chronological order
            res = await db.execute(
                select(SensorData)
                .filter(SensorData.machine_id == m.id)
                .order_by(SensorData.timestamp.desc())
                .limit(10)
            )
            sensors = res.scalars().all()
            sensors.reverse()
            sensor_list = [
                [s.temperature, s.vibration, s.pressure, s.rpm, s.current, s.voltage]
                for s in sensors
            ]
            ai_results = ai_service.predict_machine_state(sensor_list)

            # Synchronize machine table with initial AI evaluation
            m.health_score = ai_results["health_score"]
            m.status = ai_results["status"]

            unreliable = ai_results.get("unreliable_sensors", [])
            pred = AIPrediction(
                machine_id=m.id,
                failure_risk=ai_results["failure_risk"],
                rul_days=ai_results["rul_days"],
                confidence=ai_results["confidence"],
                health_score=ai_results["health_score"],
                explanation_json=json.dumps(ai_results.get("explanation", {})),
                unreliable_sensors_json=json.dumps(unreliable),
                root_cause_analysis=ai_results.get("root_cause_analysis", ""),
                recommendation=ai_results.get("recommendation", "")
            )
            db.add(pred)
        await db.commit()

        print("Seeding maintenance records...")
        work_orders = []
        fault_reports = []
        for idx, m in enumerate(saved_machines):
            m_str_id = f"M-{m.id}"
            
            # Generate a work order for machines not perfectly healthy
            if m.status != "HEALTHY":
                wo = WorkOrder(
                    order_id=f"WO-{1000 + m.id}", 
                    machine_id=m_str_id, 
                    priority="High" if m.status=="CRITICAL" else "Normal",
                    reason=f"Inspection required for {m.name}",
                    estimated_duration_hours=random.uniform(1.0, 8.0),
                    status="Pending" if m.status=="CRITICAL" else "Scheduled",
                    scheduled_date=datetime.utcnow() + timedelta(days=random.randint(1,5)),
                    technician=random.choice(["John Doe", "Jane Smith", "Mike Ross", "Rachel Zane"])
                )
                work_orders.append(wo)
            
            # Generate realistic fault reports based on machine state
            if m.status == "CRITICAL":
                fault_reports.append(FaultReport(
                    report_id=f"FR-{2000 + m.id}A",
                    machine_id=m_str_id,
                    category="Mechanical" if "Press" in m.type or "Pump" in m.type else "Thermal",
                    description=f"Critical threshold crossed on {m.name}. Severe degradation detected.",
                    severity="Critical",
                    status="Open",
                    reported_by="AI Monitor"
                ))
                fault_reports.append(FaultReport(
                    report_id=f"FR-{2000 + m.id}B",
                    machine_id=m_str_id,
                    category="Hydraulic" if "Press" in m.type or "Pump" in m.type else "Electrical",
                    description=f"Excessive vibration harmonics and pressure variance on {m.name}.",
                    severity="Critical",
                    status="Open",
                    reported_by="Vibration Sensor System"
                ))
            elif m.status == "HIGH_RISK":
                fault_reports.append(FaultReport(
                    report_id=f"FR-{2000 + m.id}",
                    machine_id=m_str_id,
                    category="Mechanical" if "Lathe" in m.type or "Conveyor" in m.type else "Electrical",
                    description=f"Accelerated wear detected on {m.name}. Risk probability exceeds 50%.",
                    severity="High",
                    status="Open",
                    reported_by="AI Predictive Engine"
                ))
            elif m.status == "WARNING":
                fault_reports.append(FaultReport(
                    report_id=f"FR-{2000 + m.id}",
                    machine_id=m_str_id,
                    category="Operational",
                    description=f"Sensor drift and minor parameter deviation observed on {m.name}.",
                    severity="Warning",
                    status="Maintenance Scheduled",
                    reported_by="Diagnostic Routine"
                ))
                
        db.add_all(work_orders)
        db.add_all(fault_reports)

        print("Seeding platform users...")
        from app.models.user import User, RoleEnum
        from app.core.security import get_password_hash
        user_definitions = [
            ("admin@smartequip.ai", "Alex Rivera", RoleEnum.ADMIN, "admin123"),
            ("sarah.chen@smartequip.ai", "Sarah Chen", RoleEnum.ENGINEER, "password123"),
            ("marcus.vance@smartequip.ai", "Marcus Vance", RoleEnum.OPERATOR, "password123"),
            ("elena.rostova@smartequip.ai", "Elena Rostova", RoleEnum.ENGINEER, "password123"),
            ("david.kim@smartequip.ai", "David Kim", RoleEnum.OPERATOR, "password123"),
        ]
        users = [
            User(
                email=email,
                full_name=full_name,
                role=role,
                hashed_password=get_password_hash(pwd),
                is_active=True
            ) for email, full_name, role, pwd in user_definitions
        ]
        db.add_all(users)
        await db.commit()

        print("Database successfully seeded with 15 machines, users, and full telemetry.")

if __name__ == "__main__":
    asyncio.run(seed())
