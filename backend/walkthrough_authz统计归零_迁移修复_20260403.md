# [2026-04-03 06:06:03] authz 统计归零迁移修复记录

## 操作描述

- [x] 现场核验 `authz` 模块：`FilteredFlow` 有数据，但 `ApiEndpoint.total_traffic_count/variants_count` 仍为 0。
- [x] 按“非脚本”要求采用正式迁移修复历史数据，不通过 `tests/scripts` 回填。
- [x] 保持运行时由 `worker` 一手统计写入，迁移仅做一次性历史纠偏。

## 改动详情

- [x] 新增 Alembic 迁移：`backend/app/alembic/versions/f6a1c2d3e4b5_rebuild_endpoint_and_module_counters_from_filteredflow.py`
  - 以 `filtered_flows` 重算 `apiendpoint`：
    - `total_traffic_count = count(filtered_flows) + sum(variant_count)`
    - `variants_count = count(filtered_flows)`
    - `last_active_at = max(captured_at)`
  - 以 `apiendpoint` 聚合重算 `systemmodule`：
    - `total_traffic_count = sum(endpoint.total_traffic_count)`
    - `unique_traffic_count = sum(endpoint.variants_count)`
    - `last_active_at = max(endpoint.last_active_at)`
  - 对无关联数据记录置零，避免保留旧脏值。
- [x] 执行 `alembic upgrade head`，迁移成功。

## 验证结果

- [x] `authz` 两条接口从 0 恢复到真实值：
  - `/authz/api/v1/permission-check/logs/by-user` -> `stored: 1 1`
  - `/authz/api/v1/permission-check/logs/page` -> `stored: 1 1`
- [x] 运行时链路回归测试仍通过：
  - `pytest tests/functional/test_worker_counter_source_of_truth.py -q` -> `1 passed`

## 回滚步骤

- [x] 若需回滚代码层面，可回滚迁移文件：
  - `backend/app/alembic/versions/f6a1c2d3e4b5_rebuild_endpoint_and_module_counters_from_filteredflow.py`
- [x] 数据回滚需依赖数据库备份（该迁移为数据修复，`downgrade` 不恢复旧脏值）。
