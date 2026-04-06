import time
import uuid

# ❗ [CRITICAL]：必须在物理第一行加载环境变量
from dotenv import load_dotenv

load_dotenv()

import gevent.monkey

# ❗ 必须在导入 httpx 前 patch
gevent.monkey.patch_all()

import gevent
import httpx
from gevent.pool import Pool
from sqlmodel import Session, select

from app.core.db import engine  # noqa: E402
from app.models import ApiEndpoint

# 配置信息
TARGET_URL = "http://localhost:8004/v1/collect"
CONCURRENCY = 100       # 协程池大小
TOTAL_REQUESTS = 100000   # 总请求数

def send_collect_request(client, service_name, path):
    """模拟 Nginx 镜像流量发送 (含自适应重试机制)"""
    headers = {
        "X-Original-URI": path,
        "X-Original-Method": "POST",
        "X-Service-Name": service_name,
        "Content-Type": "application/json"
    }
    payload = {
        "data": "spike_test_fixed_payload"
    }
    
    # 🌟 十万级高并发加固：增加 3 次网络级自动重试
    for attempt in range(3):
        try:
            gevent.sleep(0.001 * attempt) # 极微量退避
            resp = client.post(TARGET_URL, json=payload, headers=headers)
            return resp.status_code
        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as e:
            if attempt == 2:
                return f"ERROR: {str(e)}"
            continue
        except Exception as e:
            return f"ERROR: {str(e)}"

def run_http_spike_test():
    # 🌟 修正逻辑：后端会取 URL Path 的第一层作为 service_name
    # 路径为 /v1/http-stress/... 则 service_name 为 v1
    test_path = f"/v1/http-stress/{uuid.uuid4().hex[:8]}"
    detected_service_name = "v1"

    print("🚀 启动全链路最终调优压测...")
    print(f"🎯 目标地址: {TARGET_URL}")
    print(f"🔥 并发配置: {CONCURRENCY} 协程 | 总计 {TOTAL_REQUESTS} 请求")

    start_time = time.time()

    # 使用 httpx 连接池，并放宽超时至 15s 以应对极高并发下的 DB 瞬间压力
    with httpx.Client(
        limits=httpx.Limits(max_connections=CONCURRENCY),
        timeout=15.0
    ) as client:
        pool = Pool(CONCURRENCY)
        results = pool.map(lambda _: send_collect_request(client, detected_service_name, test_path), range(TOTAL_REQUESTS))

    duration = time.time() - start_time
    success_count = sum(1 for r in results if r == 204)
    error_results = [r for r in results if r != 204]

    print("\n✅ 注入完成!")
    print(f"⏱️ 耗时: {duration:.2f}s")
    print(f"📈 吞吐量: {TOTAL_REQUESTS/duration:.2f} req/s")
    print(f"🆗 成功 (204): {success_count}/{TOTAL_REQUESTS}")

    if error_results:
        print(f"⚠️ 异常统计 (前5条): {list(set(error_results))[:5]}")

    print("\n⏳ 等待 Celery Worker 异步处理与去重 (8s)...")
    time.sleep(8)

    print("📊 正在核验数据库最终一致性...")
    with Session(engine) as session:
        # 重试 3 次确保异步任务落库
        for attempt in range(3):
            endpoint = session.exec(
                select(ApiEndpoint).where(
                    ApiEndpoint.path == test_path
                )
            ).first()
            if endpoint:
                break
            print(f"  ... [Retry {attempt+1}] 正在等待记录...")
            time.sleep(3)

        if endpoint:
            print("👉 数据库核验成功!")
            print(f"👉 入库总流量: {endpoint.total_traffic_count} (预期 {success_count})")
            print(f"👉 唯一流量: {endpoint.unique_traffic_count} (预期 1)")

            assert endpoint.total_traffic_count == success_count, f"❌ 数据丢失！入库 {endpoint.total_traffic_count} vs 成功请求 {success_count}"
            assert endpoint.unique_traffic_count == 1, "❌ 去重逻辑异常！"
            print("\n🌟 全链路 100% 正确性验证通过！")
        else:
            print(f"❌ 错误：在数据库中未找到路径为 [{test_path}] 的记录")

if __name__ == "__main__":
    run_http_spike_test()
