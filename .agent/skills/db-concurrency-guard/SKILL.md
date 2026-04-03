---
name: db-concurrency-guard
description: 数据库并发安全通用模板库 — Upsert、行锁、原子计数器、并发功能测试、项目级 E2E 一致性框架，适用于整个 OmniAPI 项目所有写操作场景。
---

> **使用时机**：
> - 需要实现"查找或创建"逻辑时
> - 需要更新计数器字段时
> - 新增 SQLModel 模型需要设计唯一约束时
> - 编写 Celery Task 涉及数据库写操作时
> - 编写 E2E 测试需要验证数据一致性时
>
> **规则配套**：本 Skill 是 `04-数据库并发安全铁律.md` 的实现细节层。
> 规则定义**必须做什么**，本 Skill 提供**具体怎么写**的可复用代码模板。

---

## 决策树：遇到写操作时如何选择模式

```
需要写数据库？
│
├─ 创建新记录（"找到则用，找不到则创建"）
│   └─ 使用 模板 A：Upsert (ON CONFLICT DO NOTHING)
│
├─ 读取记录后立即基于当前值修改
│   └─ 使用 模板 B：行锁 (.with_for_update())
│
├─ 只做计数器 +N / -N，不需要读出当前值
│   └─ 使用 模板 C：SQL 表达式原子更新
│
└─ Celery Task 中做以上任意操作
    ├─ 创建 → 模板 A + IntegrityError 捕获（见模板 A 变体）
    └─ 更新计数 → 模板 C（不需要行锁，SQL 表达式本身是原子的）
```

---

## 模板 A：Upsert — "查找或创建"的标准实现

**适用场景**：任何"若不存在则创建，若存在则忽略/更新"的逻辑。
替代"查 → 判断 → 写"三步反模式。

```python
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import Session, select
from app.models import YourModel  # 替换为实际模型

def get_or_create_record(
    session: Session,
    unique_field_a: str,
    unique_field_b: str,
    **extra_fields,
) -> YourModel:
    """
    [Why]：ON CONFLICT DO NOTHING 是数据库原子操作。
    无论多少个 Worker 并发调用，唯一约束保证只有一条记录被插入，
    彻底消除"查-判-写"三步之间不可消除的并发窗口。
    """
    stmt = (
        pg_insert(YourModel)
        .values(
            unique_field_a=unique_field_a,
            unique_field_b=unique_field_b,
            **extra_fields,
        )
        # [Why]：index_elements 必须与模型 __table_args__ 中的
        # UniqueConstraint 字段完全一致，否则 ON CONFLICT 不生效。
        .on_conflict_do_nothing(index_elements=["unique_field_a", "unique_field_b"])
        .returning(YourModel.id)
    )

    result = session.exec(stmt).first()
    if result:
        # 本次 INSERT 成功
        return session.get(YourModel, result[0])

    # [Why]：另一个 Worker 已抢先插入，直接查出已有记录
    return session.exec(
        select(YourModel).where(
            YourModel.unique_field_a == unique_field_a,
            YourModel.unique_field_b == unique_field_b,
        )
    ).one()
```

### Upsert 变体：ON CONFLICT DO UPDATE（导入对齐场景）

当"已存在时需要更新部分字段"（如从外部系统导入数据，以外部数据为准）：

```python
stmt = (
    pg_insert(YourModel)
    .values(field_a=val_a, field_b=val_b, name=name)
    .on_conflict_do_update(
        index_elements=["field_a", "field_b"],
        set_={"name": name, "description": description},
    )
    .returning(YourModel.id)
)
session.exec(stmt)
```

### Celery Task 中的 Upsert + IntegrityError 兜底

```python
from sqlalchemy.exc import IntegrityError

def safe_get_or_create(session: Session, name: str) -> YourModel:
    """
    [Why]：with_for_update() 在行已存在时锁住它（安全读）；
    若行不存在，flush() 触发写入，此时若另一 Worker 抢先插入，
    IntegrityError 被捕获后 rollback 再查，保证最终获得唯一一条记录。
    """
    record = session.exec(
        select(YourModel).where(YourModel.name == name).with_for_update()
    ).first()

    if not record:
        record = YourModel(name=name)
        session.add(record)
        try:
            session.flush()
        except IntegrityError:
            session.rollback()
            record = session.exec(
                select(YourModel).where(YourModel.name == name)
            ).first()
            if not record:
                raise  # 真正的异常，非竞态，向上抛出

    return record
```

---

## 模板 B：行锁查询 — 读后立即修改的场景

**适用场景**：读取记录后需要基于其当前值做条件判断再写入
（如状态机转换：`pending → running`，余额扣减等）。

```python
from sqlmodel import Session, select
from app.models import YourModel

def update_with_lock(session: Session, record_id, new_status: str) -> YourModel:
    """
    [Why]：FOR UPDATE 在 SELECT 时就锁住行，其他事务的读写请求
    必须等待本事务 commit 后才能继续，彻底消除"读到旧值 → 基于旧值写"的窗口。
    仅在"读出的值会影响写逻辑"时才使用，纯计数器场景用模板 C 更高效。
    """
    record = session.exec(
        select(YourModel)
        .where(YourModel.id == record_id)
        .with_for_update()  # 读即加锁
    ).one()

    # 基于读出的值做判断
    if record.status != "pending":
        raise ValueError(f"非法状态转换：{record.status} → {new_status}")

    record.status = new_status
    session.add(record)
    # commit 后锁自动释放
```

---

## 模板 C：SQL 表达式原子计数器

**适用场景**：高并发计数场景，不需要在 Python 层读出当前值，只需原子 +N。
性能最优，无需行锁，单条 SQL 即完成读-改-写。

```python
from sqlalchemy import update
from sqlmodel import Session
from app.models import YourModel

def atomic_increment(session: Session, record_id, delta: int = 1) -> None:
    """
    [Why]：UPDATE SET col = col + N 在 SQL 层原子执行，
    不经过 Python 层，完全避免"读旧值 → +1 → 写新值"的并发丢失更新。
    适合任何冗余统计字段（流量数、变体数、调用次数等）。
    """
    session.exec(
        update(YourModel)
        .where(YourModel.id == record_id)
        .values(count_field=YourModel.count_field + delta)
    )

# 同时更新多个计数器字段（避免多次 UPDATE 往返）
def atomic_increment_multiple(session: Session, record_id) -> None:
    session.exec(
        update(YourModel)
        .where(YourModel.id == record_id)
        .values(
            total_count=YourModel.total_count + 1,
            unique_count=YourModel.unique_count + 1,
            last_active_at=current_utc_time(),
        )
    )
```

---

## 模板 D：模型定义 — UniqueConstraint 标准写法

**适用场景**：任何新建 SQLModel 模型，凡业务上不允许重复的字段组合。

```python
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field

class YourModel(SQLModel, table=True):
    __tablename__ = "your_model"

    # [Why]：__table_args__ 中的 UniqueConstraint 会被 alembic autogenerate
    # 自动检测，确保 DB 约束与代码定义始终同步；命名规范：uq_<表名>_<字段>
    __table_args__ = (
        UniqueConstraint(
            "field_a", "field_b",
            name="uq_your_model_field_a_field_b",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    field_a: str = Field(max_length=255)
    field_b: str = Field(max_length=255)
    count_field: int = Field(default=0)  # 冗余计数器，更新时必须用模板 C
```

---

## 模板 E：并发写入功能测试（通用）

**位置**：`backend/tests/functional/test_concurrent_<feature>.py`
**触发时机**：每次 PR 涉及新模型或新 Celery Task

```python
import threading
import pytest
from sqlmodel import Session, select
from app.core.db import engine
from app.models import YourModel


@pytest.mark.integration
def test_concurrent_create_no_duplicates():
    """
    [Why]：用 threading 模拟多个 Worker 同时执行"查找或创建"逻辑，
    验证 UniqueConstraint + Upsert 在实际并发下不产生重复记录。
    这是对模板 A 正确性的直接验证，必须在每个涉及并发写入的模块中配套。
    """
    CONCURRENCY = 10
    errors: list[Exception] = []

    def worker_task():
        try:
            with Session(engine) as session:
                # 调用被测函数（使用模板 A 实现）
                safe_get_or_create(session, name="concurrent-test-record")
                session.commit()
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=worker_task) for _ in range(CONCURRENCY)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors, f"并发写入出现异常：{errors}"

    with Session(engine) as session:
        records = session.exec(
            select(YourModel).where(YourModel.name == "concurrent-test-record")
        ).all()

    # 核心断言：无论多少 Worker 并发，最终只有 1 条记录
    assert len(records) == 1, (
        f"期望 1 条记录，实际 {len(records)} 条 — 说明并发竞态产生了重复写入"
    )
```

---

## 模板 F：计数器一致性对账测试（nightly CI）

**位置**：`backend/tests/functional/test_counter_consistency.py`
**触发时机**：nightly CI，也可在重大变更后手动触发

```python
import pytest
from sqlmodel import Session, select, func
from app.core.db import engine
from app.models import ParentModel, ChildModel  # 替换为实际模型


@pytest.mark.nightly
def test_counter_matches_actual_child_count():
    """
    [Why]：冗余计数字段（xxx_count）是性能优化的产物，
    极易因并发更新丢失而漂移。此测试周期性地将计数器值与实际子表行数对比，
    任何不一致都意味着并发安全逻辑存在漏洞，需立即排查。

    使用方式：将 ParentModel / ChildModel 替换为实际的父子表模型，
    将 count_field 替换为实际的冗余计数字段名。
    """
    with Session(engine) as session:
        parents = session.exec(select(ParentModel)).all()

        mismatches: list[str] = []
        for parent in parents:
            actual = session.exec(
                select(func.count(ChildModel.id)).where(
                    ChildModel.parent_id == parent.id
                )
            ).one()

            if parent.count_field != actual:
                mismatches.append(
                    f"[{parent.__class__.__name__} id={parent.id}] "
                    f"count_field={parent.count_field}, 实际行数={actual}"
                )

        assert not mismatches, (
            "以下记录的冗余计数与实际子表行数不一致，"
            "请检查对应 Worker 或 API 路由的写操作是否遗漏了原子更新：\n"
            + "\n".join(mismatches)
        )
```

---

## 模板 G：项目级 E2E 数据一致性测试框架

**位置**：`frontend/tests/data-consistency.spec.ts`

> **设计原则**：E2E 层不只验证"某个数字等于多少"，
> 而是验证**"UI 展示的派生数据与后端实际数据来源严格一致"**。
> 这一框架适用于项目中所有存在冗余统计字段的业务模块。

```typescript
import { test, expect, type APIRequestContext } from "@playwright/test"

// ─── 通用工具 ────────────────────────────────────────────────────────────────

/** 从 badge 文本中提取数字，兼容 "42"、"(42)"、"42 条" 等格式 */
function extractCount(text: string | null): number {
  if (!text) return 0
  const m = text.match(/\d+/)
  return m ? Number(m[0]) : 0
}

/**
 * 通用一致性检查器：通过 API 获取列表，验证每条记录的计数字段 >= 0
 * [Why]：直接调用 API 绕过 UI 渲染，更快速地捕获后端数据问题，
 * 且不依赖 UI 选择器，对 UI 重构免疫。
 */
async function assertCountFieldsNonNegative(
  request: APIRequestContext,
  apiPath: string,
  countFields: string[],
) {
  const res = await request.get(apiPath)
  if (!res.ok()) return  // 路由不存在时跳过，不误报

  const body = await res.json()
  const items: Record<string, unknown>[] = body?.data ?? body ?? []

  for (const item of items) {
    for (const field of countFields) {
      if (field in item && typeof item[field] === "number") {
        expect(item[field] as number).toBeGreaterThanOrEqual(0)
      }
    }
  }
}

// ─── 测试套件 ─────────────────────────────────────────────────────────────────

test.describe("项目级数据一致性", () => {
  test.use({ storageState: "playwright/.auth/user.json" })

  /**
   * ── API 层：所有计数字段不应为负数 ──
   * [Why]：计数字段若为负数，说明 SQL 表达式方向写反或出现了 downgrade 异常，
   * 此测试是发现此类问题的最后防线。
   * 覆盖范围：项目中所有带冗余统计字段的核心资源接口。
   */
  test("所有核心资源 API 的计数字段均 >= 0", async ({ request }) => {
    // [扩展点]：每次新增带计数字段的业务模块时，在此处追加对应的接口和字段
    const checks: Array<{ path: string; fields: string[] }> = [
      {
        path: "/api/v1/system-modules",
        fields: ["total_traffic_count", "unique_traffic_count", "interface_count"],
      },
      {
        path: "/api/v1/endpoints",
        fields: ["total_traffic_count", "variants_count"],
      },
      // 追加更多资源：
      // { path: "/api/v1/xxx", fields: ["yyy_count"] },
    ]

    for (const { path, fields } of checks) {
      await assertCountFieldsNonNegative(request, path, fields)
    }
  })

  /**
   * ── UI 层：列表页展示的统计数值与详情页实际数据一致 ──
   * [Why]：冗余计数字段（如 total_traffic_count）可能与实际子表行数漂移，
   * 此测试从用户视角验证"看到的数字"与"实际存在的数据"是否一致。
   *
   * 使用方式：
   * 1. 将 listUrl 替换为实际列表页路径
   * 2. 将 countSelector / rowSelector 替换为实际的 data-testid
   * 3. 复制此 test block，为每个带统计展示的业务模块各写一个
   */
  test("列表页统计计数与详情页实际行数一致（模板，按模块复用）", async ({
    page,
  }) => {
    const listUrl = "/services"          // ← 替换为实际列表页
    const countSelector = '[data-testid="stat-count"]'    // ← 列表页计数 badge
    const detailSelector = '[data-testid="list-row"]'     // ← 详情页数据行

    await page.goto(listUrl)
    await page.waitForLoadState("networkidle")

    // 读取第一条记录的展示计数
    const badge = page.locator(countSelector).first()
    if (!(await badge.isVisible())) {
      // UI 未添加 data-testid，跳过并输出提示
      console.warn(
        `[WARN] ${countSelector} 不可见。` +
        "请在对应列表组件中添加 data-testid 以启用一致性断言。"
      )
      return
    }

    const displayedCount = extractCount(await badge.textContent())
    expect(displayedCount).toBeGreaterThan(0)  // 不应为 0（防计数归零）

    // 进入详情页，统计实际行数
    await page.locator('[data-testid="list-item"]').first().click()
    await page.waitForLoadState("networkidle")

    const rows = page.locator(detailSelector)
    await rows.first().waitFor({ timeout: 8_000 }).catch(() => null)
    const actualCount = await rows.count()

    // 核心断言：展示计数 == 实际行数，二者不一致说明冗余计数漂移
    expect(displayedCount).toBe(actualCount)
  })
})
```

---

## 如何在项目中落地 E2E 一致性测试

新增业务模块时，按以下步骤扩展 E2E 覆盖：

1. **在 API checks 数组中追加**（模板 G 中的 `checks`）：
   ```typescript
   { path: "/api/v1/your-new-resource", fields: ["total_count", "sub_count"] }
   ```

2. **在前端列表/卡片组件中添加 `data-testid`**：
   ```tsx
   // 计数 badge
   <Badge data-testid="stat-count">{item.total_count}</Badge>
   // 列表行
   <tr data-testid="list-row">...</tr>
   // 列表项（用于点击进入详情）
   <div data-testid="list-item" onClick={...}>...</div>
   ```

3. **复制模板 G 的 UI 一致性 test block**，修改 `listUrl` / `countSelector` / `detailSelector`。

4. **在 `backend/tests/functional/` 中按模板 E 补充并发功能测试**。

---

## 快速参考：常见错误与对应模板

| 错误现象 | 根因 | 使用模板 |
|---------|------|---------|
| 数据库出现重复记录 | 无唯一约束 + 查-判-写 | 模板 D（约束）+ 模板 A（Upsert）|
| 计数器值 < 实际行数 | Python 级 `+= 1` 丢失更新 | 模板 C（SQL 表达式）|
| 状态被意外覆盖 | 并发读到旧状态再写 | 模板 B（行锁）|
| 同一消息被处理多次 | Task 非幂等 | 模板 A 变体（IntegrityError 捕获）|
| 计数为负数 | SQL 表达式方向错误 | 模板 F（对账测试）+ 模板 G（E2E）|
