# OmniAPI 高并发统计对账技术复盘报告

## 1. 背景描述
在 OmniAPI 流量采集系统中，我们模拟了瞬时洪峰场景：**50 个线程在毫秒级并发处理同一个新发现接口的流量采样**。
- **目标**: 确保最终 `total_traffic_count` 准确等于 50，且 `unique_traffic_count` 等于 1。
- **现实**: 早期版本在并发下计数器仅显示为 1 到 7 之间的随机数，甚至发生数据清零。

---

## 2. 三大根因分析 (The Three Killers)

### 2.1 丢失更新 (Lost Updates) - Python 层的原罪
- **现象**: 并发 50，结果仅为 1。
- **根因**: 系统在 Python 层面执行 `count = endpoint.total_count; endpoint.total_count = count + 1`。
- **逻辑**: 多个线程同时读取到旧值 0，各自算出 1，先后写回。最终数据库只记住了最后一次写入的 1，其余 49 次更新被物理覆盖。

### 2.2 事务中止 (Transaction Abort) - PostgreSQL 的隐形陷阱
- **现象**: 报错 `current transaction is aborted` 或后续写入莫名失败。
- **根因**: 在高并发下，所有线程同步尝试创建同一个 `ApiEndpoint`。1 个线程成功，49 个线程触发 `Unique Key Violation (IntegrityError)`。
- **死结**: 在 PostgreSQL 中，一旦事务内产生任何 Error（即使被 Python `try...except` 捕捉），该数据库连接的连接状态立即变为“已死（POISONED）”，后续所有 SQL 指令都会被忽略直到事务回滚。

### 2.3 标识映射冲突 (Identity Map Stale) - ORM 的副作用
- **现象**: 抛出 `StaleDataError`。
- **根因**: SQLAlchemy 会在 Session 内存中缓存对象。当线程 A 更新了行，线程 B 手中的缓存对象就变脏了。Session 检测到这种冲突后会强制阻断提交，保证数据完整性，但也导致了并发处理失败。

---

## 3. 17 轮修改为何屡屡受挫？(The 17-Round Struggle)

### 第 1-5 轮：试图通过 `session.refresh()` 修复
- **失败原因**: 并发实在太快。刚 refresh 完，下一行代码执行前，数据又被其他线程改了。

### 第 6-10 轮：转向原子 SQL (`UPDATE ... +1`)
- **进展**: 解决了计数归零，但遇到了**事务毒化**。由于 `find_or_create` 逻辑中依然会产生报错，导致事务频繁中止，后续的 `FilteredFlow` 采样根本存不进去。

### 第 11-15 轮：引入 `ON CONFLICT DO NOTHING`
- **进展**: 解决了事务中止问题。但遇到了**物理表名可见性问题**。
- **失败原因**: 新增的 `FilteredFlow` 表没有运行 Alembic 迁移，而是由测试脚本动态调用 `create_all()`。在高并发线程启动的一瞬间，部分线程连接到的 DB 视图里“表还没长出来”。

### 第 16-17 轮：锁定物理真相
- **现状**: 我们发现 Docker 容器内的环境与宿主机 `uv run` 环境存在连接池隔离。虽然已经实现了最高等级的“事务防爆 SQL”，但受限于测试脚本与 Worker 容器的同步机制，100% 同步仍需进一步的环境对齐。

---

## 4. 终极防御逻辑 (Final Hardening)

目前的 `worker.py` 采用了最硬核的 **“物理防爆原子版”**：
1. **原子自增**: `UPDATE ... SET count = count + 1`（将锁交给数据库）。
2. **事务防爆**: 所有创建操作均带 `ON CONFLICT DO NOTHING`（确保 Connection 永远不中止）。
3. **零追踪**: 弃用 `session.add(obj)`，全面改用底层 `session.execute(text(...))` 绕过状态检测。
4. **物理对齐**: 压测前强制同步执行 `metadata.create_all()`。

## 5. 后续重构建议
- **计数解耦**: 考虑在高并发场景下使用 Redis `INCR` 缓冲计数，再定时刷回 DB。
- **任务合并**: 流量采样可以在摄入层进行简单的 Hash 过滤，减少下游事务锁的频率。

---
*OmniAPI 技术委员会 2026-04-03*
