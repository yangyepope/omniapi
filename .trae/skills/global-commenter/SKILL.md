---
name: "global-commenter"
description: "Trae 全局技能：写代码/改配置时默认补充详细中文注释与说明，并以 .cursor/rules 为细则来源；仅用户明确要求不加注释时跳过。"
---

# SKILL：全局注释与说明（Trae）

【定位】这是 Trae 的技能文件（Skill），用于定义“默认行为/工作习惯”；它不是 Cursor 的规则文件（Rule）。
【优先级】P0（默认开启，最高优先级）：写代码/改配置默认补充详细中文注释与说明；安全与隐私要求不可被任何细则覆盖。

## 职责边界（避免与 Rules 重复）

- Skill 只负责约定“默认要做什么”：当我新增/修改任何代码或配置时，默认必须补充详细中文注释与说明。
- 具体到“注释块长什么样、哪些文件必须解释、后端/校验/错误处理的细则”，统一以 `.cursor/rules/` 目录下的 Rules 为准（这里便于 pack 化与按目录生效）。
- 如果用户明确说“不要注释/保持无注释”，则本 Skill 不触发。

## 能力覆盖（你关心的 Python / Dockerfile 都在）

本 Skill 并不是“删掉了 Python/Dockerfile 的要求”，而是把细则从 Skill 中移到了 Rules 里做统一管理（避免两处重复维护）。当前覆盖范围包括：

- Python：函数三行注释块、复杂逻辑行内注释、FastAPI/第三方请求/数据解析说明等
- 配置：`.env`、Settings、第三方配置的字段用途/格式/默认值风险/依赖关系说明
- Dockerfile：每一层指令的目的与优化点说明（缓存、体积、安全、构建速度等）
- 架构：新增文件必须写文件头说明（职责、与目录结构关系、接入方式）
- 安全：注释/示例/日志不泄露 token/secret/连接串；对外 message 不暴露内部堆栈

## Rules 细则来源（单一真相）

以下文件为细则（Rules），需要时以它们的内容为准：

- `.cursor/rules/001-Auto-Comment-Protocol.mdc`：全局总纲
- `.cursor/rules/010-comment-expert.mdc`：后端注释专家（backend/**）
- `.cursor/rules/020-pydantic-validator.mdc`：后端 Pydantic 校验规范（backend/**）
- `.cursor/rules/030-error-handler-standard.mdc`：后端错误处理与返回标准（backend/**）

## 速查：改哪里

- 想加强/修改 Python、Dockerfile、配置等“具体要求/模板”：改 `.cursor/rules/*.mdc`（Rules）
- 想调整“默认是否开启、何时允许跳过”：改本文件（Skill）

## 维护原则

- 想改“细则/模板/约束”：改 `.cursor/rules/*.mdc`（Rules）。
- 想改“默认是否开启/何时跳过”：改本文件（Skill）。
