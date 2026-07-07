# 2026-04-05 修复接口详情页“剔重后流量”显示 0 的问题

## 现象 (Symptom)
在接口中心（System Modules）进入某个接口详情页时，顶部的指标卡片显示：
- **原始总流量 (Units Captured)**: 124 （显示正常）
- **剔重后流量 (Unique Samples)**: 0 （异常显示为 0）

## 调查 (Investigation)
1. **API 审计**: 调用 `/api/v1/system-modules/{mid}/endpoints/{eid}`，发现 `total_traffic_count` 和 `dedup_traffic_count` 返回值确实为 0。
2. **数据库核验**: 
   - `ApiEndpoint` 表中的 `total_traffic_count` 和 `unique_traffic_count` 字段值正常（如 124, 1）。
   - `FilteredFlow` 表针对该 `endpoint_id` 可能由于采样策略或清理机制暂时为空。
3. **逻辑定位**: 
   - 后端 `get_module_endpoint_detail` 采用实时聚合查询 `FilteredFlow` 表。
   - 当 `FilteredFlow` 中没有记录时，`count()` 返回 0，`sum()` 返回 null，导致返回给前端的聚合值为 0。

## 根因 (Root Cause)
- **统计源不一致**: 系统存在两套统计口径：一套是 Worker 实时更新到 `ApiEndpoint` 表的持久化计数，另一套是 API 实时从 `FilteredFlow` 聚合的计数。
- **缺乏兜底机制**: 当 `FilteredFlow`（作为样本库）尚未填充或被清理时，实时聚合会失效，而此时应以 `ApiEndpoint` 的元数据计数为准。

## 修复 (The Fix)
### 后端逻辑加固 (Backend)
- **查询优化**: 将 `func.count()` 明确为 `func.count(FilteredFlow.id)`。
- **引入 Fallback 机制**: 
  - 在 `app/api/routes/system_modules.py` 中，计算出实时聚合值后，增加逻辑判断。
  - 若 `recalculated_count == 0` 且 `endpoint.unique_traffic_count > 0`，则返回持久化字段的值。
  - 该逻辑同时应用于总流量与剔重流量。

## 验证 (Proof)
1. **接口测试**: 找一个 `FilteredFlow` 为空的接口，查看详情。指标卡现在正确显示元数据中的统计值（非 0）。
2. **逻辑一致性**: 当新流量进来产生 `FilteredFlow` 记录后，实时聚合值将大于 0，此时返回更精确的实时统计值，逻辑平滑切换。
