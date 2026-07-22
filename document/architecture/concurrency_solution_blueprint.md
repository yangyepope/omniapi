# SecurityPlatform 高并发并发冲突终极解决方案蓝图

## 1. 核心挑战 (The Challenge)
在高并发（50/sec+）的流量采集场景下，传统的“读取-修改-写回（Read-Modify-Write）”模式会发生 **“丢失更新”**。同时，PostgreSQL 对错误事务的“严格中止”特性会导致并发探测逻辑（Auto-Discovery）引发连锁反应，使整个后台任务崩溃。

## 2. 三大核心对策 (The 3 Pillars of Solution)

### A. 原子化下沉 (Atomic Down-push)
*   **痛点**: `obj.count += 1` 在并发下会读到旧值。
*   **解法**: 
    ```sql
    UPDATE table SET count = count + 1 WHERE id = :id;
    ```
*   **原理**: 将逻辑算力从不安全的分布式 Python 内存下沉到具备行级锁保护的数据库 CPU。

### B. 事务防爆 (Non-Aborting Logic)
*   **痛点**: 并发创建 `Interface` 时，后到的 49 个线程会触发 `Unique Key Error`。在 Postgres 中，一旦事务报过错，该连接后续的所有指令都会被阻断。
*   **解法**: 
    ```sql
    INSERT INTO table (...) VALUES (...) ON CONFLICT DO NOTHING;
    ```
*   **原理**: 物理屏蔽错误产生的可能性，保持数据库连接处于健康的 `Healthy` 状态，确保后续的流量记录流程不中断。

### C. 零追踪架构 (Zero-ORM Enforcement)
*   **痛点**: SQLAlchemy 的 **Identity Map** 会自动追踪对象状态，但在高并发更新同一行时会因为“版本过期”产生异常。
*   **解法**: 使用 `session.execute(text(...))` 直接执行 SQL。
*   **原理**: 彻底放弃 ORM 的对象状态模型，将 Worker 线程转变为“无状态的 SQL 执行器”。

## 3. 并发环境下的物理一致性锁
为了解决 17 轮调试中的“表不存在”谜题，我们额外增加了物理预热阶段：
- **方案**: 在并发线程启动前，显式调用 `metadata.create_all(engine)`。
- **意义**: 保证在极短的毫秒级爆发中，所有连接都能看到完整的、已提交的表结构视图。

## 4. 总结与建议
- 在高频 IO 场景下，**Consistency（一致性）** 优于 **Convenience（开发便利性）**。
- 宁可写原生 SQL 原子操作，也绝不在并发循环中使用 ORM 进行字段累加。
```

---
*SecurityPlatform 并发对账专题组 2026-04-03*
