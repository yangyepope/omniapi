# 代码质量审查子代理提示词模板 (Code Quality Reviewer Prompt Template)

派发代码质量审查子代理时使用此模板。

**目的：** 验证实现方案是否构建良好（整洁、已测试、易于维护）

**仅在规范合规性获批 ✅ 之后才派发此项。**

```
任务工具 (superpowers:code-reviewer):
  使用位于 requesting-code-review/code-reviewer.md 的模板

  WHAT_WAS_IMPLEMENTED: [来自实现者的报告]
  PLAN_OR_REQUIREMENTS: 任务 N 摘自 [计划文件]
  BASE_SHA: [该任务之前的提交 SHA]
  HEAD_SHA: [当前提交的 SHA]
  DESCRIPTION: [任务摘要]
```

**除了常见的代码质量关注点外，审查员还应检查：**
- 每个文件是否具有单一职责和明确定义的接口？
- 单元是否已拆分，以便能够独立理解和测试？
- 实现是否遵循了计划中定义的文件结构？
- 此实现是否创建了原本就很庞大的新文件，或者大幅增加了现有文件？（不要标记预先存在的文件大小 —— 重点关注此次变动造成的增量。）

**代码审查员返回：** 优势、问题（严重/重要/次要）、最终评估
```
