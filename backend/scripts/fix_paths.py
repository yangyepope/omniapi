import sys
from pathlib import Path
from sqlmodel import Session, select
from collections import defaultdict

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.core.db import engine
from app.models import ApiEndpoint, TrafficRecord
from app.services.discovery import normalize_uri

def fix_paths():
    with Session(engine) as session:
        endpoints = session.exec(select(ApiEndpoint)).all()
        
        # 统计规范化后的情况
        normalized_map = defaultdict(list)
        for ep in endpoints:
            new_path = normalize_uri(ep.path)
            normalized_map[(ep.method, new_path, ep.module_id)].append(ep)
            
        for (method, new_path, module_id), eps in normalized_map.items():
            if len(eps) == 1:
                ep = eps[0]
                if ep.path != new_path:
                    print(f"Updating: {ep.path} -> {new_path}")
                    ep.path = new_path
                    session.add(ep)
            else:
                print(f"Merging into {new_path} ({method}): {len(eps)} endpoints")
                # 选第一个作为保留，其余的合并
                # 偏好: documented > auto_discovered > others
                # 或者保留 id 最小/创建最早的
                eps.sort(key=lambda x: (
                    0 if x.source_type == 'documented' else 1,
                    x.created_at.timestamp() if x.created_at else 0
                ))
                
                survivor = eps[0]
                if survivor.path != new_path:
                    survivor.path = new_path
                    session.add(survivor)
                
                for duplicate in eps[1:]:
                    print(f"  - Deleting duplicate: {duplicate.path}")
                    # Update traffic records
                    traffic_records = session.exec(
                        select(TrafficRecord).where(TrafficRecord.endpoint_id == duplicate.id)
                    ).all()
                    for tr in traffic_records:
                        tr.endpoint_id = survivor.id
                        session.add(tr)
                    session.delete(duplicate)
                    
        session.commit()
        print("Done fixing paths.")

if __name__ == "__main__":
    fix_paths()
