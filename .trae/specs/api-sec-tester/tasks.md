# Tasks

- [ ] Task 1: 核心数据模型设计 (Data Models)
  - [ ] SubTask 1.1: 在 `backend/app/models.py` 新增 `ApiAsset` 模型（Method, URI_Pattern, Params_Schema, Header_Schema）。
  - [ ] SubTask 1.2: 新增 `SecurityTestTask` 和 `SecurityTestReport` 模型。
  - [ ] SubTask 1.3: 运行 Alembic 生成迁移脚本并应用。

- [ ] Task 2: 流量资产推导引擎 (Asset Discovery Engine)
  - [ ] SubTask 2.1: 在 `backend/app/services/discovery.py` 实现流量去重与参数推导逻辑（如将 `/api/1` 和 `/api/2` 归一化为 `/api/{id}`）。
  - [ ] SubTask 2.2: 更新 `collect.py`，将收集到的流量异步发送给 Discovery 引擎存入 `ApiAsset` 库。

- [ ] Task 3: 安全测试执行引擎 (Security Test Engine)
  - [ ] SubTask 3.1: 在 `backend/app/services/payloads.py` 中内置基础字典（SQLi, XSS, Path Traversal 等）。
  - [ ] SubTask 3.2: 在 `backend/app/services/scanner.py` 中实现重放逻辑，使用 `httpx` 异步并发发送 Payload 注入后的请求。
  - [ ] SubTask 3.3: 实现基于正则或状态码的简单漏洞响应研判规则，将结果存入 `SecurityTestReport`。

- [ ] Task 4: API 接口与管理后台对接 (Admin APIs)
  - [ ] SubTask 4.1: 开发 `/api/v1/assets` 接口查询收集到的 API 列表。
  - [ ] SubTask 4.2: 开发 `/api/v1/scan/start` 接口用于对指定资产发起扫描任务。
  - [ ] SubTask 4.3: 开发 `/api/v1/scan/reports` 接口查询漏洞扫描结果。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1], [Task 2], [Task 3]
