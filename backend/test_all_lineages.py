import asyncio
from app.core.database import AsyncSessionLocal
from app.models.machine import Machine
from app.api.endpoints.lineage import get_lineage_by_machine
from app.api.endpoints.telemetry import run_ai_health_check
from app.api.endpoints.simulation import run_what_if_simulation, WhatIfRequest
from sqlalchemy.future import select

async def run_comprehensive_tests():
    async with AsyncSessionLocal() as db:
        m_res = await db.execute(select(Machine).order_by(Machine.id))
        all_machines = m_res.scalars().all()
        print(f"Total Machines in DB: {len(all_machines)}")

        results = {}
        passed = 0
        failed = 0

        print("\n" + "="*80)
        print("COMPREHENSIVE MACHINE TEST: M-1 THROUGH M-16 (LINEAGE ENDPOINT)")
        print("="*80)

        for m in all_machines:
            code = f"M-{m.id}"
            try:
                data = await get_lineage_by_machine(code, result_type="health_check", db=db)
                if not data or len(data) == 0:
                    print(f"FAIL: {code} -> Empty data returned")
                    failed += 1
                    continue
                
                rec = data[0]
                results[code] = rec
                passed += 1
                print(f"PASS: {code} | Name: {rec.machine_name} | Type: {rec.machine_type} | Model: {rec.model_version} ({rec.framework})")
                print(f"      Sensors ({len(rec.sensor_names or [])}): {rec.sensor_names}")
                print(f"      Features ({len(rec.feature_names or [])}): {rec.feature_names}")
                print(f"      History Count: {rec.historical_evidence.get('similar_events_count') if rec.historical_evidence else 0}")
                print(f"      Risk: {rec.output_summary.get('failure_risk')}% | Confidence: {rec.confidence}%")
                print("-" * 80)
            except Exception as e:
                print(f"FAIL: {code} -> Exception: {e}")
                failed += 1

        print(f"\nMachine Lineage Coverage: {passed}/{len(all_machines)} PASS ({failed} FAIL)")

        # Verify cross-machine differentiation specifically for M-1, M-3, M-6, M-10, M-15
        key_machines = ["M-1", "M-3", "M-6", "M-10", "M-15"]
        print("\n" + "="*80)
        print("DEEP DIVERSIFICATION VERIFICATION: M-1, M-3, M-6, M-10, M-15")
        print("="*80)

        for km in key_machines:
            if km in results:
                r = results[km]
                print(f"[{km}]")
                print(f"  Machine Type: {r.machine_type}")
                print(f"  Sensors: {', '.join(r.sensor_names or [])}")
                print(f"  Features: {', '.join(r.feature_names or [])}")
                step_str = (r.preprocessing_steps or ['N/A'])[0].replace('\u2192', '->')
                print(f"  Preprocessing: {step_str}")
                hist = r.historical_evidence or {}
                print(f"  Historical Events: {hist.get('similar_events_count')}")
                top_events = hist.get('events', [])
                if top_events:
                    for ev in top_events:
                        print(f"    - {ev.get('name')} ({ev.get('date')})")
                else:
                    print("    - (No machine-specific historical events recorded)")
                print()

        # Check uniqueness
        types_set = set(results[km].machine_type for km in key_machines if km in results)
        sensors_set = set(tuple(results[km].sensor_names or []) for km in key_machines if km in results)
        features_set = set(tuple(results[km].feature_names or []) for km in key_machines if km in results)
        history_set = set(results[km].historical_evidence.get('similar_events_count') for km in key_machines if km in results)

        print("Distinct Machine Types among key machines:", len(types_set), "out of 5")
        print("Distinct Sensor Stream Sets among key machines:", len(sensors_set), "out of 5")
        print("Distinct Feature Sets among key machines:", len(features_set), "out of 5")
        print("Distinct History Counts among key machines:", len(history_set))

        # Test What-If Simulation lineage capture
        print("\n" + "="*80)
        print("TESTING SIMULATION LINEAGE INTEGRATION")
        print("="*80)
        sim_req = WhatIfRequest(
            machine_id="M-1",
            operating_duration_days=14.0,
            machine_load_modifier=1.25,
            action="increase_throughput"
        )
        sim_res = await run_what_if_simulation(sim_req, db=db)
        print(f"Simulation Executed: Health Score={sim_res.simulated_health_score}, Risk={sim_res.simulated_failure_risk}%")
        
        sim_lins = await get_lineage_by_machine("M-1", result_type="what_if_simulation", db=db)
        if sim_lins and len(sim_lins) > 0:
            sim_lin = sim_lins[0]
            print(f"PASS: Simulation Lineage captured successfully:")
            print(f"  Result Type: {sim_lin.result_type}")
            print(f"  Machine Type: {sim_lin.machine_type}")
            print(f"  Preprocessing Steps: {sim_lin.preprocessing_steps}")
            print(f"  Output Summary: {sim_lin.output_summary}")
        else:
            print("FAIL: Simulation lineage not retrieved correctly.")

        # Test Health Check live lineage generation
        print("\n" + "="*80)
        print("TESTING LIVE HEALTH CHECK LINEAGE TRIGGER (POST /api/v1/telemetry/ai-health-check/3)")
        print("="*80)
        pred_res = await run_ai_health_check(machine_id=3, db=db)
        print(f"Health Check Executed for M-3: Health Score={pred_res.health_score}, Failure Risk={pred_res.failure_risk}%")
        
        hc_lins = await get_lineage_by_machine("M-3", result_type="health_check", db=db)
        if hc_lins and len(hc_lins) > 0:
            latest_m3 = hc_lins[0]
            print(f"PASS: Live Health Check Lineage updated for M-3:")
            print(f"  Model Run ID: {latest_m3.model_run_id}")
            print(f"  Machine Type: {latest_m3.machine_type}")
            print(f"  Sensors: {latest_m3.sensor_names}")
            print(f"  Output Risk: {latest_m3.output_summary.get('failure_risk')}%")
            print(f"  History Count: {latest_m3.historical_evidence.get('similar_events_count') if latest_m3.historical_evidence else 0}")
        else:
            print("FAIL: Health Check lineage not retrieved.")

if __name__ == "__main__":
    asyncio.run(run_comprehensive_tests())
