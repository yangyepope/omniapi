import threading
from sqlalchemy import text
from app.core.db import engine
import uuid

def probe_task(thread_id, results):
    try:
        with engine.connect() as conn:
            # 1. 检查搜索路径
            sp = conn.execute(text("SHOW search_path")).fetchone()[0]
            # 2. 检查表存在性
            try:
                conn.execute(text("SELECT 1 FROM filtered_flows LIMIT 1"))
                table_ok = True
            except Exception as e:
                table_ok = str(e)
            
            results.append({
                "id": thread_id,
                "search_path": sp,
                "table_status": "OK" if table_ok is True else "MISSING"
            })
    except Exception as e:
        results.append({"id": thread_id, "error": str(e)})

def run_diagnostic():
    threads = []
    results = []
    print(f"🚀 启动 50 线程 Schema 探测...")
    for i in range(50):
        t = threading.Thread(target=probe_task, args=(i, results))
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
    
    ok_count = len([r for r in results if r.get("table_status") == "OK"])
    missing_count = len([r for r in results if r.get("table_status") == "MISSING"])
    
    print(f"\n📊 诊断结果:")
    print(f"✅ 成功线程 (Table Visible): {ok_count}")
    print(f"❌ 失败线程 (Table Invisible): {missing_count}")
    
    if missing_count > 0:
        sample = [r for r in results if r.get("table_status") == "MISSING"][0]
        print(f"\n样本失败线程上下文: {sample}")

if __name__ == "__main__":
    run_diagnostic()
