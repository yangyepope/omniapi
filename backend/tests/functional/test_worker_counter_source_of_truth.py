"""
文件职责：验证流量处理 Worker 的一手计数逻辑，确保统计在写入时即正确，不依赖查询侧纠偏。
放置原因：该场景属于后端核心业务一致性验证，按规范放在 tests/functional 目录。
接入方式：通过 `pytest tests/functional/test_worker_counter_source_of_truth.py` 运行。
"""

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, func, select

from app.core.db import engine
from app.models import ApiEndpoint, FilteredFlow, RawFlow
from app.worker import process_raw_flow_task


# [设计意图]：验证“仅首命中一次”场景也能把统计写为 1，而不是 0。
# [参数说明]：无（测试内部自行构造一笔 RawFlow 并触发 Worker 处理）。
# [注意]：该测试专门防止“未 flush 导致首次重算读不到数据”的回归问题。
def test_worker_should_set_count_to_one_on_first_unique_hit() -> None:
    random_suffix = uuid.uuid4().hex[:8]
    interface_path = f"/resource/mcp/page/{random_suffix}?page=1"
    service_name = "resource"
    method = "POST"

    with Session(engine) as session:
        raw = RawFlow(
            service_name=service_name,
            captured_at=datetime.now(timezone.utc),
            method=method,
            interface_path=interface_path,
            headers={"X-Test": "first-hit"},
            body=b"",
            body_size=0,
            client_ip="127.0.0.1",
        )
        session.add(raw)
        session.commit()
        session.refresh(raw)

    process_raw_flow_task(str(raw.id))

    normalized_path = interface_path.split("?")[0]
    with Session(engine) as session:
        endpoint = session.exec(
            select(ApiEndpoint).where(
                ApiEndpoint.method == method,
                ApiEndpoint.path == normalized_path,
                ApiEndpoint.service_name == service_name,
            )
        ).first()

        assert endpoint is not None
        assert endpoint.total_traffic_count == 1
        assert endpoint.variants_count == 1

        ff_count = session.exec(
            select(func.count(FilteredFlow.id)).where(FilteredFlow.endpoint_id == endpoint.id)
        ).one()
        assert int(ff_count or 0) == 1


# [设计意图]：验证同一路径首命中+重复命中后，Endpoint 统计由 Worker 直接写正确。
# [参数说明]：无（测试内部自行构造 RawFlow 并调用 process_raw_flow_task）。
# [注意]：使用随机路径避免触发唯一约束冲突，断言结果不依赖历史脏数据。
def test_worker_should_keep_endpoint_counters_correct_at_write_time() -> None:
    random_suffix = uuid.uuid4().hex[:8]
    interface_path = f"/config/api/v1/openapi/api/page/{random_suffix}?page=1"
    service_name = "config"
    method = "POST"

    with Session(engine) as session:
        raw1 = RawFlow(
            service_name=service_name,
            captured_at=datetime.now(timezone.utc),
            method=method,
            interface_path=interface_path,
            headers={"X-Test": "first"},
            body=b"",
            body_size=0,
            client_ip="127.0.0.1",
        )
        session.add(raw1)
        session.commit()
        session.refresh(raw1)

    process_raw_flow_task(str(raw1.id))

    with Session(engine) as session:
        raw2 = RawFlow(
            service_name=service_name,
            captured_at=datetime.now(timezone.utc),
            method=method,
            interface_path=interface_path,
            headers={"X-Test": "second"},
            body=b"",
            body_size=0,
            client_ip="127.0.0.1",
        )
        session.add(raw2)
        session.commit()
        session.refresh(raw2)

    process_raw_flow_task(str(raw2.id))

    normalized_path = interface_path.split("?")[0]
    with Session(engine) as session:
        endpoint = session.exec(
            select(ApiEndpoint).where(
                ApiEndpoint.method == method,
                ApiEndpoint.path == normalized_path,
                ApiEndpoint.service_name == service_name,
            )
        ).first()

        assert endpoint is not None
        assert endpoint.total_traffic_count == 2
        assert endpoint.variants_count == 1

        ff_count = session.exec(
            select(func.count(FilteredFlow.id)).where(FilteredFlow.endpoint_id == endpoint.id)
        ).one()
        assert int(ff_count or 0) == 1
