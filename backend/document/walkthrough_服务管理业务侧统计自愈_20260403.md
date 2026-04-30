# [2026-04-03 05:53:06] 服务管理业务侧统计自愈修复记录

## 操作描述

- [x] 根据反馈补充“业务代码级”防线，不仅依赖测试脚本修复数据。
- [x] 在服务管理接口列表返回前，对当前页 Endpoint 做统计对账与自动纠偏。
- [x] 验证即使人为将计数字段改为 0，接口访问后也会自动恢复正确统计。

## 改动详情

- [x] 修改 `backend/app/api/routes/system_modules.py`
  - 新增 `_reconcile_paginated_endpoint_stats()`：
    - 聚合 `FilteredFlow` 真实数据。
    - 统一口径 `total = count(filtered_flows) + sum(variant_count)`。
    - 统一口径 `variants = count(filtered_flows)`。
    - 检测到漂移时自动写回并提交。
  - 在 `get_module_endpoints()` 中分页后调用上述纠偏函数，确保页面展示可靠。

## 验证结果

- [x] 人工将 3 条 `config` 端点统计重置为 0 后，调用自愈函数自动恢复。
- [x] 验证输出：
  - `/config/api/v1/configuration/page` -> `total_traffic_count=2`, `variants_count=1`
  - `/config/api/v1/openapi/api/page` -> `total_traffic_count=1`, `variants_count=1`
  - `/config/api/v1/openapi/client/page` -> `total_traffic_count=1`, `variants_count=1`

## 回滚步骤

- [x] 回滚单文件即可恢复旧行为：
  - `backend/app/api/routes/system_modules.py`
