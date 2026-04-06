import time
import uuid

# ❗ [CRITICAL]：物理加载环境
from dotenv import load_dotenv

load_dotenv()

import gevent.monkey

gevent.monkey.patch_all()

import gevent
import httpx
from gevent.pool import Pool
from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.models import Variant

# 配置信息
VARIANT_ID = "d8bce079-ef9a-4f9c-9722-b82ec1dee2af"
BASE_URL = "http://localhost:8004/api/v1"
CONCURRENCY = 100       # 协程池大小
TOTAL_REQUESTS = 1000   # 总请求数

def get_token():
    """获取管理员 Token"""
    print("🔑 正在获取超级管理员 Token...")
    url = f"{BASE_URL}/login/access-token"
    payload = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD
    }
    # oauth2 登录通常是 form-data
    resp = httpx.post(url, data=payload)
    resp.raise_for_status()
    return resp.json()["access_token"]

def trigger_replay(client, token, variant_id):
    """触发一次重放 (含 3 次高并发容错重试)"""
    url = f"{BASE_URL}/replays/{variant_id}"
    headers = {"Authorization": f"Bearer {token}"}

    for attempt in range(3):
        try:
            # 极微量退避延迟
            gevent.sleep(0.001 * attempt)
            # 🌟 关键加固：超时放宽至 60s，以应对 200 线程池瞬时满载时的微量排队
            resp = client.post(url, headers=headers, timeout=60.0)
            return resp.status_code
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            if attempt == 2:
                return f"ERROR: {str(e)}"
            continue
        except Exception as e:
            return f"ERROR: {str(e)}"

def run_replay_spike():
    print("\n🚀 启动重放引擎 1000 次极限压测...")
    print(f"🎯 变体 ID: {VARIANT_ID}")
    print(f"🔥 并发配置: {CONCURRENCY} 协程 | 总计 {TOTAL_REQUESTS} 重放任务")

    token = get_token()

    # 记录初始计数器
    with Session(engine) as session:
        v_init = session.get(Variant, uuid.UUID(VARIANT_ID))
        initial_count = v_init.replay_count if v_init else 0
    print(f"📊 数据库初始 replay_count: {initial_count}")

    start_time = time.time()

    with httpx.Client(
        limits=httpx.Limits(max_connections=CONCURRENCY),
        timeout=30.0
    ) as client:
        pool = Pool(CONCURRENCY)
        results = pool.map(lambda _: trigger_replay(client, token, VARIANT_ID), range(TOTAL_REQUESTS))

    duration = time.time() - start_time
    success_count = sum(1 for r in results if r == 200)
    error_results = [r for r in results if r != 200]

    print("\n✅ 触发模拟完成!")
    print(f"⏱️ 耗时: {duration:.2f}s")
    print(f"📈 调度吞吐量: {TOTAL_REQUESTS/duration:.2f} task/s")
    print(f"🆗 接口成功 (200): {success_count}/{TOTAL_REQUESTS}")

    if error_results:
        print(f"⚠️ 异常统计 (前5条): {list(set(error_results))[:5]}")

    print("\n⏳ 正在验证数据库原子计数一致性...")
    time.sleep(5)  # 等待所有线程池写操作落地

    with Session(engine) as session:
        # 重试 3 次确保 DB 刷写完成
        for _ in range(3):
            session.expire_all()
            v_final = session.get(Variant, uuid.UUID(VARIANT_ID))
            final_count = v_final.replay_count if v_final else 0
            if final_count >= initial_count + success_count:
                break
            time.sleep(2)

        print(f"📊 数据库最终 replay_count: {final_count}")
        delta = final_count - initial_count

        if delta == success_count:
            print(f"✨ 物理增量: +{delta} (完美对齐!)")
            print("\n🌟 重放引擎极致并发验证通过！")
        else:
            print(f"❌ 计数偏差: 预期增量 {success_count}, 实际增量 {delta}")

if __name__ == "__main__":
    run_replay_spike()
