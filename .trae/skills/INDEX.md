---
title: "Trae Skills Index"
---

# Skills 索引（Trae）

【目的】把“技能（Skill）”与“规则（Rule）”明确分离，避免重复与混淆。

## 0) 整理逻辑（我按这个逻辑做层级与默认项）

- Rule（Cursor）负责“细则与约束”，适合用 `globs + alwaysApply` 做范围控制与优先级（文件编号越小越靠前）。
- Skill（Trae）负责“能力包/工作流”，适合按任务类型触发（不要全部默认开启，避免上下文膨胀与互相打架）。
- 默认只保留 P0（全局、强约束、低冲突）：
  - P0：安全/隐私/不泄露敏感信息、全局注释协议（你明确要求的默认行为）
  - 其他能力（例如办公文件、前端 UI 设计、MCP、Playwright 测试）按需触发，不作为全局默认

## 1) 什么是 Skill？

- **Skill（Trae）**：用于定义 AI 在本仓库的默认工作习惯/行为开关（例如：默认要不要写中文注释、什么时候可以跳过）。
- Skill 存放位置：`.trae/skills/<skill-name>/SKILL.md`

## 2) 什么是 Rule？

- **Rule（Cursor）**：用于定义更细的约束/模板/范围生效策略（例如：仅对 `backend/**` 生效的注释模板、Pydantic 校验规范、错误处理标准）。
- Rule 存放位置：`.cursor/rules/*.mdc`

## 3) 本仓库当前启用的 Skills

### P0（默认开启，优先级最高）

- `global-commenter`：全局中文注释与说明（默认行为开关；细则来源指向 `.cursor/rules/`）

### P1（工程交付/辅助工作流：按需触发）

- `work-reporter`：输出“改动清单/原因/影响/验证/回滚”
- `line-commenter`：对指定文件做逐行中文注释（仅加注释，不改逻辑）

### P2（按任务类型触发：文件/产物导向）

- 办公文档/表格/幻灯片：`docx` / `xlsx` / `pptx` / `pdf`
- 视觉与主题：`theme-factory` / `brand-guidelines` / `canvas-design` / `algorithmic-art`
- Web/UI 构建：`frontend-design` / `web-artifacts-builder`
- Web 自动化测试：`webapp-testing`
- 集成与平台：`claude-api` / `mcp-builder`
- 文档写作流程：`doc-coauthoring` / `internal-comms`
- 媒体产物：`slack-gif-creator`

## 4) 本仓库当前启用的 Rules（细则）

### P0（默认开启，优先级最高）

- `001-Auto-Comment-Protocol.mdc`：规则总纲（全局，安全/注释/配置/Dockerfile/新增文件说明）

### P1（后端开发模式：仅 backend/** 生效）

- `010-comment-expert.mdc`：后端注释专家（backend/**）
- `020-pydantic-validator.mdc`：后端 Pydantic 校验规范（backend/**）
- `030-error-handler-standard.mdc`：后端错误处理与返回标准（backend/**）

## 5) 推荐默认项（我已按这个方向处理当前仓库）

- 默认（P0）：
  - Skill：`global-commenter`
  - Rule：`001-Auto-Comment-Protocol.mdc`
- 后端开发模式（P1，仅 backend/**）：
  - Rules：`010` / `020` / `030`
- 其他 Skills：保持“按需触发”，不要全局默认（例如 `pdf/docx/pptx/xlsx` 只在涉及对应文件时触发）

## 6) Skill Packs（建议用法示例）

说明：这是“你进入某个模式时希望自动挂载哪些能力”的推荐清单，用于你自己的 Agent/工作流层做编排（本仓库文件层面只做归类与避免重复）。

```json
{
  "repo_default": [
    { "skill_id": "global-commenter", "priority": 1 },
    { "rule_id": "001-Auto-Comment-Protocol", "priority": 1 }
  ],
  "backend_dev": [
    { "rule_id": "010-comment-expert", "priority": 1 },
    { "rule_id": "020-pydantic-validator", "priority": 2 },
    { "rule_id": "030-error-handler-standard", "priority": 3 }
  ],
  "doc_artifacts": [
    { "skill_id": "docx", "priority": 1 },
    { "skill_id": "pptx", "priority": 2 },
    { "skill_id": "xlsx", "priority": 3 },
    { "skill_id": "pdf", "priority": 4 }
  ],
  "web_ui": [
    { "skill_id": "frontend-design", "priority": 1 },
    { "skill_id": "web-artifacts-builder", "priority": 2 },
    { "skill_id": "theme-factory", "priority": 3 },
    { "skill_id": "brand-guidelines", "priority": 4 }
  ]
}
```

## 5) 维护建议（避免重复）

- 想改“默认是否开启/何时跳过”：改 Skill（`.trae/skills/...`）。
- 想改“细则/模板/约束/生效范围”：改 Rules（`.cursor/rules/...`）。
