# 组件目录拆分重构日志

**操作时间**: [2026-03-30 05:12:00]
**操作主题**: 依据前端架构规范拆分冗余组件文件

## 1. 任务背景描述
项目根 `components` 目录下存在散落的长代码文件 （`DashboardDesign.tsx` ~260行）与全局提供者（`theme-provider.tsx`）。为了提升代码库的整洁度和可维护性，遵循现代 React 项目的最佳文件夹分类规范（Feature-based / Role-based 分区），对其进行目录级别重构。

## 2. 具体改动详情

### 2.1 重构 Theme Provider
- 将 `src/components/theme-provider.tsx` 移动到专属的 `src/components/providers/theme-provider.tsx`。
- 修改全局受到影响的 3 处导入：
  - `src/main.tsx`
  - `src/components/Common/Logo.tsx`
  - `src/components/Common/Appearance.tsx`

### 2.2 拆解 Dashboard 页面组件
新建 `src/components/Dashboard/` 业务逻辑文件夹，并将原先 260 行的单文件切分为 3 个高度内聚的代码文件：
- 拆分出 `StatCard.tsx`：单独负责渲染四色顶层统计卡片。
- 拆分出 `ProgressBar.tsx`：单独负责渲染具有渐现增长动画的活跃度排行条。
- 重写 `index.tsx`：作为仪表盘的统一出口容器，仅负责排版和引入子组件。
- 删除了被废弃的 `src/components/DashboardDesign.tsx`。
- 更新了 `src/routes/_layout/index.tsx` 的导入地址指向新的 `Dashboard` 目录。
- **规范执行**：在切分的每个组件内部，严格补充了以 `// Why: ` 格式开头的中文设计理念注释，确保后续开发者不仅知其然，更知其所以然。

## 3. 验证结果

- [x] 所有关联引入的路径均已替换正确。
- [x] 代码分割后静态编译检查无报错，不存在遗漏的导出类型或接口。
- [x] 实时运行的 `bun dev` 热重载服务器状态正常，网页组件渲染正常。
