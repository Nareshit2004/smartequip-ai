import asyncio
import sys

sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import AsyncSessionLocal
from app.models.machine import Machine
from app.api.endpoints.intelligence import (
    get_cost_optimization,
    get_energy_intelligence,
    get_sensor_health
)
from app.api.endpoints.telemetry import run_ai_health_check
from sqlalchemy.future import select

async def run_forensic_tests():
    async with AsyncSessionLocal() as db:
        print("=" * 80)
        print("PHASE 1-36 FORENSIC TEST: COST, ENERGY, & SENSOR RELIABILITY")
        print("=" * 80)

        test_machines = ["M-3", "M-6", "M-10", "M-1"]

        for m_code in test_machines:
            print(f"\n" + "-" * 40)
            print(f">>> TESTING MACHINE: {m_code}")
            print("-" * 40)

            # 1. Cost Optimization
            cost_data = await get_cost_optimization(m_code, db=db)
            print(f"[COST & ENERGY OPTIMIZATION] ({m_code}):")
            print(f"  Machine Name: {cost_data.get('machine_name')}")
            print(f"  Preventive Maintenance Cost: ${cost_data.get('maintenance_cost'):,}")
            print(f"  Run-to-Failure Impact Estimate: ${cost_data.get('run_to_failure_cost'):,}")
            print(f"  Est. AI Savings: ${cost_data.get('savings'):,}")
            print(f"  Energy Inefficiency Cost: {('$' + str(cost_data.get('energy_inefficiency_cost')) + '/mo') if cost_data.get('energy_inefficiency_cost') is not None else 'N/A'}")
            print(f"  Primary Cost Driver: {cost_data.get('cost_driver')}")
            print(f"  Prescriptive Action: {cost_data.get('prescriptive_action')}")

            # 2. Energy Intelligence
            energy_data = await get_energy_intelligence(m_code, db=db)
            print(f"\n[ENERGY INTELLIGENCE] ({m_code}):")
            print(f"  Status: {energy_data.get('status')}")
            print(f"  Has Data: {energy_data.get('has_data')}")
            if energy_data.get('has_data'):
                print(f"  Voltage: {energy_data.get('voltage')} V")
                print(f"  Current: {energy_data.get('current')} A")
                print(f"  Power Draw: {energy_data.get('power_kw')} kW")
                print(f"  Monthly Energy Usage: {energy_data.get('monthly_kwh'):,} kWh")
                print(f"  Monthly Cost: ${energy_data.get('monthly_cost'):,}/mo (@ ${energy_data.get('tariff_rate')}/kWh)")
                print(f"  Efficiency Rating: {energy_data.get('efficiency')}%")
                print(f"  Trend: {energy_data.get('trend')}")
            else:
                print(f"  Message: {energy_data.get('message')}")

            # 3. Sensor Reliability
            sensor_data = await get_sensor_health(m_code, db=db)
            print(f"\n[SENSOR RELIABILITY] ({m_code}):")
            print(f"  Overall Score: {sensor_data.get('reliability_score')}/100")
            print(f"  Missing Data: {sensor_data.get('missing_data_pct')}%")
            print(f"  Noise Level: {sensor_data.get('noise_level')}")
            print(f"  Active Channels Monitored: {sensor_data.get('active_sensors_count')}")
            issues = sensor_data.get('issues', [])
            if issues:
                print(f"  Detected Anomalies ({len(issues)}):")
                for iss in issues:
                    print(f"    * {iss}")
            else:
                print(f"  All sensors reporting normally")

        # Test AI Health Check integration
        print("\n" + "=" * 80)
        print("TESTING AI HEALTH CHECK DYNAMIC STATE PROPAGATION ON M-3")
        print("=" * 80)
        print("Running AI Health Check on M-3...")
        hc = await run_ai_health_check("M-3", db=db)
        print(f"Health Check complete: Failure Risk={hc.failure_risk}%, RUL={hc.rul_days}d, Health={hc.health_score}%")

        post_cost = await get_cost_optimization("M-3", db=db)
        print(f"Updated Cost Prescriptive Action: {post_cost.get('prescriptive_action')}")
        print(f"Updated Savings: ${post_cost.get('savings'):,}")
        print(f"Updated Cost Driver: {post_cost.get('cost_driver')}")

if __name__ == "__main__":
    asyncio.run(run_forensic_tests())
