# Trae 项目规则（OmniAPI）

本文件用于 Trae 的“规则（Rules）”。目标是：在不依赖 Cursor 的前提下，让 Trae 在本仓库里稳定按约定工作，并按任务类型自动选用合适的 Skills。

## 1) 默认行为（P0，始终生效）

- 只要涉及“新增/修改代码或配置”，默认启用并遵守 `global-commenter`：输出详细中文注释与说明，且不泄露任何密钥/Token/连接串等敏感信息。
- 你可以明确要求“不要注释/保持无注释”，此时允许跳过注释类要求。

## 2) 后端开发模式（P1，backend/**）

当正在处理 `backend/**` 相关任务（路由/依赖/服务/第三方调用/Schema/配置/Dockerfile）时，除 P0 外，优先遵守并应用以下 Skills：

- `backend-standards`：后端注释模板、复杂逻辑行内解释、新增文件头说明、配置与 Dockerfile 说明
- `pydantic-validator`：Pydantic/FastAPI schema 校验规范（入参/出参、字段约束、容错、迁移）
- `error-handler-standard`：错误分类、HTTPException 使用、对外返回一致性、安全不泄露堆栈

## 3) 逐行注释（按需）

只有当用户明确要求“逐行加注释/每行解释/只加注释不改逻辑”时，才使用 `line-commenter`。

## 4) 交付总结（按需）

当用户要求“你改了什么/为什么/怎么验证/怎么回滚”，或需要提交清晰变更记录时，使用 `work-reporter`。

## 5) 文件型任务（按需）

当输入/输出以文件为主时，按文件类型使用对应 Skill：

- `.pdf` → `pdf`
- `.docx` → `docx`
- `.pptx` → `pptx`
- `.xlsx/.csv` → `xlsx`

## 6) 冲突处理原则

- 安全与隐私要求优先级最高：任何情况下不输出真实密钥/Token/连接串，不对外返回内部堆栈。
- 若不同规则/技能建议冲突，以“更安全、更可维护、更少破坏对外接口兼容性”的方案为准。

