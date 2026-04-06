from sqlalchemy import text
from app.core.db import engine

def check():
    with engine.connect() as conn:
        user = conn.execute(text("SELECT current_user")).fetchone()[0]
        schema = conn.execute(text("SELECT current_schema()")).fetchone()[0]
        
        # 查出这个表到底挂在哪个 schema 下
        res = conn.execute(text("SELECT schemaname FROM pg_tables WHERE tablename = 'filtered_flows'")).fetchone()
        location = res[0] if res else "NOT_FOUND"
        
        print(f"--- DB TRUTH REPORT ---")
        print(f"USER: {user}")
        print(f"SCHEMA: {schema}")
        print(f"TABLE_LOCATION: {location}")
        print(f"-----------------------")

if __name__ == "__main__":
    check()
