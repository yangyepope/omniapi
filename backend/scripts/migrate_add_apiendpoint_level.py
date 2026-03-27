import contextlib
import sys

from sqlalchemy import text
from sqlmodel import create_engine

# Reuse project settings
sys.path.append("/root/omniapi/backend")
from app.core.config import settings  # noqa: E402


def run():
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    with engine.connect() as conn:
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")

        # 1) create enum type if not exists
        create_type_sql = """
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'endpointlevel') THEN
        CREATE TYPE endpointlevel AS ENUM ('p0','p1','p2','p3');
    END IF;
END
$$;
"""
        conn.execute(text(create_type_sql))

        # 2) add column if not exists, default 'p3'
        add_column_sql = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='apiendpoint' AND column_name='level'
    ) THEN
        ALTER TABLE apiendpoint
        ADD COLUMN level endpointlevel NOT NULL DEFAULT 'p3';
    END IF;
END
$$;
"""
        conn.execute(text(add_column_sql))

        # 3) backfill nulls (in case of earlier partial attempts)
        with contextlib.suppress(Exception):
            conn.execute(text("UPDATE apiendpoint SET level = 'p3' WHERE level IS NULL;"))

    print("Migration completed: apiendpoint.level (endpointlevel enum, default 'p3')")


if __name__ == "__main__":
    run()

