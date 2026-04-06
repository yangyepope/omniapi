import uuid
from sqlalchemy import create_url
from sqlmodel import Session, create_engine, select
from app.models import ReplayResult, Variant
from app.core.config import settings

def check_db():
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    with Session(engine) as session:
        # Check all replay results
        results = session.exec(select(ReplayResult).limit(10)).all()
        print(f"Found {len(results)} replay results total.")
        for r in results:
            print(f"ID: {r.id}, root_flow_id: {r.root_flow_id}, source_id: {r.source_id}, source_type: {r.source_type}, status: {r.status}")
        
        # Check variants
        variants = session.exec(select(Variant).limit(5)).all()
        print(f"\nFound {len(variants)} variants total.")
        for v in variants:
            print(f"Variant ID: {v.id}, root_flow_id: {v.root_flow_id}, name: {v.name}")

if __name__ == "__main__":
    check_db()
