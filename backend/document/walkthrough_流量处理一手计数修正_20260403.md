# [2026-04-03 05:56:17] 流量处理一手计数修正记录

## 操作描述

- [x] 按需求取消“查询时纠偏”方案，回归“一手写入即正确”的设计。
- [x] 移除 `system_modules` 列表接口中的自动纠偏逻辑。
- [x] 新增 Worker 级功能测试，验证首命中与重复命中的计数由处理链路直接写对。

## 改动详情

- [x] 修改 `backend/app/api/routes/system_modules.py`
  - 删除 `_reconcile_paginated_endpoint_stats()`。
  - 删除 `get_module_endpoints()` 中的纠偏调用。
- [x] 新增 `backend/tests/functional/test_worker_counter_source_of_truth.py`
  - 构造同一路径两次流量（首命中 + 重复命中）。
  - 断言 `endpoint.total_traffic_count == 2`、`endpoint.variants_count == 1`。
  - 断言 `filtered_flows` 仅 1 条，符合去重设计。

## 验证结果

- [x] `pytest tests/functional/test_worker_counter_source_of_truth.py -q` 通过（1 passed）。
- [x] 说明统计正确性由 Worker 写入链路保障，不依赖查询接口二次修正。

## 回滚步骤

- [x] 如需回滚，恢复以下文件到变更前版本：
  - `backend/app/api/routes/system_modules.py`
  - `backend/tests/functional/test_worker_counter_source_of_truth.py`
