from sqlmodel import Session, select, func
from app.core.db import engine
from app.models import ApiEndpoint, RawFlow, FilteredFlow
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def backfill_stats():
    with Session(engine) as session:
        endpoints = session.exec(select(ApiEndpoint)).all()
        logger.info(f"Starting backfill for {len(endpoints)} endpoints...")
        
        for ep in endpoints:
            # 1. 直接从 FilteredFlow 进行持久化聚合 (防止 RawFlow 过期导致数据归零)
            stats_stmt = select(
                func.sum(FilteredFlow.variant_count).label("total"),
                func.count(FilteredFlow.id).label("variants"),
                func.max(FilteredFlow.captured_at).label("last_active")
            ).where(
                FilteredFlow.endpoint_id == ep.id
            )
            stats = session.exec(stats_stmt).first()
            
            # 更新字段
            ep.total_traffic_count = int(stats[0] or 0)
            ep.variants_count = int(stats[1] or 0)
            ep.last_active_at = stats[2]
            
            # 如果聚合结果为空 (可能还没开始采集流量)，则保持 0
            session.add(ep)
            logger.info(f"Updated endpoint {ep.method} {ep.path}: Total={ep.total_traffic_count}, Variants={ep.variants_count}, Last={ep.last_active_at}")
            
            session.add(ep)
            logger.info(f"Updated endpoint {ep.method} {ep.path}: Total={ep.total_traffic_count}, Variants={ep.variants_count}")
        
        session.commit()
        logger.info("Backfill completed successfully.")

if __name__ == "__main__":
    backfill_stats()
