import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.models.machine import Machine
from sqlalchemy.future import select

async def fix():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Machine))
        machines = res.scalars().all()
        for m in machines:
            if m.name == "CNC Lathe Alpha":
                m.health_score = 94
                m.status = "HEALTHY"
            elif m.name == "Milling Machine Beta":
                m.health_score = 68
                m.status = "WARNING"
            elif m.name == "Hydraulic Press Gamma":
                m.health_score = 35
                m.status = "CRITICAL"
        await db.commit()
        print("Fixed machines in DB.")

if __name__ == "__main__":
    asyncio.run(fix())
