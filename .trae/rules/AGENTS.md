# Trae 项目规则（OmniAPI）

本文件用于 Trae 的“规则（Rules）”。目标是：在不依赖 Cursor 的前提下，让 Trae 在本仓库里稳定按约定工作，并按任务类型自动选用合适的 Skills。

## 1) 默认行为（P0，始终生效）

- 只要涉及“新增/修改代码或配置”，默认启用并遵守 `global-commenter`：输出详细中文注释与说明，且不泄露任何密钥/Token/连接串等敏感信息。
- 你可以明确要求“不要注释/保持无注释”，此时允许跳过注释类要求。
- 只要你使用了 `/plan` 命令，或者在进行问答讨论，必须触发 `document-logger` 技能，自动将计划或有价值的对话记录保存至 `.trae/documents/` 目录下。
- 只要收到新的“需求描述”，强制应用 `03-架构设计与需求分析.md` 规则进行“先问后写”及“多维度拆解”分析，并在写代码前列出盲点。

## 2) 后端开发模式（P1，backend/**）

当正在处理 `backend/**` 相关任务（路由/依赖/服务/第三方调用/Schema/配置/Dockerfile）时，除 P0 外，优先遵守并应用以下 Skills 及架构规则：

- **遵守高级架构铁律**：强制执行 `03-架构设计与需求分析.md` 中的要求（Clean Architecture、Pydantic v2、全局异常处理等）。
- `backend-standards`：后端注释模板、复杂逻辑行内解释、新增文件头说明、配置与 Dockerfile 说明
- `pydantic-validator`：Pydantic/FastAPI schema 校验规范（入参/出参、字段约束、容错、迁移）
- `error-handler-standard`：错误分类、HTTPException 使用、对外返回一致性、安全不泄露堆栈

## 3) 专家化身模式（按需）

通过特定的 Prompt，可以引导 AI 进入以下高阶审计模式（详见 `03-架构设计与需求分析.md`）：
- **架构审核员** (Architect Reviewer)：检查代码是否违背 SOLID 原则和解耦设计。
- **安全卫士** (Security Guard)：审计 FastAPI 的安全特性、注入风险及越权问题。
- **性能优化专家** (Performance Optimizer)：分析 N+1 问题、缓存引入和查询优化。
- **需求分析与设计专家**：
  - **压力测试员** (The Stress Tester)：寻找逻辑漏洞，评估高并发、服务抖动等极端场景下的表现。
  - **未来演进预测专家** (Future-Proofing Expert)：评估模型与 API 设计的扩展性（如百倍增长、多租户支持）。
  - **极致 DX 审计员** (DX Auditor)：提升工程美感，审查报错清晰度、Traceback 和 API 文档直观性。

## 4) 逐行注释（按需）

只有当用户明确要求“逐行加注释/每行解释/只加注释不改逻辑”时，才使用 `line-commenter`。

## 5) 交付总结（按需）

当用户要求“你改了什么/为什么/怎么验证/怎么回滚”，或需要提交清晰变更记录时，使用 `work-reporter`。

## 6) 文件型任务（按需）

当输入/输出以文件为主时，按文件类型使用对应 Skill：

- `.pdf` → `pdf`
- `.docx` → `docx`
- `.pptx` → `pptx`
- `.xlsx/.csv` → `xlsx`

## 7) 冲突处理原则

- 安全与隐私要求优先级最高：任何情况下不输出真实密钥/Token/连接串，不对外返回内部堆栈。
- 若不同规则/技能建议冲突，以“更安全、更可维护、更少破坏对外接口兼容性”的方案为准。

