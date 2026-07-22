# [SecurityPlatform Royal Standard] Elegant Worker Reference Implementation (V8.2)
from datetime import datetime, timezone
import uuid
import random
import time
from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import OperationalError
from app.core.db import engine
from app.models import SystemModule, ApiEndpoint, FilteredFlow

def process_traffic_atomic(service_name: str, method: str, path: str, raw_id: uuid.UUID, dedup_key: str):
    """
    [Standard]：展示 100,000 QPS 级别的原子化写入标准。
    1. 计算外置；2. 严格锁序；3. 表达层原子化；4. 退避重试。
    """
    
    for attempt in range(5):
        try:
            with engine.begin() as conn:
                # [Lock 1]：Parent Module (Order: 1)
                mod_stmt = insert(SystemModule).values(
                    id=uuid.uuid4(),
                    name=service_name,
                    service_prefix=f"/{service_name}",
                    owner="Auto",
                    status="active"
                ).on_conflict_do_update(
                    index_elements=[SystemModule.name],
                    set_={SystemModule.name: SystemModule.name}
                ).returning(SystemModule.id)
                mod_id = conn.execute(mod_stmt).fetchone()[0]

                # [Lock 2]：Child Endpoint (Order: 2)
                ep_stmt = insert(ApiEndpoint).values(
                    id=uuid.uuid4(),
                    method=method,
                    path=path,
                    name=f"Auto: {method} {path}",
                    service_name=service_name,
                    module_id=mod_id,
                    source_type="auto_discovered"
                ).on_conflict_do_update(
                    index_elements=[ApiEndpoint.method, ApiEndpoint.path, ApiEndpoint.service_name],
                    set_={ApiEndpoint.name: ApiEndpoint.name}
                ).returning(ApiEndpoint.id)
                ep_id = conn.execute(ep_stmt).fetchone()[0]

                # [Lock 3]：Leaf Flow (Order: 3)
                capt_at = datetime.now(timezone.utc)
                upsert_stmt = insert(FilteredFlow).values(
                    id=uuid.uuid4(), 
                    endpoint_id=ep_id, 
                    raw_flow_id=raw_id,
                    captured_at=capt_at,
                    method=method,
                    dedup_key=dedup_key,
                    occurrence_count=1
                ).on_conflict_do_update(
                    index_elements=[FilteredFlow.dedup_key],
                    set_={
                        FilteredFlow.occurrence_count: FilteredFlow.occurrence_count + 1,
                        FilteredFlow.captured_at: capt_at
                    }
                ).returning(FilteredFlow.id, (FilteredFlow.occurrence_count == 1).label("is_new"))

                res = conn.execute(upsert_stmt).fetchone()
                is_new = bool(res[1])
                u_inc = 1 if is_new else 0

                # [Lock 4]：Atomic Stats Sync
                conn.execute(
                    update(ApiEndpoint).where(ApiEndpoint.id == ep_id).values(
                        total_traffic_count=ApiEndpoint.total_traffic_count + 1,
                        unique_traffic_count=ApiEndpoint.unique_traffic_count + u_inc,
                        last_active_at=capt_at
                    )
                )
                conn.execute(
                    update(SystemModule).where(SystemModule.id == mod_id).values(
                        total_traffic_count=SystemModule.total_traffic_count + 1,
                        unique_traffic_count=SystemModule.unique_traffic_count + u_inc
                    )
                )
            return "Success"
        except OperationalError as exc:
            if "deadlock detected" in str(exc).lower():
                time.sleep(random.uniform(0.1, 0.5) * (2 ** attempt))
                continue
            raise
