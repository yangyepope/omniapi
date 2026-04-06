---
name: bugfix-archiver
description: Use when a bug, error, or unexpected behavior is resolved, to archive the discovery and fix process into the /root/omniapi/bugfix/ directory.
---

# bugfix-archiver: 自动化 Bug 修复回档

该技能用于在解决代码缺陷后，自动记录完整的修复路径，确保所有调试经验可追溯、可搜索。

## 启动触发 (When to Use)

- 当你修复了一个 Bug 或解决了报错。
- 当用户询问“刚才那个问题是怎么修的？”。
- 建议在每次 `git commit` 前运行，以同步记录档案。

## 存储规据

- **路径**: `/root/omniapi/bugfix/YYYYMMDD_描述.md`
- **格式**: Markdown

## 核心回档模式

每次回档必须涵盖以下五部分：

1. **现象 (Symptom)**: 
   - 发生了什么？（附上报错日志或 UI 截图路径）。
2. **调查 (Investigation)**: 
   - 你尝试了哪些排查步骤？
   - 发现了哪些线索？
3. **根因 (Root Cause)**: 
   - 问题的核心逻辑缺陷是什么？（不仅是现象，而是深层原因）。
4. **修复 (The Fix)**: 
   - 具体的代码变更。
   - **必须** 附上 `git diff` 的精简摘要。
5. **验证 (Proof)**: 
   - 你是如何证明它修好了的？（附上测试报告、截图或日志）。

## 示例

```markdown
# 2026-04-05 修复变体创建定位器失效

## 现象
E2E 测试在 Service 列表页超时，报错找不到 `.group/card`。

## 根因
前端组件重构后，外层 Container 仅保留了 `.group` 类名，丢弃了 `/card` 后缀。

## 修复
在 `tests/create-variant.spec.ts` 中将定位器更新为更鲁棒的 `.group`。

## 验证
运行 `npx playwright test`，结果：1 passed。
```

## 严禁行为

- **禁止** 仅记录“修复了定位”这种模糊的描述。
- **禁止** 忽略“根因分析”直接写修复代码。
- **禁止** 在没有运行验证指令的情况下记录“已验证”。
