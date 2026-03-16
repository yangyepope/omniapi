---
name: "pydantic-validator"
description: "后端 Pydantic/FastAPI schema 校验规范：入参/出参模型、字段约束、校验与容错、版本迁移（适用于 backend/**）。"
---

# SKILL：Pydantic 校验规范（Trae）

【定位】这是 Trae Skill，用于后端接口与数据模型的校验规则，避免字段随手改导致接口悄悄坏。

## 何时触发

- 新增/修改 FastAPI 路由的 request/response schema
- 新增/修改 Pydantic/SQLModel 模型字段、校验器、第三方响应解析

## 强制规则（必须遵守）

### 1) 入参/出参模型

- FastAPI 路由必须显式声明 `response_model`（除非明确不需要返回结构约束）。
- request body 必须使用 Pydantic Model（不要用 `dict[str, Any]` 直接裸接）。
- 对外响应必须稳定：字段名、类型、可选性要明确，避免同字段返回 str/obj 混用。

### 2) 字段定义

- 对外核心字段必须写清楚：`Field(..., description="...")`。
- 能枚举的字段用 `Literal[...]` 或 Enum，减少“任意字符串”导致的脏数据。
- 对外返回尽量避免上游原始字段透传；需要映射时写注释说明映射规则与兼容性。

### 3) 校验与容错

- 需要格式化/清洗：使用 `field_validator`（Pydantic v2）并写明：
  - 允许的输入格式
  - 失败时如何处理（抛错/返回 None/回退默认值）
- 对第三方响应解析：优先使用结构校验（如 `model_validate`）；若上游结构不稳定，采用“最小必要字段校验 + 容错提取”，并在注释中说明原因与风险。

### 4) 版本与迁移（字段变更时必须写清）

- 对外接口字段变更（改名/类型变化/必填变化）必须在注释中说明兼容策略：
  - 是否保留旧字段（deprecated）
  - 是否提供 alias（如 `Field(validation_alias=...)`）
  - 是否需要调用方同步升级

### 5) 禁止项

- 禁止在对外 schema 中返回 `Any`（除非明确是透传容器，并写清结构）。
- 禁止把异常对象/traceback 放进响应模型字段。
- 禁止把敏感字段（token/secret/password/connection string）放进响应模型或示例中。

