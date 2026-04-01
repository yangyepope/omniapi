import uuid
from datetime import datetime, timezone
from sqlmodel import Session, select
from app.core.db import engine
from app.models import RawFlow, SystemModule
from app.worker import process_raw_flow_task

def verify_stats():
    service_name = f"verify-service-{uuid.uuid4().hex[:6]}"
    print(f"[*] Starting verification for service: {service_name}")
    
    # 阶段 1：发送第一条流量
    with Session(engine) as session:
        raw_id = uuid.uuid4()
        flow = RawFlow(
            id=raw_id,
            service_name=service_name,
            method="GET",
            interface_path=f"/api/verify/{service_name}",
            headers={},
            captured_at=datetime.now(timezone.utc)
        )
        session.add(flow)
        session.commit()
        
    print(f"[1] Processing first (unique) flow...")
    result = process_raw_flow_task.run(raw_flow_id=str(raw_id))
    print(f"    - Task Result: {result}")
    
    # 阶段 2：校验第一条流量结果
    with Session(engine) as session:
        mod = session.exec(select(SystemModule).where(SystemModule.name == service_name)).first()
        if mod is None:
            all_mods = session.exec(select(SystemModule)).all()
            print(f"    [!] Error: SystemModule '{service_name}' not found!")
            print(f"    [!] Current modules in DB: {[m.name for m in all_mods]}")
            
        assert mod is not None, f"SystemModule '{service_name}' should be created"
        print(f"    - Stats after unique flow: Total={mod.total_traffic_count}, Unique={mod.unique_traffic_count}")
        assert mod.total_traffic_count == 1
        assert mod.unique_traffic_count == 1

    # 阶段 3：发送第二条流量 (Duplicate)
    with Session(engine) as session:
        raw_id_2 = uuid.uuid4()
        flow_2 = RawFlow(
            id=raw_id_2,
            service_name=service_name,
            method="GET",
            interface_path="/api/verify/test",
            headers={},
            captured_at=datetime.now(timezone.utc)
        )
        session.add(flow_2)
        session.commit()
        
    print(f"[2] Processing second (duplicate) flow...")
    result_2 = process_raw_flow_task.run(raw_flow_id=str(raw_id_2))
    print(f"    - Task Result: {result_2}")
    
    # 阶段 4：校验累计结果
    with Session(engine) as session:
        mod = session.exec(select(SystemModule).where(SystemModule.name == service_name)).first()
        print(f"    - Stats after duplicate flow: Total={mod.total_traffic_count}, Unique={mod.unique_traffic_count}")
        assert mod.total_traffic_count == 2
        assert mod.unique_traffic_count == 1
        
    print("[+] Verification SUCCESS: Traffic stats are functioning perfectly!")

if __name__ == "__main__":
    verify_stats()
