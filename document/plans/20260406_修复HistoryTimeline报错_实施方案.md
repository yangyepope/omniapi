# 修复 HistoryTimeline.tsx 逻辑与类型错误方案 [2026-04-06]

该方案旨在解决 `HistoryTimeline.tsx` 文件中的 TypeScript 报错及逻辑不完整问题。

## 需求背景
用户反馈 `HistoryTimeline.tsx` 文件报红，经分析主要原因为：
1. `stats` 统计逻辑中缺少 UI 依赖的 `c2xx`, `c4xx`, `c5xx`, `errorList` 字段。
2. `trendData` 映射中缺失 `status` 字段，导致趋势图颜色映射逻辑失效。
3. UI 渲染代码块存在语法截断（如 `CheckCircle2` 组件）。

## 核心修复逻辑
- **数据面**：补全 `useMemo` 中的统计分组，引入 `ReplayHistoryItem` 的 `response_status` 到趋势图。
- **展示面**：完备 Donut Chart 的数据比例，修复表格行内的拼写与截断。
- **规范面**：按照 `01-工作流与语言规范` 补全核心逻辑的逐行中文注释。

## 待核详项 (Questions)
- `motion/react` 是否为项目全局约定的动画库引入方式？（根据 package.json 确认已安装 `motion` 12+）。

## 验证计划
- 运行 `npm run lint` 确认页面无红。
- 手工检查服务详情页的历史记录看板显示是否对标原型。
