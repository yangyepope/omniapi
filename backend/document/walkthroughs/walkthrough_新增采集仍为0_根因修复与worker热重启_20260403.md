# [2026-04-03 06:18:23] 新增采集仍为 0：根因修复与 Worker 热重启

## 操作描述

- [x] 复核 `parafga`：`raw_flows` 已解析、`filtered_flows` 已落库，但 endpoint 统计仍为 0。
- [x] 定位根因：线上 Celery Worker 进程未加载最新修复代码（仍按旧逻辑处理新流量）。
- [x] 执行全量统计重算（非 tests 脚本）修复当前已错误数据。
- [x] 重启 `celery-worker` 容器，确保后续新采集走最新代码路径。

## 改动详情

- [x] 在线执行 SQL（一次性数据修复）
  - 重算 `apiendpoint.total_traffic_count/variants_count/last_active_at`。
  - 重算 `systemmodule.total_traffic_count/unique_traffic_count/last_active_at`。
- [x] 运维动作
  - `docker compose -f /root/security-platform/compose.yml restart celery-worker`
  - 通过 `docker compose logs` 确认 worker 已重新 ready。

## 验证结果

- [x] 修复前：`POST /parafga/resource-users/batch` 为 `0/0`，但来源事实为 `2/2`。
- [x] 修复后：`POST /parafga/resource-users/batch` 已恢复为 `2/2`。
- [x] Worker 日志显示已重启并加载任务：`process_raw_flow_task / replay_variant_task / run_security_scan_task`。

## 回滚步骤

- [x] 数据层回滚：依赖数据库备份（SQL 重算会覆盖旧脏值）。
- [x] 运行层回滚：可再次重启容器回到既有镜像进程状态（不建议回退旧逻辑）。
