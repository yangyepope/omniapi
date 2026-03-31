import json
import uuid
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.models import SystemModule, ServiceStatus, GlobalConfig
from app.worker import process_mirror_traffic_task

def test_create_system_module(client: TestClient, superuser_token_headers: dict) -> None:
    """
    测试手动创建服务模块
    """
    name = f"test-service-{uuid.uuid4().hex[:8]}"
    data = {
        "name": name,
        "service_prefix": f"/{name}",
        "description": "Manual creation test",
        "owner": "Tester"
    }
    response = client.post(
        "/api/v1/system-modules/",
        json=data,
        headers=superuser_token_headers
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == name
    assert content["owner"] == "Tester"
    assert content["status"] == ServiceStatus.active

def test_update_system_module_status(client: TestClient, superuser_token_headers: dict, db: Session) -> None:
    """
    测试服务状态流转 (Active -> Deprecated)
    """
    # 准备数据
    mod = SystemModule(name="status-test", owner="Dev", status=ServiceStatus.active)
    db.add(mod)
    db.commit()
    db.refresh(mod)
    
    # 执行更新
    response = client.patch(
        f"/api/v1/system-modules/{mod.id}",
        json={"status": "deprecated", "owner": "New Owner"},
        headers=superuser_token_headers
    )
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == ServiceStatus.deprecated
    assert content["owner"] == "New Owner"
    assert content["deprecated_at"] is not None

def test_get_system_modules_stats(client: TestClient, superuser_token_headers: dict) -> None:
    """
    测试统计获取接口
    """
    response = client.get(
        "/api/v1/system-modules/",
        headers=superuser_token_headers
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert isinstance(content["data"], list)

def test_service_discovery_via_config(db: Session) -> None:
    """
    测试 Worker 层的服务发现逻辑 (配置匹配优先)
    """
    # 1. 设置全局路由映射 (使用随机唯一的服务名以避免碰撞)
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    service_name = f"test-service-{unique_id}"
    pattern = rf"^/test-{unique_id}/.*"
    
    key = "upstream_service_route_mapping"
    mapping = [{"pattern": pattern, "service": service_name, "owner": "QA Team"}]
    
    config = db.exec(select(GlobalConfig).where(GlobalConfig.key == key)).first()
    if not config:
        config = GlobalConfig(key=key, value=json.dumps(mapping))
    else:
        config.value = json.dumps(mapping)
    db.add(config)
    db.flush()
    
    # 2. 模拟流量触发发现
    import app.worker
    original_session = app.worker.Session
    class MockSession:
        def __init__(self, *args, **kwargs): pass
        def __enter__(self): return db
        def __exit__(self, *args): pass
        
    try:
        app.worker.Session = MockSession
        process_mirror_traffic_task.run(
            method="GET",
            uri=f"/test-{unique_id}/api/test",
            headers={},
            body_str="",
            source_ip="127.0.0.1"
        )
    finally:
        app.worker.Session = original_session
    
    # 3. 校验数据库中的发现结果
    mod = db.exec(select(SystemModule).where(SystemModule.name == service_name)).first()
    assert mod is not None, f"Discovery failed for {service_name}. Check mapping config."
    assert mod.owner == "QA Team"
