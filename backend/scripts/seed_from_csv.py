import csv
import sys
import os
import uuid
from datetime import datetime

# Add the backend directory to sys.path to allow importing app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlmodel import Session, select
from app.core.db import engine
from app.models import ApiEndpoint, SystemModule
from app.services.discovery import normalize_uri
from app.worker import get_or_create_module_by_uri

def seed_from_csv(csv_path: str):
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        with Session(engine) as session:
            count = 0
            for row in reader:
                if not row or len(row) < 2:
                    continue
                method = row[0]
                raw_uri = row[1]
                
                norm_uri = normalize_uri(raw_uri)
                
                # Check if already exists
                statement = select(ApiEndpoint).where(
                    ApiEndpoint.method == method, 
                    ApiEndpoint.path == norm_uri
                )
                if session.exec(statement).first():
                    continue
                    
                mod, service_name = get_or_create_module_by_uri(session, norm_uri)
                
                endpoint = ApiEndpoint(
                    method=method,
                    path=norm_uri,
                    name=f"Mocked {method} {norm_uri}",
                    service_name=service_name,
                    module_id=mod.id
                )
                session.add(endpoint)
                count += 1
                
            session.commit()
            print(f"Successfully seeded {count} mock endpoints from CSV.")

if __name__ == "__main__":
    csv_file = "/app/apiendpoint.csv"
    seed_from_csv(csv_file)
