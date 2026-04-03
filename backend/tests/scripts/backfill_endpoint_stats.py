"""
文件职责：对历史 ApiEndpoint 统计字段做离线回填，修正 total/variants/last_active 漂移。
放置原因：属于一次性或按需执行的数据修复脚本，按仓库规范归档在 tests/scripts 目录。
接入方式：可直接 `uv run python tests/scripts/backfill_endpoint_stats.py` 执行。
"""

import logging
import uuid
from datetime import datetime
from typing import cast

from sqlmodel import Session, func, select

from app.core.db import engine
from app.models import ApiEndpoint, FilteredFlow

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# [设计意图]：统一“端点统计口径”，避免不同脚本各自实现导致 total_traffic_count 反复漂移。
# [参数说明]：session 为当前数据库会话；endpoint_id 为目标端点主键。
# [注意]：total 不能直接等于 sum(variant_count)，必须包含“每条精选流量的首命中 +1”。
def calculate_endpoint_stats(
    session: Session,
    endpoint_id: uuid.UUID,
) -> tuple[int, int, datetime | None]:
    stats_stmt = select(
        func.count(FilteredFlow.id).label("unique_count"),
        func.sum(FilteredFlow.variant_count).label("duplicate_count"),
        func.max(FilteredFlow.captured_at).label("last_active"),
    ).where(FilteredFlow.endpoint_id == endpoint_id)
    stats = session.exec(stats_stmt).one()

    unique_count = int(cast(int | None, stats[0]) or 0)
    duplicate_count = int(cast(int | None, stats[1]) or 0)
    last_active = cast(datetime | None, stats[2])

    # 总流量 = 首次命中（唯一流量条数） + 重复命中（variant_count 汇总）
    total_traffic = unique_count + duplicate_count
    variants_count = unique_count
    return total_traffic, variants_count, last_active


# [设计意图]：批量修复全部 Endpoint 的统计冗余字段，确保列表页展示与真实流量一致。
# [参数说明]：无；函数内部自行创建 Session 并遍历全量 ApiEndpoint。
# [注意]：脚本属于离线修复，建议在低峰期执行；执行后会提交事务写入所有受影响端点。
def backfill_stats() -> None:
    with Session(engine) as session:
        endpoints = session.exec(select(ApiEndpoint)).all()
        logger.info(f"Starting backfill for {len(endpoints)} endpoints...")
        
        for ep in endpoints:
            total_traffic, variants_count, last_active = calculate_endpoint_stats(
                session=session,
                endpoint_id=ep.id,
            )
            ep.total_traffic_count = total_traffic
            ep.variants_count = variants_count
            ep.last_active_at = last_active
            
            # 如果聚合结果为空 (可能还没开始采集流量)，则保持 0
            session.add(ep)
            logger.info(
                "Updated endpoint %s %s: Total=%s, Variants=%s, Last=%s",
                ep.method,
                ep.path,
                ep.total_traffic_count,
                ep.variants_count,
                ep.last_active_at,
            )
        
        session.commit()
        logger.info("Backfill completed successfully.")

if __name__ == "__main__":
    backfill_stats()
