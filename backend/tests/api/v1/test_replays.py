import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import ApiEndpoint, FilteredFlow, Variant

def test_execute_variant_replay_failed(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # 1. 准备测试数据：Endpoint -> FilteredFlow -> Variant
    # 创建一个模拟资产
    endpoint = ApiEndpoint(
        path="/api/v1/test-replay",
        method="GET",
        service_name="test-service",
        description="Test Replay Endpoint"
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)

    # 创建一个关联的流量记录
    flow = FilteredFlow(
        endpoint_id=endpoint.id,
        method="GET",
        path="/api/v1/test-replay",
        headers={"User-Agent": "Pytest"},
        dedup_key=str(uuid.uuid4())
    )
    db.add(flow)
    db.commit()
    db.refresh(flow)

    # 创建一个攻击变体
    variant = Variant(
        name="SQLi Test Variant",
        root_flow_id=flow.id,
        method="GET",
        url="http://localhost:8000/api/v1/test-replay?id=1' OR 1=1",
        headers={"User-Agent": "OmniAPI-Replayer"},
        body_str=None
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)

    # 2. 执行请求 (预期目前会 404，因为接口没写)
    response = client.post(
        f"{settings.API_V1_STR}/replays/{variant.id}",
        headers=superuser_token_headers,
    )
    
    # TDD RED STAGE: 接口还未实现，预期报错或 404
    assert response.status_code == 200
    
    # 验证数据库字段是否更新
    db.refresh(variant)
    assert variant.replay_count == 1
    assert variant.last_response_code is not None
    assert variant.last_latency_ms is not None
