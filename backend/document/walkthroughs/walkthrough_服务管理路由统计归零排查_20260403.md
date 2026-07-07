# [2026-04-03 05:40:51] 服务管理路由统计归零排查记录

## 操作描述

- [x] 研读 `/plan`、`/tdd`、`db-concurrency-guard` 技能文档，建立排查约束。
- [x] 只读定位“采集/归一化/统计展示”链路，不修改业务逻辑代码。
- [x] 执行数据一致性核验，验证“有流量记录但 endpoint 统计为 0”的异常样本。
- [x] 执行 TDD 红灯验证（先失败测试），确认当前行为不符合预期。

## 改动详情

- [x] 新增规划文档：`document/20260403_服务管理路由统计归零排查_plan.md`
- [x] 新增本次排查日志：`backend/walkthrough_服务管理路由统计归零排查_20260403.md`
- [x] 未改动任何生产业务代码（后端路由/服务/模型逻辑保持原样）

## 验证结果

- [x] 红灯断言失败，命中目标路径：
  - `POST /config/api/v1/configuration/page`
  - `POST /config/api/v1/openapi/api/page`
  - `POST /config/api/v1/openapi/client/page`
- [x] 对账特征一致：`apiendpoint.total_traffic_count == sum(filtered_flows.variant_count) == 0`，但 `count(filtered_flows) > 0`
- [x] 初步结论：计数口径被错误对齐到 `sum(variant_count)`，导致单次命中的路径统计归零

## 回滚步骤

- [x] 本次仅新增文档文件，无业务代码变更
- [x] 如需回滚，仅删除本次新增文档即可：
  - `document/20260403_服务管理路由统计归零排查_plan.md`
  - `backend/walkthrough_服务管理路由统计归零排查_20260403.md`
