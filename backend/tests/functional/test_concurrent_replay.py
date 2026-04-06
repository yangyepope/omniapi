import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

# [ENV]：自动加载根目录 .env，确保 Settings 校验通过
def load_env():
    env_path = os.path.join(os.getcwd(), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith("#") and "=" in line:
                    key, value = line.strip().split("=", 1)
                    os.environ.setdefault(key, value)

load_env()

# 导入应用配置 (Hack sys.path)
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))
from sqlalchemy import create_engine, select
from sqlmodel import Session
from app.core.config import settings
from app.models import Variant
from app.worker import replay_variant_task

# 数据库配置
SQLALCHEMY_DATABASE_URI = str(settings.SQLALCHEMY_DATABASE_URI)
engine = create_engine(SQLALCHEMY_DATABASE_URI)

def push_task(variant_id):
    """推送任务到 Celery"""
    replay_variant_task.delay(str(variant_id))

def test_scale_replay(count=1000):
    """
    1. 选取一个测试变体。
    2. 并发推送指定数量的任务。
    3. 验证数据库中的计数是否精准匹配。
    """
    with Session(engine) as session:
        # 选取最近创建的一个变体 (使用 scalar 确保解包为 Variant 实例)
        variant = session.scalar(select(Variant).order_by(Variant.created_at.desc()))
        if not variant:
            print("❌ No variant found in database. Please create one first.")
            return

        variant_id = variant.id
        initial_count = variant.replay_count
        print(f"🎯 Target Variant: {variant.name} (ID: {variant_id})")
        print(f"📊 Initial Replay Count: {initial_count}")
        print(f"🚀 Pushing {count} tasks to 'replay' queue...")

        start_time = time.time()

        # 使用多线程推任务（模拟高并发接入）
        with ThreadPoolExecutor(max_workers=50) as executor:
            for _ in range(count):
                executor.submit(push_task, variant_id)

        push_duration = time.time() - start_time
        print(f"✅ Push completed in {push_duration:.2f}s ({count/push_duration:.2f} tasks/s)")

        print("⏳ Waiting for worker to process (30s timeout)...")

        # 轮询检查计数，直到达到目标或超时
        target_count = initial_count + count
        timeout = 30
        poll_interval = 2

        for i in range(0, timeout, poll_interval):
            time.sleep(poll_interval)
            session.expire_all()
            current_variant = session.get(Variant, variant_id)
            print(f"   [{i}s] Current Count: {current_variant.replay_count} / {target_count}")

            if current_variant.replay_count >= target_count:
                print("✨ SUCCESS: Replay count matched target exactly!")
                break
        else:
            print(f"⚠️ TIMEOUT: Final count is {current_variant.replay_count}, expected {target_count}")

if __name__ == "__main__":
    # 默认跑 1000 次压力测试 (可以按需增加至 10000)
    test_count = 1000
    if len(sys.argv) > 1:
        test_count = int(sys.argv[1])

    test_scale_replay(test_count)
