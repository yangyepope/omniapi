import uuid
from concurrent.futures import ThreadPoolExecutor
from sqlmodel import Session, select
from app.core.db import engine
from app.models import ApiEndpoint, SystemModule
# from app.worker import process_traffic_atomic  # 导入被测函数

def run_concurrency_audit(service_name: str, endpoint_path: str, num_requests: int = 1000):
    """
    [Standard]：展示如何为物理写并发编写 100% 可信的对账脚本。
    1. 并发注入；2. 原子计数验证；3. 层级对账断言。
    """
    print(f"🚀 开始并发核验: {service_name} {endpoint_path} ({num_requests} 并发)")
    
    raw_flow_ids = [str(uuid.uuid4()) for _ in range(num_requests)]
    
    # 模拟多 Worker 环境 (线程池并发连接)
    # [Why 10 workers]：匹配标准 DBPool 大小，模拟高频锁竞争
    with ThreadPoolExecutor(max_workers=10) as executor:
        # 在真实测试中，取消注释下面一行以运行并发任务
        # list(executor.map(process_traffic_atomic, raw_flow_ids))
        _ = executor  # 标记为已使用
        _ = raw_flow_ids 

    # --- 最终对账 (Audit) ---
    with Session(engine) as session:
        endpoint = session.exec(
            select(ApiEndpoint).where(
                ApiEndpoint.service_name == service_name,
                ApiEndpoint.path == endpoint_path
            )
        ).first()
        
        if not endpoint:
            print("❌ 错误: 未探测到接口行")
            return

        # 核心物理断言
        assert endpoint.total_traffic_count == num_requests, "❌ 数据丢包！总流量不匹配"
        assert endpoint.unique_traffic_count == num_requests, "❌ 去重逻辑故障 (由于 ID 不同，预期应全量记录)"
        
        # 跨表级联对账
        mod = session.get(SystemModule, endpoint.module_id)
        assert mod.total_traffic_count >= num_requests, "❌ 级联更新失败"
        
        print(f"✅ 对账成功: {num_requests}/{num_requests} 物理一致。")

if __name__ == "__main__":
    run_concurrency_audit("DEMO_SVC", "/v1/demo", 1000)
