---
---
name: db-concurrency-guard
description: SecurityPlatform 数据库并发安全开发标准 — 原子 Upsert、锁层级协议、高性能统计累加、死锁自愈框架。
---

> **使用要求**：
> - 所有的"读取-修改-回写"逻辑必须在本 Skill 框架下实现。
> - 涉及跨表统计（如流量数、模块总数）的接口开发强制引用此 Skill。
> - 压测并发量预期 > 100 时必须遵循本规则。

---

## 决策树：遇到高并发写操作时如何选择

```
遇到并发写需求？
│
├─ 涉及多级级联（如 模块 -> 接口 -> 记录）
│   └─ [铁律]：遵循层级加锁协议（Lock Hierarchy Protocol）
│
├─ "查找或创建" 记录
│   └─ [模式]：Atomic Upsert (postgresql.insert)
│
├─ 并发累加/更新计数
│   └─ [模式]：SQLAlchemy Atomic Expression Update
│
└─ 复杂状态机校验后写入
    └─ [模式]：FOR UPDATE 行级排他锁 (Standard SELECT FOR UPDATE)
```

---

## 规范一：锁序层级协议 (Lock Hierarchy Protocol) 

**这是解决物理死锁的唯一最高准则。** 在多表写入场景下，所有并发线程必须按照以下单一路径进入事务：

1.  **Level 1**: `SystemModule` (服务模块) —— 事务的物理排队入口。
2.  **Level 2**: `ApiEndpoint` (接口端点) —— 局部统计锁。
3.  **Level 3**: `FilteredFlow` (流量记录) —— 并发写入终点。

> [!IMPORTANT]
> **绝对禁止**：在未持有所属 `SystemModule` 的情况下直接尝试写入 `FilteredFlow`，这会导致不同接口的任务产生死锁碰撞。

---

## 规范二：SQLAlchemy 表达式模板 (The High-End DX)

**严禁在生产代码中使用 `text()` 字符串 SQL。** 必须使用 SQLAlchemy 强类型表达式实现原子性。

### 模式 A：原子 Upsert (Atomic Upsert)
适用场景：唯一键冲突时更新计数或忽略。

```python
from sqlalchemy.dialects.postgresql import insert

stmt = insert(FilteredFlow).values(
    id=uuid.uuid4(),
    dedup_key=key,
    occurrence_count=1,
    **data
).on_conflict_do_update(
    index_elements=[FilteredFlow.dedup_key],
    set_={
        FilteredFlow.occurrence_count: FilteredFlow.occurrence_count + 1,
        FilteredFlow.captured_at: datetime.now(timezone.utc)
    }
).returning(FilteredFlow.id, (FilteredFlow.occurrence_count == 1).label("is_new"))

# 一次往返数据库，同时完成：插入或更新、获取 ID、判断是否为新流量。
row = conn.execute(stmt).fetchone()
```

### 模式 B：原子累加控制 (Atomic Counter)
适用场景：统计字段同步。

```python
from sqlalchemy import update

conn.execute(
    update(ApiEndpoint)
    .where(ApiEndpoint.id == ep_id)
    .values(
        total_traffic_count=ApiEndpoint.total_traffic_count + 1,
        last_active_at=datetime.now(timezone.utc)
    )
)
```

---

## 规范三：事务边界优化准则 (Transaction Edge)

**昂贵的计算应该发生在事务之外。** 保持事务持锁时间 < 10ms。

1.  **事务外（CPU Block）**：
    - URI 的清洗与归一化 (`normalize_uri`)。
    - 流量指纹的哈希计算 (`generate_dedup_key`)。
    - 大报文的 JSON 序列化/反序列化。
2.  **事务内（IO Block）**：
    - 严格依照锁序执行 `conn.execute()`。
    - 简单的数值计算与赋值。

---

## 规范四：死锁弹性自愈 (Resilience)

在高频并发现场，物理锁碰撞是不可完全避免的。所有的并发写任务必须具备指数退避重试能力。

```python
import random
import time
from sqlalchemy.exc import OperationalError

for attempt in range(MAX_RETRIES):
    try:
        with engine.begin() as conn:
            # 执行原子加锁逻辑
            ...
        break
    except OperationalError as exc:
        if "deadlock detected" in str(exc).lower():
            # 指数退避 + 随机时间抖动（Jitter）
            wait = random.uniform(0.1, 0.5) * (2 ** attempt)
            time.sleep(wait)
            continue
        raise
```

---

## 规范五：自动化压测核验标准

**任何涉及写并发的变更，必须提供 10,000+ QPS 的压力测试脚本。**
- 测试必须包含：`ThreadPoolExecutor` 多连接并发。
- 核验指标：`assert TotalCount == SimulatedRequests`。
- 核验指标：`assert UniqueCount == 1` (针对特定 Key)。

---

## 快速参考手册

| 场景 | 推荐方案 | 核心价值 |
| :--- | :--- | :--- |
| 创建接口记录 | `postgresql.insert` | 原子 Upsert，无竞态 |
| 累加请求计数 | `Expression += 1` | 数据库内物理原子性 |
| 状态机流转 | `with_for_update()` | 行锁独占，安全判断 |
| 跨表复杂对账 | 顺序加锁协议 | **终结死锁** |

---
**版本**: V8.0 (Hardened Edition)
**制定日期**: 2026-04-03
