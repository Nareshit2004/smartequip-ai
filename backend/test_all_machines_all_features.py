import asyncio
import os
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import AsyncSessionLocal
from app.models.machine import Machine
from app.api.endpoints.machines import read_machine
from app.api.endpoints.telemetry import (
    get_historical_telemetry,
    get_last_prediction,
    run_ai_health_check,
    simulate_telemetry
)
from app.api.endpoints.lineage import get_lineage_by_machine
from app.api.endpoints.simulation import run_what_if_simulation, WhatIfRequest
from app.api.endpoints.intelligence import get_cost_optimization, get_sensor_health
from app.api.endpoints.copilot import chat_with_copilot, ChatRequest

async def verify_everything():
    async with AsyncSessionLocal() as db:
        print("="*80)
        print("MASTER VERIFICATION: ALL MACHINES M-1 THROUGH M-16 ACROSS ALL FEATURES")
        print("="*80)

        total_machines = 16
        all_passed = True

        for i in range(1, total_machines + 1):
            m_code = f"M-{i}"
            print(f"\n>>> TESTING MACHINE: {m_code} (ID: {i})")

            # 1. Read Machine by numeric and M- prefix
            try:
                m_obj = await read_machine(str(i), db=db)
                m_obj_prefix = await read_machine(m_code, db=db)
                assert m_obj.id == i
                assert m_obj_prefix.id == i
                print(f"  [1/9] Machine Read: OK ({m_obj.name} | Type: {m_obj.type} | Health: {m_obj.health_score}%)")
            except Exception as e:
                print(f"  [1/9] Machine Read: FAILED ({e})")
                all_passed = False

            # 2. Telemetry History
            try:
                hist = await get_historical_telemetry(str(i), limit=10, db=db)
                assert len(hist) > 0
                print(f"  [2/9] Telemetry History: OK ({len(hist)} buffered records)")
            except Exception as e:
                print(f"  [2/9] Telemetry History: FAILED ({e})")
                all_passed = False

            # 3. Simulate Telemetry Reading
            try:
                reading = await simulate_telemetry(m_code, db=db)
                assert reading.temperature is not None
                print(f"  [3/9] Telemetry Simulator: OK (Temp: {reading.temperature:.1f}C, Vib: {reading.vibration:.2f}mm/s)")
            except Exception as e:
                print(f"  [3/9] Telemetry Simulator: FAILED ({e})")
                all_passed = False

            # 4. AI Health Check Inference
            try:
                pred = await run_ai_health_check(m_code, db=db)
                assert pred.failure_risk is not None
                print(f"  [4/9] AI Health Check: OK (Risk: {pred.failure_risk:.1f}%, RUL: {pred.rul_days:.1f}d, Conf: {pred.confidence:.1f}%)")
            except Exception as e:
                print(f"  [4/9] AI Health Check: FAILED ({e})")
                all_passed = False

            # 5. Last Prediction Read
            try:
                last_p = await get_last_prediction(str(i), db=db)
                assert last_p.failure_risk is not None
                print(f"  [5/9] Last Prediction Fetch: OK (Status: {last_p.failure_risk:.1f}%)")
            except Exception as e:
                print(f"  [5/9] Last Prediction Fetch: FAILED ({e})")
                all_passed = False

            # 6. Data Lineage (Live Health Check)
            try:
                lin_hc = await get_lineage_by_machine(m_code, result_type="health_check", db=db)
                assert len(lin_hc) > 0
                rec = lin_hc[0]
                assert rec.machine_type == m_obj.type
                assert len(rec.sensor_names) > 0
                assert len(rec.feature_names) > 0
                print(f"  [6/9] AI Data Lineage (Health Check): OK")
                print(f"        Sensors: {rec.sensor_names}")
                print(f"        Features: {rec.feature_names}")
                print(f"        History: {rec.historical_evidence.get('similar_events_count') if rec.historical_evidence else 0} events")
            except Exception as e:
                print(f"  [6/9] AI Data Lineage (Health Check): FAILED ({e})")
                all_passed = False

            # 7. What-If Simulation & Lineage
            try:
                sim_req = WhatIfRequest(
                    machine_id=m_code,
                    operating_duration_days=7.0,
                    machine_load_modifier=1.1,
                    action="project_load"
                )
                sim_res = await run_what_if_simulation(sim_req, db=db)
                lin_sim = await get_lineage_by_machine(m_code, result_type="what_if_simulation", db=db)
                assert len(lin_sim) > 0
                assert lin_sim[0].result_type == "what_if_simulation"
                print(f"  [7/9] What-If Simulation + Lineage: OK (Sim Risk: {sim_res.simulated_failure_risk:.1f}%, Run: {lin_sim[0].model_run_id})")
            except Exception as e:
                print(f"  [7/9] What-If Simulation + Lineage: FAILED ({e})")
                all_passed = False

            # 8. Intelligence (Cost & Sensor Health)
            try:
                cost = await get_cost_optimization(m_code, db=db)
                sensor_h = await get_sensor_health(m_code, db=db)
                assert "savings" in cost
                assert "reliability_score" in sensor_h
                print(f"  [8/9] Cost & Sensor Intelligence: OK (Savings: ${cost['savings']:,.0f}, Reliability: {sensor_h['reliability_score']}%)")
            except Exception as e:
                print(f"  [8/9] Cost & Sensor Intelligence: FAILED ({e})")
                all_passed = False

            # 9. Maintenance Copilot
            try:
                chat_res = await chat_with_copilot(ChatRequest(machine_id=m_code, message="Assess current machine condition"), db=db)
                assert len(chat_res.response) > 0
                print(f"  [9/9] Maintenance Copilot: OK (Confidence: {chat_res.confidence * 100:.0f}%, Sources: {len(chat_res.sources)})")
            except Exception as e:
                print(f"  [9/9] Maintenance Copilot: FAILED ({e})")
                all_passed = False

        print("\n" + "="*80)
        if all_passed:
            print("ALL 16 MACHINES (M-1 TO M-16) FULLY OPERATIONAL WITH ZERO ERRORS!")
        else:
            print("ONE OR MORE CHECKS ENCOUNTERED ISSUES.")
        print("="*80)

if __name__ == "__main__":
    asyncio.run(verify_everything())
