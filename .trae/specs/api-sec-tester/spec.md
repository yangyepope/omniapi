# API Security Testing Platform Spec

## Why
目前系统已经能通过 Nginx 镜像流量成功在 `/v1/collect` 接口接收到全量原始请求。为了实现自动化的安全测试，我们需要基于这些被动收集到的真实流量，动态推导出 API 资产清单（接口结构、参数、Headers等），并构建一套系统：该系统不仅能管理这些发现的 API 资产，还能基于这些接口结构生成恶意的 Payload（如 SQL 注入、XSS、越权等），然后主动向原始上游目标发起重放安全测试。

## What Changes
- **API 资产收集引擎**: 修改 `collect_traffic` 逻辑，将原始流量解析、去重，并推导出 API Endpoint（例如将相似的请求聚合为一个 API 资产模型）。
- **数据库设计**: 引入 `ApiEndpoint`（接口字典模型）和 `SecurityTask`（安全测试任务模型）、`SecurityReport`（测试结果模型）。
- **安全 Payload 生成器**: 在服务层实现一个基础的 Payload 替换逻辑，能够将推导出的参数（Query, Body, Path）替换为常见的安全测试 Payload。
- **发包测试引擎**: 使用 `httpx` 等异步客户端，实现主动向下游/上游目标重放带有恶意 Payload 的请求，并记录其响应状态和内容以判断是否存在漏洞。
- **管理 API 与页面**: 开发用于查看 API 资产列表、下发安全测试任务、查看漏洞报告的前后端接口与页面。

## Impact
- Affected specs: 流量收集流程、数据库 Schema、安全测试执行引擎。
- Affected code:
  - `backend/app/api/routes/collect.py` (新增推导与聚合逻辑)
  - `backend/app/models.py` (新增 API 资产与任务模型)
  - `backend/app/services/security_tester.py` (新增核心发包测试引擎)
  - `backend/app/api/routes/` (新增资产管理与测试任务下发接口)

## ADDED Requirements
### Requirement: API 资产被动收集与去重
The system SHALL aggregate incoming raw traffic into structured `ApiEndpoint` assets.

#### Scenario: Success case
- **WHEN** multiple mirror traffics hit `/v1/collect` for `/api/v1/users/123` and `/api/v1/users/456`
- **THEN** the system normalizes the URI, extracts parameter schemas, and upserts a single `ApiEndpoint` record for `GET /api/v1/users/{id}`.

### Requirement: 恶意 Payload 注入与主动重放
The system SHALL be able to inject malicious payloads into an `ApiEndpoint` and replay the request against a target host.

#### Scenario: Success case
- **WHEN** a user triggers a security test on an `ApiEndpoint`
- **THEN** the system replaces original parameters with test payloads (e.g., `' OR 1=1--`), sends the HTTP request, and records the target's response behavior.

### Requirement: 漏洞发现与报告
The system SHALL analyze the response of the replay requests to identify potential vulnerabilities.

#### Scenario: Success case
- **WHEN** the replay response contains SQL error messages or unexpectedly returns 200 OK for a bypassed auth test
- **THEN** the system flags it as a vulnerability and saves it to a `SecurityReport`.
