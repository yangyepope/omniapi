import uuid
import time
import json
from sqlmodel import Session, select
from sqlalchemy import func
from app.core.db import engine
from app.models import SystemModule, RawFlow, ApiEndpoint, FilteredFlow
from app.worker import process_raw_flow_task
from datetime import datetime, timezone

def test_mdm_dedup():
    print("[*] Testing MDM real data deduplication...")
    
    # 模拟您提供的两条真实数据 (除了 UUID 和 Header/IP, 其余逻辑属性一致)
    # Body: {"page":1,"size":12,"searchKey":""}
    common_body = b'{"page":1,"size":12,"searchKey":""}'
    interface_path = "/mdm/job/list"
    
    # 流量 1: IP 为 10.10.2.115
    raw1_payload = {
        "method": "POST",
        "interface_path": interface_path,
        "headers": {"X-Request-ID": "287040757-56", "User-Agent": "Mozilla/5.0"},
        "body": common_body,
        "client_ip": "10.10.2.115",
        "captured_at": datetime.now(timezone.utc),
        "service_name": "mdm"
    }
    
    # 流量 2: IP 变化，关键 Header 变化
    raw2_payload = {
        "method": "POST",
        "interface_path": interface_path,
        "headers": {"X-Request-ID": "999999999-99", "User-Agent": "Different"},
        "body": common_body, 
        "client_ip": "192.168.1.1", # IP 变了
        "captured_at": datetime.now(timezone.utc),
        "service_name": "mdm"
    }

    # 1. 处理第一笔
    raw1 = RawFlow(**raw1_payload)
    with Session(engine) as session:
        session.add(raw1)
        session.commit()
        session.refresh(raw1)
    
    print(f"[1] Processing MDM Flow 1: {raw1.id}")
    res1 = process_raw_flow_task(str(raw1.id))
    
    # 获取产生的 Key
    with Session(engine) as session:
        # 重新获取对象，避免会话脱离
        raw1 = session.get(RawFlow, raw1.id)
        key1 = raw1.dedup_key
    print(f"[1] Key: {key1} | Result: {res1}")

    # 2. 处理第二笔
    raw2 = RawFlow(**raw2_payload)
    with Session(engine) as session:
        session.add(raw2)
        session.commit()
        session.refresh(raw2)
    
    print(f"[2] Processing MDM Flow 2: {raw2.id}")
    res2 = process_raw_flow_task(str(raw2.id))
    
    # 获取产生的 Key
    with Session(engine) as session:
        # 重新获取对象，避免会话脱离
        raw2 = session.get(RawFlow, raw2.id)
        key2 = raw2.dedup_key
    print(f"[2] Key: {key2} | Result: {res2}")

    # 3. 结果判定
    if key1 == key2:
        print("\n[+] SUCCESS: MDM Deduplication is working (IP and Header ignored)!")
    else:
        print("\n[-] FAILURE: Keys are still different!")
        print(f"    Key 1: {key1}")
        print(f"    Key 2: {key2}")

if __name__ == "__main__":
    test_mdm_dedup()
