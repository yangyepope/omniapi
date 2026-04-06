# [Plan] 重放历史后端同步与持久化方案

## 现状分析 (Analysis)
目前 `HistoryTimeline` 前端组件已就绪，但后端持久化存在缺失：
1.  **UI 直接执行 (Synced Replay)**: 调用 `ReplayEngine.execute_variant`，仅更新 `Variant` 表的最新结果字段，**未向 `ReplayResult` 表插入审计记录**。
2.  **离线任务执行 (Async Worker)**: 由 Celery 驱动，已在 `worker.py` 中实现了 `ReplayResult` 记录。
3.  **结果差异**: 用户在 UI 端点击“Quick Replay”后，刷新“History”页签可能看不到新增记录。

## 实施方案 (Implementation)
1.  **逻辑下沉 (Refactor)**: 
    *   将 `worker.py` 中的记录逻辑迁移至 `app/services/replay.py` 的 `execute_variant` 方法中。
    *   使 `worker.py` 复用 `ReplayEngine` 的逻辑，消除双轨制偏差。
2.  **原子性保证**: 保证变体状态更新与历史记录插入在同一个 DB Transaction 中完成。
3.  **覆盖范围**: 同时支持 `variant` 和 `flow` (Baseline) 的历史记录持久化。

## 验证手段 (Verification)
- 调用 API 触发重放，查询 `replay_results` 表确认数据行已生成。
- 前端测试：点击重放后，确认 History Table 实时增加一条记录。
