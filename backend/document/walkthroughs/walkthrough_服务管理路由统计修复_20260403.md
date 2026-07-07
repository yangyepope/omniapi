# [2026-04-03 05:47:30] 服务管理路由统计修复记录

## 操作描述

- [x] 修复 Endpoint 统计回填口径：统一为 `total = unique_count + duplicate_count`。
- [x] 复用同一统计函数到热修复脚本，避免多脚本口径不一致。
- [x] 新增功能测试，覆盖“首命中必须计入总流量”场景。
- [x] 执行脚本回填并验证 `config` 3 条路径计数恢复。

## 改动详情

- [x] 更新 `backend/tests/scripts/backfill_endpoint_stats.py`
  - 新增 `calculate_endpoint_stats()` 统一统计函数。
  - 修复总流量计算逻辑，避免只汇总 `variant_count` 导致归零。
  - 清理重复日志输出，补充文件头与函数级中文说明。
- [x] 更新 `backend/tests/scripts/sync_traffic_stats_hotfix.py`
  - 复用 `calculate_endpoint_stats()`，同步修复 total/variants/last_active。
  - 保持热修复脚本与 Worker 计数口径一致。
- [x] 新增 `backend/tests/functional/test_endpoint_counter_formula.py`
  - 验证 `total == count(filtered_flows) + sum(variant_count)`。
  - 验证 `variants_count == count(filtered_flows)`。

## 验证结果

- [x] `pytest tests/functional/test_endpoint_counter_formula.py -q` 通过（1 passed）。
- [x] 执行 `uv run python tests/scripts/sync_traffic_stats_hotfix.py` 后，11 个端点完成修复。
- [x] 抽样核验：
  - `/config/api/v1/configuration/page` -> `total_traffic_count=1`
  - `/config/api/v1/openapi/api/page` -> `total_traffic_count=1`
  - `/config/api/v1/openapi/client/page` -> `total_traffic_count=1`

## 回滚步骤

- [x] 如需回滚代码，恢复以下文件到变更前版本：
  - `backend/tests/scripts/backfill_endpoint_stats.py`
  - `backend/tests/scripts/sync_traffic_stats_hotfix.py`
  - `backend/tests/functional/test_endpoint_counter_formula.py`
- [x] 如需回滚数据，需根据备份恢复 `apiendpoint` 统计字段（或重新执行旧口径脚本，不推荐）。
