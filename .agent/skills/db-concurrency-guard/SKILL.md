---
name: db-concurrency-guard
description: SecurityPlatform 数据库并发安全开发圣经 — 原子 Upsert、锁层级协议、原子计数、并发仿真测试、及全链路数据一致性核验框架。
---

# SecurityPlatform 数据库并发安全开发王牌技能 (V8.2 Mega-Edition)

> **使用要求**：
> - 所有的"读取-修改-回写"场景必须强制参考本手册。
> - 涉及统计累加（如流量数、模块总计）的接口开发强制引用此 Skill。
> - 在 10 万+ QPS 压测场景下，所有逻辑必须通过"规范一"（锁序协议）的审计。

---

## 🌟 决策树：遇到高并发写操作时如何博弈

在 SecurityPlatform 的全场景开发中，选择正确的物理方案决定了吞吐量与一致性的生死：

```
遇到并发写需求？
│
├─ 涉及父子级联（如 [服务模块] -> [接口端点] -> [流量报文]）
│   └─ [铁律]：锁序协议 (Lock Hierarchy) — 必须先排队父锁，再写子表。
│
├─ "找到则用，找不到则创建"
│   └─ [模式]：Atomic Upsert (postgresql.insert)
│       └─ 适用：采集端点的接口发现、服务模块注册。
│
├─ 读取记录后依赖其当前状态做逻辑判断（如 状态机流转）
│   └─ [模式]：FOR UPDATE 行级排他锁
│       └─ 适用：重放攻击任务锁定、余额扣减、审批流切换。
│
├─ 只需要纯粹地 +N / -N 计数（不需在 Python 读出值）
│   └─ [模式]：SQLAlchemy Atomic Expression Update
│       └─ 适用：总流量、唯一流量、变体次数的原子统计。
│
└─ Celery 异步任务中执行以上操作
    └─ [强制]：必须包裹"指数退避重试 (Backoff)"。碰撞是家常便饭，自愈是核心能力。
```

---

## 一、 核心开发模板 (Production-Ready Templates)

### 模板 A：原子 Upsert — 工业级“查找或创建”标准 (V8.2)

**WHY**：避免“查->判断->写”之间不可消除的并发窗口带来的 `IntegrityError`。

```python
from sqlalchemy.dialects.postgresql import insert
from app.models import ApiEndpoint

def get_or_create_endpoint_atomic(conn, mth: str, path: str, svc: str, mod_id: str):
    """
    [Elegant Standard]：利用 PG 原子指令在一次 DB 往返内完成任务。
    """
    stmt = insert(ApiEndpoint).values(
        id=uuid.uuid4(), method=mth, path=path, service_name=svc, module_id=mod_id
    ).on_conflict_do_update(
        index_elements=[ApiEndpoint.method, ApiEndpoint.path, ApiEndpoint.service_name],
        set_={ApiEndpoint.name: ApiEndpoint.name} # 无损更新以触发 RETURNING
    ).returning(ApiEndpoint.id)
    
    return conn.execute(stmt).fetchone()[0]
```

### 模板 B：行锁锁读 (FOR UPDATE) — 复杂状态机场景

**WHY**：如果你先读出 `status = "pending"`，在判断过程中别的 Worker 改成了 `running`，你会产生严重的业务错乱。

```python
from sqlalchemy import select

def start_replay_task(session, task_id):
    # [Why]：.with_for_update() 在 SELECT 时即锁定行，直到事务结束。
    # 其他尝试读写此行的任务将排队。
    task = session.exec(
        select(ReplayTask).where(ReplayTask.id == task_id).with_for_update()
    ).one()
    
    if task.status != "pending":
        raise ValueError("任务已被他人认领")
        
    task.status = "running"
    session.add(task)
```

### 模板 C：原子计数器 — 统计字段“零丢失”方案 (V8.2)

**WHY**：严禁在 Python 中做 `val = old + 1`，必须由数据库在内部完成加法。

```python
from sqlalchemy import update

def increment_stats(conn, ep_id, u_inc):
    # [Why]：update().values(col=col+1) 是原子操作。
    conn.execute(
        update(ApiEndpoint).where(ApiEndpoint.id == ep_id).values(
            total_traffic_count=ApiEndpoint.total_traffic_count + 1,
            unique_traffic_count=ApiEndpoint.unique_traffic_count + u_inc
        )
    )
```

---

## 二、 10 万级并发的三大物理铁律 (The High-End DX)

### 1. 锁序层级协议 (Lock Hierarchy Protocol) 
**这是终结死锁的最高原则。** 所有的级联多表写操作必须遵循单一路径进入事务：
1. **持有父锁** (SystemModule) -> 2. **持有子锁** (ApiEndpoint) -> 3. **执行子操作** (FilteredFlow)。

### 2. 事务边界最小化准则
**将昂贵的 CPU 计算移出 `begin()` 块。** 保证数据库持锁时间 < 10ms。
- **OUT**: URI 归一化、Headers 哈希计算、指纹对比。
- **IN**: 带有 `on_conflict` 的快速写入。

### 3. 指数级退避重试 (Exponential Backoff)
高频碰撞不是故障，是并发下的自然表现。Worker 必须学会“有序谦让”。

```python
for i in range(MAX_RETRIES):
    try:
        # 业务逻辑
        break
    except OperationalError as exc:
        if "deadlock detected" in str(exc).lower():
            time.sleep(random.uniform(0.1, 0.5) * (2 ** i)) # 随机抖动屏蔽谐波碰撞
```

---

## 三、 全维度核验矩阵 (Testing & Verification)

### 模板 E：并发功能仿真脚本 (Pytest / Threading)
**位置**：`backend/tests/functional/test_concurrent_*.py`
针对新接口必须通过 1,000+ 并发仿真验证原子性。

```python
# [Why]：直接测试物理一致性，而非 Mock。
def test_spike():
    with ThreadPoolExecutor(max_workers=10) as ex:
        ex.map(target_function, test_data)
    # 断言：最终计数器 == 总请求数
```

### 模板 F：父子表对账与数据纠错 (Audit)
**位置**：`backend/tests/functional/test_audit_stats.py`
针对冗余统计字段的“晚间自动对账”。

```python
def check_stats(parent_id):
    actual = session.exec(select(func.count(Child.id)).where(Child.parent_id == parent_id)).one()
    stored = session.get(Parent, parent_id).total_count
    assert actual == stored, "发现统计漂移！正在排查原子更新漏洞。"
```

### 模板 G：全栈 E2E 一致性对齐断言 (Playwright)
**位置：`frontend/tests/consistency.spec.ts`**

**WHY**：验证终端用户“看到的数字”与后台“真实的数据行”是否强一致。

```typescript
test("核验列表计数与详情行数一致", async ({ page }) => {
  await page.goto("/services");
  const count_on_list = extractCount(await page.getByTestId("stat-badge").textContent());
  
  await page.getByTestId("list-row").first().click();
  const physical_rows = await page.getByTestId("data-row").count();
  
  expect(count_on_list).toBe(physical_rows); // 强制对齐的核心断言
});
```

---

## 四、 快速参考：常见症状与药方

| 错误现象 | 物理根因 | 建议模板 |
| :--- | :--- | :--- |
| **IntegrityError** / 数据重复 | 查-判-写逻辑被并发穿透 | **模板 A (Upsert)** |
| **DeadlockDetected** | 不同线程以交替顺序写多表 | **铁律 1 (顺序加锁协议)** |
| **统计数据变少** | Python 级更新丢失 | **模板 C (原子计数器)** |
| **UI 数字不跳动** | 未使用原子 Expressions 或事务未提交 | **模板 C + 事务审计** |

---
**版本**: V8.2 Mega-Edition
**制定者**: Antigravity (AI System Architect)
**制定日期**: 2026-04-03
