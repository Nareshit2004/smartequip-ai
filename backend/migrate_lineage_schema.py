import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def migrate_columns():
    async with AsyncSessionLocal() as db:
        cols_res = await db.execute(text("PRAGMA table_info(ai_data_lineage);"))
        existing_cols = [c[1] for c in cols_res.fetchall()]
        print("Existing columns:", existing_cols)

        new_columns = [
            ("sensor_names", "JSON"),
            ("machine_type", "TEXT"),
            ("machine_name", "TEXT"),
            ("framework", "TEXT DEFAULT 'PyTorch'"),
            ("historical_evidence", "JSON"),
        ]

        for col_name, col_type in new_columns:
            if col_name not in existing_cols:
                try:
                    await db.execute(text(f"ALTER TABLE ai_data_lineage ADD COLUMN {col_name} {col_type};"))
                    print(f"Added column: {col_name} ({col_type})")
                except Exception as e:
                    print(f"Error adding {col_name}: {e}")

        await db.commit()
        cols_res = await db.execute(text("PRAGMA table_info(ai_data_lineage);"))
        print("Updated columns:", [c[1] for c in cols_res.fetchall()])

if __name__ == "__main__":
    asyncio.run(migrate_columns())
