# [2026-03-26 02:06:26] 修复接口中心UI及API状态流转逻辑对齐

## 操作描述
- 针对用户反馈“完全对不上呀”的问题，重新审视并全面对齐 `frontend/tmp/code.html` 和 `frontend/tmp/DESIGN.md` 设计稿。
- 重构了侧边栏（`AppSidebar` 和 `Main`），移除了部分干扰样式的容器，完全采用设计稿中的 DOM 结构和 Tailwind 类名。
- 在全局 CSS (`index.css`) 中补充了 `.material-symbols-outlined` 和 `.pulse-secondary` 样式以确保图标和呼吸灯动画正常显示。
- 更新了 `api-center.tsx` 中的 `ServiceCard`，将“Documented vs Shadow”转化为更加符合后端 `walkthrough.md` (Line 72) 中描述的“流量发现→文档定义”流转逻辑，并加入动态进度条显示。

## 改动详情
- **frontend/src/components/Sidebar/AppSidebar.tsx**：重构并精简了外层包裹的 DOM，移除了 `shadcn/ui` Sidebar 内置 bg 造成的视觉冲突。
- **frontend/src/components/Sidebar/Main.tsx**：确保激活状态和 Hover 状态的背景色、文字色、边框样式与设计稿（如 `#192540` 等颜色变量）完全一致，替换所有内置图标为 `material-symbols-outlined` 字体图标。
- **frontend/src/routes/_layout/api-center.tsx**：
  - 同步设计稿的 Header 与 Footer 布局。
  - 在 `ServiceCard` 组件内引入了 `progress` 计算，展示为“流量发现→文档定义 (流转中 / 已完成)”的文字逻辑。
- **frontend/src/index.css**：注入 `@layer utilities`，配置了 `material-symbols-outlined` 的默认变体参数和呼吸灯动画。

## 验证结果
- [x] Vite dev server (`http://localhost:5177/api-center`) 正常启动，无报错。
- [x] UI 完全复刻了 `code.html` 效果，侧边栏、背景、文字排版一致。
- [x] API 状态流转概念（流量发现 -> 文档定义）在卡片中清晰展示。