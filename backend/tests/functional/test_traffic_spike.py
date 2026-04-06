import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from sqlmodel import Session, SQLModel, select

from app.core.db import engine
from app.models import ApiEndpoint, RawFlow, SystemModule
from app.worker import process_raw_flow_task

# 🚀 [物理加固] 确保测试前所有表（包括新增的 FilteredFlow）已物理创建
print("🏗️ 正在同步数据库 Schema...")
SQLModel.metadata.create_all(engine)

def simulate_spike(service_name: str, path: str, num_requests: int):
    """
    模拟瞬时流量洪峰：并发 50+ 线程处理同一个新接口流量
    """
    print(f"🚀 开始压力模拟: {service_name} {path} ({num_requests} 并发)")

    # 1. 准备原始流量记录
    raw_flow_ids = []
    with Session(engine) as session:
        for i in range(num_requests):
            rf = RawFlow(
                service_name=service_name,
                interface_path=path,
                method="POST",
                headers={"User-Agent": "Spike-Tester"},
                body=b'{"test": "data"}',
                captured_at=datetime.now(timezone.utc)
            )
            session.add(rf)
            session.flush()
            raw_flow_ids.append(str(rf.id))
        session.commit()

    # 2. 并发执行 Worker 处理逻辑
    def worker_wrapper(flow_id):
        try:
            # [Why .run() 而非直接调用]：直接调用 process_raw_flow_task(fid) 会走 Celery 的
            # __call__ → push_request 路径，在多线程并发下 request_stack 未初始化会抛
            # AttributeError。.run() 直接调用函数体，绕过 Celery task context，适合线程内测试。
            process_raw_flow_task.run(flow_id)
        except Exception as e:
            print(f"EXCEPTION: {e}")

    # [Why 10 workers]：匹配标准数据库连接池大小，避免连接耗尽
    with ThreadPoolExecutor(max_workers=10) as executor:
        executor.map(worker_wrapper, raw_flow_ids)

    # 3. 统计核验 (增加超时保护)
    print("\n📊 核验结果:")
    endpoint = None
    for i in range(30):  # 最多等待 30 秒
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
                print(f"  ... 进度中: {endpoint.total_traffic_count if endpoint else 0}/{num_requests}")

    if endpoint:
        print(f"✅ 接口 [{path}] 探测成功!")
        print(f"👉 原始总流量: {endpoint.total_traffic_count} (预期 {num_requests})")
        print(f"👉 剔重后流量: {endpoint.unique_traffic_count} (预期 1)")

        # 级联核验
        with Session(engine) as session:
            mod = session.get(SystemModule, endpoint.module_id)
            print(f"👉 模块总流量: {mod.total_traffic_count if mod else 'N/A'} (预期 {num_requests})")

        # 断言验证 (防止漂移)
        assert endpoint.total_traffic_count == num_requests, "❌ 数据丢失！总流量不匹配"
        assert endpoint.unique_traffic_count == 1, "❌ 剔重漂移！唯一流量不匹配"
        print("\n🌟 压力测试通过: 加固方案已生效，数据读写保持原子一致。")
    else:
        print("❌ 错误: 未能探测到接口行")

if __name__ == "__main__":
    # 使用唯一的接口路径防止脏数据干扰
    test_path = f"/v1/stress-test/{uuid.uuid4().hex[:8]}"
    simulate_spike("STRESS_SVC_TEST", test_path, 100000)
