---
description: 如何使用 Stitch MCP 自动化同步 Figma 设计稿
---

# Stitch MCP 同步工作流

本工作流用于快速从 Stitch 资产库中提取设计定义并同步至前端 React 组件中。

## 1. 环境检查
// turbo
确保 `.env` 中已配置 `STITCH_API_KEY` 和 `STITCH_PROJECT_ID` (553729816665366717)。

## 2. 获取设计列表
如果你不确定具体要同步哪个屏幕，请运行以下命令查看列表：
// turbo
```bash
npm run stitch list
```

## 3. 执行智能同步
使用自然语言描述你想要同步的设计部分。该命令会调用 MCP 的 `generate_and_fetch_code` 工具。
// turbo
```bash
npm run stitch sync "Service Card Design"
```

## 4. 应用代码
- 观察控制台输出的 JSON 结果。
- 提取 `code` 字段中的 React/Tailwind 代码。
- 按照项目规范（MD3, rounded-[2.5rem]）进行适配并写入目标文件。

## 5. 记录变更
// turbo
完成同步后，必须更新 `backend/walkthrough_*.md` 记录本次 UI 变更。
