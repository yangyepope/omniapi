---
name: db-concurrency-guard
description: 数据库并发安全代码模板，包含 Upsert、行锁查询、原子计数器等常见场景的实现细节，以及功能测试模板。
---

> **使用时机**：当你需要实现"查找或创建"逻辑、计数器原子更新、并发安全测试模板时，
> 引用本 Skill 获取可直接复制的代码模板。
>
> **规则配套**：本 Skill 是 `04-数据库并发安全铁律.md` 的实现细节层。
> 规则告诉你*必须做什么*，本 Skill 告诉你*具体怎么写*。

---

## 模板 A：Upsert — 替代"查-判-写"的标准实现

适用场景：Celery Task / 后台 Worker 中需要"找到则跳过，找不到则创建"的逻辑。

```python
# [Why]：pg_insert + ON CONFLICT DO NOTHING 是单条原子 SQL，
# 数据库层面保证并发安全，无需应用层加锁或重试。
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import Session, select
from app.models import ApiEndpoint
import uuid

def get_or_create_endpoint(
    session: Session,
    method: str,
    path: str,
    service_name: str,
    module_id: uuid.UUID,
) -> ApiEndpoint:
    """
    [功能]：原子化地"获取或创建" ApiEndpoint，完全规避并发重复写入。
    [Why]：ON CONFLICT DO NOTHING 由 PostgreSQL 在事务内完成，
    无论多少 Worker 并发调用，最终只有一条记录存在。
    """
    stmt = (
        pg_insert(ApiEndpoint)
        .values(
            method=method,
            path=path,
            service_name=service_name,
            module_id=module_id,
            name=f"Discovery: {method} {path}",
            source_type="auto_discovered",
        )
        # [Why]：index_elements 必须与 UniqueConstraint 声明的字段完全一致
        .on_conflict_do_nothing(index_elements=["method", "path", "service_name"])
        .returning(ApiEndpoint.id)
    )

    result = session.exec(stmt).first()

    if result:
        # 本次 INSERT 成功，直接返回
        return session.get(ApiEndpoint, result[0])

    # [Why]：另一个 Worker 已抢先插入，直接查出该记录即可
    return session.exec(
        select(ApiEndpoint).where(
            ApiEndpoint.method == method,
            ApiEndpoint.path == path,
            ApiEndpoint.service_name == service_name,
        )
    ).one()
```

---

## 模板 B：行锁查询 — 读后立即写的场景

适用场景：读取记录后需要基于其当前值做判断再更新（如"若状态为 pending 则改为 running"）。

```python
# [Why]：FOR UPDATE 在读取时就锁住行，其他事务必须等待本事务提交后才能读写，
# 彻底消除"读到旧值 → 基于旧值写入"的并发窗口。
from sqlmodel import Session, select
from app.models import ApiEndpoint
import uuid

def increment_traffic_count_safe(session: Session, endpoint_id: uuid.UUID) -> None:
    """
    [功能]：安全地递增接口流量计数器。
    [Why]：with_for_update() 确保本事务持有行锁期间，
    其他 Worker 的读操作会阻塞，避免丢失更新。
    """
    stmt = (
        select(ApiEndpoint)
        .where(ApiEndpoint.id == endpoint_id)
        .with_for_update()          # ← 行锁，读即锁定
    )
    endpoint = session.exec(stmt).one()
    endpoint.total_traffic_count += 1
    session.add(endpoint)
    # [Why]：commit 后锁释放，其他等待的 Worker 才能继续
```

---

## 模板 C：SQL 表达式原子计数器 — 最高性能方案

适用场景：高并发计数场景，不需要在 Python 层读出当前值，只需要"+1"。

```python
# [Why]：UPDATE ... SET col = col + 1 是单条 SQL 原子操作，
# 不需要先 SELECT，性能最优，也不存在并发丢失更新问题。
from sqlalchemy import update
from sqlmodel import Session
from app.models import ApiEndpoint
import uuid

def atomic_increment(session: Session, endpoint_id: uuid.UUID) -> None:
    """
    [功能]：原子递增，不经过 Python 层，适合超高并发计数场景。
    """
    session.exec(
        update(ApiEndpoint)
        .where(ApiEndpoint.id == endpoint_id)
        .values(
            total_traffic_count=ApiEndpoint.total_traffic_count + 1,
            variants_count=ApiEndpoint.variants_count + 1,
        )
    )
```

---

## 模板 D：并发写入功能测试

位置：`backend/tests/functional/test_concurrent_writes.py`

```python
# [Why]：用 threading 模拟多 Worker 并发，验证唯一约束 + Upsert 模式
# 在实际运行时不会产生重复记录，是对模板 A/B 正确性的直接证明。
import threading
import pytest
from sqlmodel import Session, select, func
from app.core.db import engine
from app.models import ApiEndpoint, FilteredFlow


@pytest.mark.integration
def test_concurrent_endpoint_creation_no_duplicates(db_session):
    """
    [验证]：10 个线程同时为相同的 (method, path, service_name) 创建接口，
    数据库中最终只应存在 1 条记录。
    """
    CONCURRENCY = 10
    errors: list[Exception] = []

    def create_endpoint():
        try:
            with Session(engine) as session:
                # 调用封装好的 Upsert 函数（模板 A）
                from app.services.endpoint import get_or_create_endpoint
                get_or_create_endpoint(
                    session=session,
                    method="GET",
                    path="/api/v1/concurrent-test",
                    service_name="test-svc",
                    module_id=...,  # 替换为测试 fixture 的 module_id
                )
                session.commit()
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=create_endpoint) for _ in range(CONCURRENCY)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # 无异常
    assert not errors, f"并发写入出现异常：{errors}"

    # 核心断言：只有 1 条记录
    with Session(engine) as session:
        records = session.exec(
            select(ApiEndpoint).where(
                ApiEndpoint.method == "GET",
                ApiEndpoint.path == "/api/v1/concurrent-test",
                ApiEndpoint.service_name == "test-svc",
            )
        ).all()
    assert len(records) == 1, f"期望 1 条，实际 {len(records)} 条（竞态重复写入）"
```

---

## 模板 E：计数器一致性测试（nightly CI）

位置：`backend/tests/functional/test_counter_consistency.py`

```python
# [Why]：total_traffic_count 是冗余派生字段，极易因并发丢失更新而漂移。
# 此测试通过对比"计数器值"与"实际关联行数"，定期校验是否存在数据不一致。
import pytest
from sqlmodel import Session, select, func
from app.core.db import engine
from app.models import ApiEndpoint, FilteredFlow


@pytest.mark.nightly
def test_traffic_count_matches_actual_records():
    """
    [验证]：ApiEndpoint.total_traffic_count 与 FilteredFlow 实际行数严格一致。
    [Why]：若不一致，说明某处计数器更新出现了并发丢失，需立即排查。
    """
    with Session(engine) as session:
        endpoints = session.exec(select(ApiEndpoint)).all()

        mismatches = []
        for ep in endpoints:
            actual_count = session.exec(
                select(func.count(FilteredFlow.id)).where(
                    FilteredFlow.endpoint_id == ep.id
                )
            ).one()

            if ep.total_traffic_count != actual_count:
                mismatches.append(
                    f"{ep.method} {ep.path} "
                    f"(stored={ep.total_traffic_count}, actual={actual_count})"
                )

        assert not mismatches, (
            f"以下接口计数器与实际记录数不一致，请检查并发安全逻辑：\n"
            + "\n".join(mismatches)
        )
```

---

## 模板 F：Playwright E2E — UI 数值断言

位置：`frontend/tests/traffic-count-consistency.spec.ts`

```typescript
// [Why]：从用户视角验证"流量数不为 0"且"列表页数值与详情页行数一致"，
// 是发现后端计数器漂移的最后一道防线（前两层测试均通过后才到这里）。
import { test, expect } from "@playwright/test";

test.describe("流量统计数据一致性", () => {
  test("接口卡片流量数 > 0 且与详情页记录行数一致", async ({ page }) => {
    await page.goto("/services");

    // 取第一个有流量的接口卡片
    const countBadge = page
      .locator('[data-testid="endpoint-traffic-count"]')
      .first();
    await expect(countBadge).toBeVisible();

    const displayedCount = Number(await countBadge.textContent());

    // 断言：列表页显示的数值必须 > 0，防止"计数归零"类 bug 回归
    expect(displayedCount).toBeGreaterThan(0);

    // 进入详情页，数实际流量记录行数
    await page
      .locator('[data-testid="endpoint-row"]')
      .first()
      .click();
    await page.waitForSelector('[data-testid="traffic-record-row"]');

    const actualRows = await page
      .locator('[data-testid="traffic-record-row"]')
      .count();

    // 断言：UI 数值与实际行数严格匹配
    expect(displayedCount).toBe(actualRows);
  });
});
```

---

## 决策树：遇到"查找或创建"逻辑时如何选择

```
需要"查找或创建"逻辑？
│
├─ 是否需要基于读取值做 Python 层判断？
│   ├─ 是 → 使用 模板 B（行锁 with_for_update）
│   └─ 否 → 使用 模板 A（Upsert ON CONFLICT）
│
└─ 只是纯计数器 +1？
    └─ 直接使用 模板 C（SQL 表达式原子更新）
```

---

## 配套规则

- `04-数据库并发安全铁律.md` — 强制约束与 PR 检查清单
- `02-后端架构铁律.md` — 整洁架构、事务边界
- `ecc/python/patterns.md` — Python 通用设计模式
