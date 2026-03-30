---
name: requesting-code-review
description: 在完成任务、实现重大特性或在合并前使用，以验证工作是否符合要求
---

# 请求代码审查 (Requesting Code Review)

派发 `superpowers:code-reviewer` 子代理以在问题连锁反应前捕捉它们。审查员将获得精确构建的评估上下文 —— 绝不包含你的会话历史记录。这能让审查员专注于工作产出，而非你的思考过程，并为你继续工作保留上下文。

**核心原则：** 早审查，勤审查。

## 何时请求审查

**强制性要求：**
- 在子代理驱动开发（subagent-driven-development）中的每个任务之后。
- 完成重大特性后。
- 合并到 main 分支之前。

**可选但有价值的情况：**
- 卡住时（获取新鲜视角）。
- 重构前（基准检查）。
- 修复复杂 bug 后。

## 如何请求

**1. 获取 git SHAs：**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # 或者 origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. 派发代码审查 (code-reviewer) 子代理：**

使用类型为 `superpowers:code-reviewer` 的 Task 工具，填写位于 `code-reviewer.md` 的模板。

**占位符说明：**
- `{WHAT_WAS_IMPLEMENTED}` —— 你刚刚构建的内容。
- `{PLAN_OR_REQUIREMENTS}` —— 它应该做什么。
- `{BASE_SHA}` —— 起始提交。
- `{HEAD_SHA}` —— 结束提交。
- `{DESCRIPTION}` —— 简要摘要。

**3. 根据反馈采取行动：**
- 立即修复 **严重 (Critical)** 问题。
- 在继续之前修复 **重要 (Important)** 问题。
- 记录 **次要 (Minor)** 问题以便稍后处理。
- 如果审查员有误，请进行回绝（需附带理由）。

## 示例

```
[刚刚完成 任务 2: 添加验证函数]

你：在继续之前，让我请求一下代码审查。

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[派发 superpowers:code-reviewer 子代理]
  WHAT_WAS_IMPLEMENTED: 对话索引的验证与修复函数
  PLAN_OR_REQUIREMENTS: 任务 2，摘自 docs/superpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION: 添加了 verifyIndex() 和 repairIndex()，包含 4 种错误类型

[子代理返回]:
  优势: 架构整洁，真实的测试用例
  问题:
    重要: 缺少进度指示器
    次要: 报告间隔使用了幻数 (100)
  评估: 准备好继续

你：[修复进度指示器]
[继续执行 任务 3]
```

## 与工作流集成

**子代理驱动开发 (Subagent-Driven Development):**
- 每个任务完成后进行审查。
- 在问题复合之前捕捉它们。
- 在进入下一个任务前进行修复。

**执行计划 (Executing Plans):**
- 每批（3 个任务）完成后进行审查。
- 获取反馈、应用、继续。

**临时开发 (Ad-Hoc Development):**
- 合并前审查。
- 卡住时审查。

## 警示信号 (Red Flags)

**严禁执行以下操作：**
- 因为“很简单”而跳过审查。
- 忽略严重 (Critical) 问题。
- 在未修复重要 (Important) 问题的情况下继续进行。
- 与合理的背景技术反馈争论。

**如果审查员有误：**
- 使用技术理由进行回绝。
- 展示证明其有效的代码/测试。
- 请求澄清。

参见模板：`requesting-code-review/code-reviewer.md`
