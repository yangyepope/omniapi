import uuid
import time
from sqlmodel import Session, select
from sqlalchemy import func
from app.core.db import engine
from app.models import SystemModule, RawFlow, ApiEndpoint, FilteredFlow
from app.worker import process_raw_flow_task

def test_dedup_flow():
    # 使用真实的 audit 前缀模拟
    test_service = "audit"
    print(f"[*] Testing standard service logic: {test_service}")

    from datetime import datetime, timezone
    # 模拟两笔完全一样的请求（URL 带有查询参数，模拟图中场景）
    # 注意：我们这里不显式传入 service_name，模拟 Capture API 直接打入数据库的场景
    common_payload = {
        "method": "GET",
        "interface_path": "/audit/dashboard/overview?days=7",
        "headers": {"User-Agent": "Mozilla/5.0", "X-Timestamp": str(time.time())},
        "body": b"",
        "captured_at": datetime.now(timezone.utc),
        "service_name": "audit" # 在 RawFlow 层面需要注入，但我们会验证 Worker 是否能根据 Path 匹配到正确的 SystemModule
    }

    # 1. 注入第一笔流量
    raw1 = RawFlow(**common_payload)
    with Session(engine) as session:
        session.add(raw1)
        session.commit()
        session.refresh(raw1)
    
    print(f"[1] Processing flow 1: {raw1.id} (Path: {raw1.interface_path})")
    res1 = process_raw_flow_task(str(raw1.id))
    print(f"[1] Result: {res1}")

    # 2. 注入第二笔流量（此时 Timestamp 会变，由于我们已排除 Header，指纹应一致）
    common_payload["captured_at"] = datetime.now(timezone.utc)
    common_payload["headers"]["X-Timestamp"] = str(time.time())
    raw2 = RawFlow(**common_payload)
    with Session(engine) as session:
        session.add(raw2)
        session.commit()
        session.refresh(raw2)
    
    print(f"[2] Processing flow 2: {raw2.id} (Path: {raw2.interface_path})")
    res2 = process_raw_flow_task(str(raw2.id))
    print(f"[2] Result: {res2}")

    # 3. 对账审计
    with Session(engine) as session:
        # 获取审计模块
        mod = session.exec(select(SystemModule).where(SystemModule.name == "audit")).first()
        # 获取该模块的所有接口
        endpoints = session.exec(select(ApiEndpoint).where(ApiEndpoint.module_id == mod.id)).all()
        
        print(f"\n[FINAL AUDIT] Module: {mod.name}")
        print(f"    Total Traffic : {mod.total_traffic_count}")
        print(f"    Unique Traffic: {mod.unique_traffic_count}")
        
        # 寻找我们刚才发的那个规范化后的接口
        target_ep = next((e for e in endpoints if e.path == "/audit/dashboard/overview"), None)
        if target_ep:
             ff_count = session.exec(select(func.count(FilteredFlow.id)).where(FilteredFlow.endpoint_id == target_ep.id)).one()
             print(f"    Endpoint matched: {target_ep.method} {target_ep.path}")
             print(f"    Filtered (Unique) Records in DB: {ff_count}")

if __name__ == "__main__":
    test_dedup_flow()
