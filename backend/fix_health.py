import asyncio
import random
from app.core.database import AsyncSessionLocal
from app.models.machine import Machine
from sqlalchemy.future import select

async def fix_health():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Machine))
        machines = result.scalars().all()
        for machine in machines:
            if machine.status == 'Warning':
                machine.health_score = random.uniform(50.0, 79.9)
            elif machine.status == 'Critical':
                machine.health_score = random.uniform(10.0, 49.9)
            else:
                machine.health_score = random.uniform(85.0, 100.0)
            print(f"Updated {machine.name} to {machine.health_score:.1f}%")
        await db.commit()

if __name__ == "__main__":
    asyncio.run(fix_health())
