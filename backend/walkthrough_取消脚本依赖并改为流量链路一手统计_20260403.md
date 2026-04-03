# [2026-04-03 06:01:52] 取消脚本依赖并改为流量链路一手统计

## 操作描述

- [x] 按反馈将统计正确性彻底收敛到流量处理 Worker 链路，不再依赖脚本口径。
- [x] 删除测试中对 `tests/scripts` 的函数依赖，避免“脚本逻辑反向影响业务验证”。
- [x] 保留并执行 Worker 回归测试，验证“流量到达即统计正确”。

## 改动详情

- [x] 修改 `backend/app/worker.py`
  - 新增 `reconcile_endpoint_stats_from_source()`：锁行 + 聚合 `FilteredFlow` 重算 endpoint。
  - 新增 `reconcile_module_stats_from_source()`：锁行 + 聚合 endpoint 重算 module。
  - 在 `process_raw_flow_task()` 的唯一分支与重复分支统一调用上述重算函数。
  - 结果：统计正确性由流量处理链路直接保证，不需要查询侧纠偏或脚本回填。
- [x] 删除 `backend/tests/functional/test_endpoint_counter_formula.py`
  - 原因：该测试依赖 `tests/scripts/backfill_endpoint_stats.py`，与“去脚本依赖”目标冲突。

## 验证结果

- [x] `pytest tests/functional/test_worker_counter_source_of_truth.py -q` 通过（1 passed）。
- [x] 结论：业务代码在处理流量时已直接写入正确统计，符合“开发逻辑前置保障”。

## 回滚步骤

- [x] 回滚以下文件即可恢复此前实现：
  - `backend/app/worker.py`
  - `backend/tests/functional/test_endpoint_counter_formula.py`（若需恢复）
