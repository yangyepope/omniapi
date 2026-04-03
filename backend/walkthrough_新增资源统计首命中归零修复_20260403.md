# [2026-04-03 06:11:40] 新增资源统计首命中归零修复

## 操作描述

- [x] 复核 `resource` 模块：`RawFlow.parsed=true` 且 `FilteredFlow` 有数据，但 endpoint 统计仍为 0。
- [x] 定位根因：Worker 在唯一流量分支重算前未 flush，导致首次命中重算读不到新插入的 `FilteredFlow`。
- [x] 修复业务代码并补回归测试，确保“首命中即为 1”。
- [x] 对已受影响的现存数据执行一次性 SQL 重算，立即恢复页面展示。

## 改动详情

- [x] 修改 `backend/app/worker.py`
  - 在唯一流量分支新增 `session.flush()`，确保重算前事务内可见。
- [x] 修改 `backend/tests/functional/test_worker_counter_source_of_truth.py`
  - 新增 `test_worker_should_set_count_to_one_on_first_unique_hit` 覆盖首命中场景。
- [x] 执行一次性 SQL 重算（在线命令）修复现存错误计数。

## 验证结果

- [x] 测试通过：`pytest tests/functional/test_worker_counter_source_of_truth.py -q` -> `2 passed`。
- [x] `resource` 模块计数恢复：
  - `/resource/agent/page` -> `3/3`
  - `/resource/api/page` -> `1/1`
  - `/resource/dataset/page` -> `1/1`
  - `/resource/llm/page` -> `1/1`
  - `/resource/mcp/page` -> `3/3`
  - `/resource/resource-group/page` -> `1/1`

## 回滚步骤

- [x] 代码回滚：
  - `backend/app/worker.py`
  - `backend/tests/functional/test_worker_counter_source_of_truth.py`
- [x] 数据回滚：需依赖数据库备份（在线 SQL 重算会覆盖旧脏值）。
