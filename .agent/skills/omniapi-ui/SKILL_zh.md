---
name: omniapi-ui-zh
description: OmniAPI 项目专属 UI/UX 标准（未来派创业/Futuristic Startup 审美）。
---
# OmniAPI UI/UX 设计技能 (中文版)

本技能定义了 OmniAPI 项目的视觉语言和用户体验标准，核心基于“未来派创业（Futuristic Startup）”设计系统。

## 核心视觉身份

### 1. 字体排版 (Space Grotesk)
- **主要标题字体**: `Space Grotesk` (Google Fonts)。
- **正文字体**: `Inter` 或 `DM Sans`。
- **等宽字体**: `font-mono` (用于接口路径、代码或 IP 地址)。
- **风格提示**: 标题应使用 `font-black` (极黑) 配合 `tracking-tight` (紧凑字间距) 以营造科技感。

### 2. 配色方案 (赛博进化)
- **背景底色**: `#0a0e14` (深邃午夜蓝)。
- **核心装饰色**: `#00f1fe` (青色/Cyan)。
- **辅助点缀色**: `#9d50ff` (紫色/Purple)。
- **视觉深度**: 对重要的青色元素使用 `drop-shadow-[0_0_8px_rgba(0,241,254,0.4)]` 营造发光感。

---

## 布局标准

### 1. 全局容器
- **最大宽度**: `max-w-[1600px]`。
- **水平边距**: `px-8`。
- **对齐方式**: 始终保持 `mx-auto` (水平居中)。

### 2. 导航栏 (Sticky Header)
- **高度**: `h-16` (64px)。
- **效果**: `backdrop-blur-xl` (玻璃拟态模糊)。
- **结构**: [返回按钮] [面包屑路径: 模块名 / 当前节] [搜索/功能按钮]。

---

## 组件指南

### 1. 矩阵表格 (Matrix Tables)
- **列宽比例建议**:
    - 方法 (Method): 12%
    - 路径 (Path): 20%
    - 描述 (Description): 28%
    - 来源 (Source): 18%
    - 等级 (Level): 15%
    - 操作 (Action): 7% (靠右对齐)。
- **容器风格**: `rounded-[2rem]`, `bg-white/[0.02]`, `border-white/10`。

### 2. 交互细节
- **悬停效果 (Hover)**: 所有交互元素必须具备平滑过度 (`transition-all duration-200`)。
- **鼠标指针**: 交互式卡片和表格行必须添加 `cursor-pointer`。
- **按钮**: `rounded-xl` (12px 圆角)。主按钮建议带有青色发光阴影 (`shadow-[0_0_20px_rgba(0,241,254,0.3)]`)。

---

## 开发与重构准则 (Technical Standards)

### 1. 零闪烁导航 (Zero-Flicker UX)
- **分页与搜索**: 在执行分页、搜索或筛选操作时，必须在 TanStack Query 中使用 `placeholderData: keepPreviousData`。这能确保在获取新数据时旧数据依然可见，有效防止布局塌陷和页面震动。
- **持久化布局**: 严禁在异步加载时移除全屏布局。应始终渲染 Header 和侧边栏，仅在局部区域（如表格内部）显示加载动画 (`animate-pulse` 或 `animate-spin`)。

### 2. 路由与状态管理 (Routing & State)
- **声明式导航**: 始终优先使用 `@tanstack/react-router` 的 `Link` 组件，而非命令式的 `useNavigate`。这对支持右键打开新标签和保持稳定的活跃状态 (Active State) 至关重要。
- **状态同步**: 所有交互状态（搜索关键词 `query`、页码 `page`）必须实时同步到 URL Search Params。利用 `searchSchema` 进行校验，确保刷新页面或通过链接访问时能完美还原 UI 状态。
- **层级化路由**: 对于具有多个动态参数的复杂路径（如 `moduleId` 和 `endpointId`），必须使用标准目录结构（如 `/api-center/$moduleId/$endpointId/index.tsx`），严禁使用扁平化的点号命名，以避免路由匹配冲突。

---

## 交付前检查清单 (Pre-Implementation Checklist)
- [ ] 所有大标题是否使用了 `Space Grotesk` 字体？
- [ ] 容器宽度是否锁定在 `1600px` 以内？
- [ ] 是否严禁使用 Emoji 作为 UI 图标（应使用 Lucide/SVG）？
- [ ] 青色元素是否使用了正确的色号 (`#00f1fe`) 并配合了发光效果？
- [ ] 详情页面是否配备了统一的返回按钮和面包屑导航？
- [ ] **[新增]** 分页切换时是否实现了“零闪烁”体验（使用 `keepPreviousData`）？
- [ ] **[新增]** 是否使用了 `Link` 组件进行路由跳转以支持浏览器原生行为？
- [ ] **[新增]** 搜索和翻页状态是否能在 URL 中持久化保存？
