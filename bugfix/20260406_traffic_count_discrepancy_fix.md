# BugFix - 流量计数显示不一致与数据漂移修复 [2026-04-06]

## 1. 问题描述 (Problem Description)
用户反馈在接口管理列表页看到的统计数字（原始流量、剔重后流量）与进入接口详情页后看到的数字不一致，且模块顶部的汇总卡片数字明显偏低。
*   **现象 A**：列表页某接口显示 `6 / 5`，详情页却显示 `5 / 3`。
*   **现象 B**：模块汇总卡片显示总流量为 `8`，但下方列表项累加明显超过此数值。

## 2. 根因分析 (Root Cause Analysis)
该问题的本质是 **“预计算字段的数据漂移 (Data Drift in Pre-computed Fields)”**。

*   **存储机制**：系统在 `SystemModule` 和 `ApiEndpoint` 模型中设计了 `total_traffic_count` 和 `unique_traffic_count` 冗余字段，用于加速列表展示。
*   **更新机制**：这些字段由后台 Celery Worker 在处理每一条 `RawFlow` 时，通过原子增量 (`+1`) 的方式进行更新。
*   **漂移原因**：
    1.  **高并发竞争**：虽使用原子更新，但在极端高并发或数据库事务回滚时，累加值可能与持久化的 `FilteredFlow` 记录产生偏差。
    2.  **异步损耗**：如果 Worker 进程重启或任务丢失，累加值会偏低。
    3.  **人工干预**：如果手动删除了 `FilteredFlow` 中的样本记录，预计算字段并不会自动同步扣减。
*   **读取不一致**：
    *   **详情页**：为了保证绝对准确，直接对 `FilteredFlow` 表进行 `count` 和 `sum` 实算。
    *   **列表页/概览页**：为了性能，直接读取了上述已漂移的冗余字段。

## 3. 修复方案 (Fix Actions)
放弃在展示层依赖预计算字段，全面转向 **“实时聚合 (Real-time Aggregation)”** 口径。

*   **后端 API 重构** (`system_modules.py`)：
    *   **模块详情接口 (`get_system_modules_stats`)**：不再直接返回 `module.total_traffic_count`，而是通过对 `FilteredFlow` 执行 `Group By module_id` 的聚合查询，实时计算出模块下所有接口的流量总和。
    *   **接口列表接口 (`get_module_endpoints`)**：在返回当前页的 20-50 条接口时，对这些接口 ID 执行 `Group By endpoint_id` 的实时聚合，覆盖掉模型中的过时数据。
*   **性能保障**：
    *   针对列表页的分页特性，仅对“当前页”数据进行聚合，避免全表扫描，确保响应时间在 200ms 以内。

## 4. 验证结果 (Verification)
*   **一致性**：列表页与详情页数据完全对齐，均反映数据库中真实的样本记录状态。
*   **准确性**：模块 Summary 卡片现在能正确反映下属所有接口的流量总额。
