---
paths:
  - "backend/**"
---

# 后端踩坑清单(防复发)

> **这是一份"只增不删"的踩坑档案**:每修一个后端 bug,就把根因和防线追加到下表,
> 让 AI 编码时不再犯同样的错。`install.sh` 只在本文件不存在时播种一次,**之后由本项目自行追加,
> `--force` 也不会覆盖**(避免冲掉你积累的记录)。
>
> **写一条新坑的格式**:现象一句话 → 根因(架构级,问"为什么会发生") → 铁律(以后怎么避免,给
> ❌/✅ 或具体做法) → tripwire(可跑的检测命令 / grep 断言,让"再犯"被机器抓到,可选但强烈建议)。
> 详细沉淀规则见 `common/01-协作准则-karpathy.md` 的「Bug 修复后必须沉淀」。

---

## 索引(最新在上)

| # | 现象 | 一句话铁律 |
|---|---|---|
| B-001 | async 路由查库整站卡死 | async 路由里不碰同步 Session,没真 await 就写 `def` |
| B-002 | 并发下产生重复记录 | 禁"查-判-写",用 Upsert / 唯一约束 |

---

## B-001 · async 路由里用同步 Session,事件循环被冻结

- **现象**:某接口一慢,整个服务所有请求一起卡死(不只该接口)。
- **根因**:`async def` 路由里执行了同步阻塞调用(同步 DB Session / `requests` / `time.sleep`),
  FastAPI 信任 async 路由只做非阻塞 I/O,阻塞操作会占死事件循环,其它协程全部排队。
- **铁律**:
  ```python
  # ❌ async + 同步 Session
  @router.get("/x")
  async def x(session: SessionDep): session.exec(...)
  # ✅ 没真 await 就写同步路由(FastAPI 自动丢线程池)
  @router.get("/x")
  def x(session: SessionDep): session.exec(...)
  # ✅ 必须 await 外部服务时,同步部分裹线程池
  async def x(session: SessionDep):
      await httpx_client.get(...); await run_in_threadpool(save, session, data)
  ```
- **tripwire**:
  ```bash
  grep -rn "async def" backend/app/api/routes/*.py -A6 | grep "SessionDep" \
    && echo "❌ async 路由注入同步 Session" || echo "✅ 通过"
  ```
- 关联:`fastapi-编码最佳实践.md` §一。

## B-002 · "查-判-写"三步在并发下产生重复记录

- **现象**:两个请求/Worker 几乎同时提交,数据库里出现两条本应唯一的记录。
- **根因**:`select 查` → `if not exists 判` → `add 写` 三步之间有不可消除的并发窗口,
  两个执行流都读到 None,各自插入。
- **铁律**:业务唯一键在模型定义时就声明 `UniqueConstraint`;写入走 `INSERT ... ON CONFLICT DO NOTHING`;
  读后即改的场景用 `.with_for_update()` 行锁;计数器用 SQL 表达式 `col = col + 1`,不在 Python 层 `+= 1`。
- **tripwire**:
  ```bash
  grep -rnE "\.first\(\)|\.one_or_none\(\)" backend/app -A3 | grep -B3 "session.add" \
    && echo "⚠ 疑似查-判-写,逐一核对" || echo "✅ 未发现明显模式"
  ```
- 关联:`数据库并发安全.md`。

---

<!-- 新坑从这里往下追加,并在上面「索引」补一行 -->
