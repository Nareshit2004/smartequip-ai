import asyncio
import random
from app.core.database import AsyncSessionLocal
from app.models.machine import Machine
from app.models.sensor import SensorData
from sqlalchemy.future import select

async def seed_sensors():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Machine))
        machines = result.scalars().all()
        
        for machine in machines:
            print(f"Seeding sensors for {machine.name} (ID: {machine.id})...")
            # Generate 15 sensor readings for each machine
            for _ in range(15):
                temp = random.uniform(60, 90)
                vib = random.uniform(0.5, 2.5)
                press = random.uniform(100, 150)
                rpm = random.uniform(1400, 1600)
                curr = random.uniform(10, 20)
                volt = random.uniform(220, 240)
                
                # If machine is Warning/Critical, make some readings worse
                if machine.status == 'Warning':
                    temp += 15
                    vib += 1.5
                elif machine.status == 'Critical':
                    temp += 30
                    vib += 3.0
                    press -= 30
                    rpm -= 200
                
                sensor = SensorData(
                    machine_id=machine.id,
                    temperature=temp,
                    vibration=vib,
                    pressure=press,
                    rpm=rpm,
                    current=curr,
                    voltage=volt
                )
                db.add(sensor)
        
        await db.commit()
        print("Successfully seeded sensor data!")

if __name__ == "__main__":
    asyncio.run(seed_sensors())
