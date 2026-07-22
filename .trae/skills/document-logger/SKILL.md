# SKILL: 文档与问答日志记录器 (Document Logger)

【定位】这是 Trae Skill，用于在开发过程中自动保存和归档用户的计划输出与关键对话历史。

## 何时触发
- 当用户使用了 `/plan` 命令，或者明确要求制定计划时。
- 当用户与 AI 的一轮或一系列问答结束，且涉及到特定的技术方案、配置逻辑或重要解答时。
- 当用户明确要求“记录这段对话”、“保存这个方案”时。

## 强制规则（必须遵守）

### 1) Plan 记录规范
- 每次生成 `plan` 方案后，必须自动在 `\root\security-platform\.trae\documents\` 目录下创建一个以时间戳或核心主题命名的 Markdown 文件（例如：`2026-03-23_1145_nginx_mirror_plan.md`）。
- 该文件必须包含完整的计划内容（现状分析、方案设计、实施步骤等）。

### 2) QA 问答记录规范
- 必须将重要的、有价值的问答对话保存到 `\root\security-platform\.trae\documents\QA\` 目录。
- **文件组织方式**：采用“单文件拆分”模式，即每次对话或每个独立主题保存为一个单独的文件。
- **命名规范**：`YYYY-MM-DD_HHMM_主题名称.md`（例如：`2026-03-23_1200_nginx_mirror_cross_server.md`）。
- **内容规范**：
  - 文件顶部应包含对话的时间和主题。
  - 必须记录用户的核心问题（Q）和 AI 的核心解答/技术方案（A）。
  - 忽略无关紧要的寒暄或中间纠错过程，只保留最终有价值的知识沉淀。

### 3) 目录自动创建
- 如果指定的目录 `\root\security-platform\.trae\documents\` 或 `\root\security-platform\.trae\documents\QA\` 不存在，必须在写入文件前自动创建。
