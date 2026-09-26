import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.maintenance import FaultReport, WorkOrder
from app.models.machine import Machine

async def inspect_maintenance():
    async with AsyncSessionLocal() as db:
        machines = (await db.execute(select(Machine))).scalars().all()
        for m in machines:
            m_id_str = f"M-{m.id}"
            faults = (await db.execute(select(FaultReport).filter(FaultReport.machine_id == m_id_str))).scalars().all()
            wos = (await db.execute(select(WorkOrder).filter(WorkOrder.machine_id == m_id_str))).scalars().all()
            print(f"Machine {m_id_str} ({m.name}, type={m.type}): {len(faults)} faults, {len(wos)} work orders")
            for f in faults:
                print(f"   Fault {f.report_id}: {f.category} [{f.severity}] - {f.description[:60]}")
            for w in wos:
                print(f"   WO {w.order_id}: [{w.priority}] {w.reason[:60]}")

if __name__ == "__main__":
    asyncio.run(inspect_maintenance())
