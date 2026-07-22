# Plan: API Security Testing Platform 执行方案

## 1. 现状分析 (Current State Analysis)
- **输入**: 用户要求执行 `\root\security-platform\.trae\specs\api-sec-tester\tasks.md` 中定义的任务。
- **现有代码**: 
  - 数据模型基于 `SQLModel`，位于 `backend/app/models.py`。
  - 流量收集入口在 `backend/app/api/routes/collect.py`，目前仅记录日志。
  - 数据库迁移使用 Alembic。
- **关键决策**: 用户选择了 **Celery + Redis** 作为异步处理机制，以应对高并发的流量收集和重度的安全扫描任务。

## 2. 方案设计 (Proposed Architecture & Implementation)

因为引入了 Celery + Redis，整个执行计划需要增加中间件的配置环节，并将流量分析和安全扫描剥离到 Celery Worker 中执行。

### 架构流转：
1. **流量收集**: Nginx -> `/v1/collect` -> 发送 Celery 任务 -> 立即返回 204。
2. **资产推导 (Celery Worker)**: 消费任务 -> 去重/归一化 -> 存入 `ApiAsset`。
3. **扫描触发**: 管理员调用 `/api/v1/scan/start` -> 创建 `SecurityTestTask` -> 发送 Celery 扫描任务。
4. **安全扫描 (Celery Worker)**: 消费任务 -> 组装 Payload 发送请求 -> 分析响应 -> 存入 `SecurityTestReport`。

## 3. 实施步骤 (Execution Steps)

### 步骤 0: 基础设施配置 (Infrastructure - 新增)
- 修改 `compose.yml` 和 `compose.override.yml`，增加 `redis` 服务。
- 增加一个 `celery-worker` 服务（基于 backend 镜像，运行 celery 启动命令）。
- 在 `backend/app/core/config.py` 中增加 Redis/Celery 相关的环境变量配置。
- 在项目中初始化 Celery 实例。

### 步骤 1: 核心数据模型设计 (Data Models)
- 在 `backend/app/models.py` 新增 `ApiAsset`, `SecurityTestTask`, `SecurityTestReport` 模型。
- 生成并应用 Alembic 迁移脚本。

### 步骤 2: 流量资产推导引擎 (Asset Discovery)
- 开发 `backend/app/services/discovery.py`，实现 URI 归一化（将 `/users/123` 转为 `/users/{id}`）。
- 编写 Celery Task: `process_mirror_traffic_task`。
- 更新 `collect.py`，调用 `process_mirror_traffic_task.delay()` 异步处理流量。

### 步骤 3: 安全测试执行引擎 (Security Test Engine)
- 开发 `backend/app/services/payloads.py`，提供 SQLi, XSS 等 Payload。
- 开发 `backend/app/services/scanner.py`，使用 `httpx` 发起注入请求并研判响应。
- 编写 Celery Task: `run_security_scan_task`。

### 步骤 4: 管理 API 开发 (Admin APIs)
- 在 `backend/app/api/routes/audit_logs.py` (或重命名为 `sec_assets.py`) 开发管理接口：
  - `GET /api/v1/assets`
  - `POST /api/v1/scan/start`
  - `GET /api/v1/scan/reports`

## 4. 验证步骤 (Verification)
1. 确保 `docker compose up -d` 能够成功拉起 `redis` 和 `celery-worker`。
2. 模拟发送镜像流量，验证 `ApiAsset` 库中是否生成了归一化的接口资产。
3. 调用 `/api/v1/scan/start`，观察 Celery Worker 日志是否成功发起安全扫描请求，并在数据库中生成 `SecurityTestReport`。
