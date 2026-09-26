import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def list_tables():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
        tables = [r[0] for r in res.fetchall()]
        print('Tables:', tables)
        for t in tables:
            cols = await db.execute(text(f"PRAGMA table_info({t});"))
            col_names = [c[1] for c in cols.fetchall()]
            print(f'  Table {t}: {col_names}')

if __name__ == "__main__":
    asyncio.run(list_tables())
