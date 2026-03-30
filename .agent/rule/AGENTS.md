---
description: Agents 角色与职责规范
globs: "*"
alwaysApply: true
---

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

## 8) 全栈与前端自动化技能 (Full-Stack Skills)

你可以通过对话“固化”或直接触发以下专项全栈生成技能（最佳实践流程）：

- **Schema-Sync**：当后端 Pydantic 模型改变时，触发此技能。AI 应自动扫描后端变动，并运行前端的 API 客户端生成命令（如 `bun run generate-client`），以重新生成前端 OpenAPI 契约及类型。
- **FastAPI-Route-Mapper**：当需要新建前端功能页时，触发此技能。AI 应读取后端 `router` 定义，并结合 TanStack Query 自动创建对应的 `useQuery` / `useMutation` 钩子和页面 API 请求调用。
- **Zod-Pydantic-Bridge**：当编写前端复杂表单时，触发此技能。AI 应严格根据后端的 `Field(gt=0, le=100)` 等约束，自动生成对应的前端 Zod 校验规则（如 `z.number().min(0).max(100)`）。
- **CRUD-Boilerplate**：当增加新的业务模块时，触发此技能。AI 应一次性端到端生成：后端 Model -> Schema -> Router，以及前端 API 调用 -> 列表页 (List Page) -> 表单弹窗 (Form Modal)。


## 9) ECC 增强专家 (ECC Enhanced Experts)

这些是由 `everything-claude-code` 插件提供的专用子代理，可通过在对话中明确要求其“化身”或委派任务来启用。详细路径见 `.agent/plugins/ecc/agents/`：

- **Architect (规划架构师)**：负责系统级设计决策、模块解耦与扩展性评估。
- **Planner (特性规划员)**：负责将复杂需求拆解为可执行的实施计划。
- **TDD-Guide (测试开发向导)**：强制执行测试驱动开发 (Red-Green-Refactor) 流程。
- **Code-Reviewer (代码审计员)**：严格审查代码质量、命名规范与逻辑完整性。
- **Typescript-Reviewer (TS 专项审查)**：深入审计 TS 类型安全、React 性能与最佳实践。
- **Security-Reviewer (安全卫士)**：对变更进行 OWASP Top 10 级别的安全审计。
- **Build-Error-Resolver (编译错误修复)**：自动分析并修复跨平台的编译/链表错误。
- **Doc-Updater (文档同步员)**：确保 `WALKTHROUGH.md` 和代码注释与最新变更同步。

---

**使用说明**：当任务特别复杂或涉及核心架构变更时，建议主动“委派”给上述专家进行多步验证。
