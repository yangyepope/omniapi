import os
import time
import uuid

# ❗ [CRITICAL]：必须在所有 app 模块导入前执行 Patch 和 Env 加载
from dotenv import load_dotenv

load_dotenv()  # 加载根目录 .env

import gevent.monkey

gevent.monkey.patch_all()

import gevent
from gevent.pool import Pool
from datetime import datetime, timezone
from sqlmodel import Session, SQLModel, select, insert

from app.core.db import engine
from app.models import ApiEndpoint, RawFlow, SystemModule
from app.worker import process_raw_flow_task

# 🏗️ 确保测试前所有表已物理创建
print("🏗️ 正在同步数据库 Schema...")
SQLModel.metadata.create_all(engine)

def simulate_spike(service_name: str, path: str, num_requests: int):
    """
    模拟瞬时流量洪峰：基于 Gevent 协程池模拟 10 万级并发注入
    """
    print(f"\n🚀 开始协程压力模拟: {service_name} {path} ({num_requests} 并发)")

    # 1. 批量生产原始流量记录 (使用 Bulk Insert)
    print(f"📦 正在批量生产 {num_requests} 条测试流量...")
    start_prod = time.time()
    
    raw_flow_ids = [str(uuid.uuid4()) for _ in range(num_requests)]
    capt = datetime.now(timezone.utc)
    
    # 构造批量映射数据
    mappings = [
        {
            "id": fid,
            "service_name": service_name,
            "interface_path": path,
            "method": "POST",
            "headers": {"User-Agent": "Gevent-Spike-Tester"},
            "body": b'{"test": "gevent_data"}',
            "captured_at": capt
        }
        for fid in raw_flow_ids
    ]

    with Session(engine) as session:
        # 使用 SQLAlchemy 底层 bulk 接口加速注入
        session.bulk_insert_mappings(RawFlow, mappings)
        session.commit()
    
    print(f"✅ 生产完成，耗时: {time.time() - start_prod:.2f}s")

    # 2. 并发执行 Worker 处理逻辑 (使用 Gevent Pool)
    print(f"🔥 正在启动协程池进行流量吞吐模拟...")
    start_work = time.time()
    
    # 匹配 Worker 生产环境典型的连接池深度
    pool = Pool(100) 

    def worker_job(flow_id):
        try:
            # 模拟 Worker 内部 logic 的直接调用
            process_raw_flow_task.run(flow_id)
        except Exception as e:
            print(f"EXCEPTION: {e}")

    # 分发任务
    pool.map(worker_job, raw_flow_ids)
    print(f"✅ 协程处理完成，耗时: {time.time() - start_work:.2f}s")

    # 3. 统计核验
    print("\n📊 核验结果:")
    endpoint = None
    for i in range(30):
        with Session(engine) as session:
            endpoint = session.exec(
                select(ApiEndpoint).where(
                    ApiEndpoint.service_name == service_name,
                    ApiEndpoint.path == path
                )
            ).first()

            if endpoint and endpoint.total_traffic_count >= num_requests:
                break
            time.sleep(1)
            if i % 5 == 0:
                curr = endpoint.total_traffic_count if endpoint else 0
                print(f"  ... [Wait] 进度: {curr}/{num_requests}")

    if endpoint:
        print(f"✅ 接口 [{path}] 处理对齐成功!")
        print(f"👉 原始总流量: {endpoint.total_traffic_count} (预期 {num_requests})")
        print(f"👉 剔重后流量: {endpoint.unique_traffic_count} (预期 1)")

        with Session(engine) as session:
            mod = session.get(SystemModule, endpoint.module_id)
            print(f"👉 模块总流量: {mod.total_traffic_count if mod else 'N/A'} (预期 {num_requests})")

        assert endpoint.total_traffic_count == num_requests, "❌ 数据丢失！总流量不匹配"
        assert endpoint.unique_traffic_count == 1, "❌ 剔重漂移！唯一流量不匹配"
        print(f"\n🌟 统一协程架构压测通过！\n平均吞吐: {num_requests/(time.time()-start_work):.2f} req/s")
    else:
        print("❌ 错误: 未能探测到接口统计记录")

if __name__ == "__main__":
    # 使用唯一的接口路径防止脏数据干扰
    test_path = f"/v1/stress-test/{uuid.uuid4().hex[:8]}"
    # 低配服务器建议先从 1000 开始验证稳定性
    simulate_spike("GEVENT_STRESS_TEST", test_path, 1000)
