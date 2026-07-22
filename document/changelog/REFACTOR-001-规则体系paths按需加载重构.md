# REFACTOR-001 规则体系重构为 paths 按需加载

- **编号**: REFACTOR-001
- **日期**: 2026-07-06
- **状态**: 已完成
- **类型**: 重构优化
- **关联 PR·Issue**: 无

> 按类型取舍小节:不适用的小节写"无"。

## 需求背景

规则文件将持续增多,原组织方式存在两个问题:
1. `.claude/rules/`(含子目录)下所有 md 每次会话**无差别全量注入**——包括 `ecc/zh` 与
   `ecc/common` 中英双份、`母版/`、Trae 的 `AGENTS.md`,大量浪费上下文;
2. 曾尝试的"子目录 CLAUDE.md 懒加载"方案被上述自动加载架空(01–06 反正每次都载入),
   且子目录 CLAUDE.md 的摘要与规则全文构成双份注入。

## 讨论过程

对比两种机制后选定 **`.claude/rules/*.md` + `paths:` frontmatter**(用户确认):
- 无 frontmatter 的规则 = 每次会话必载(适合全局规则);
- 带 `paths:` glob 的规则 = 只在触碰匹配文件时载入,且 glob 可跨目录
  (如 `["backend/**", "aisec/**"]` 一份规则管两个服务),比子目录 CLAUDE.md 更灵活。
- 否决"继续用子目录 CLAUDE.md":粒度只有目录级,且与 rules 自动加载叠加造成重复。

## 技术实现

- `.claude/rules/01`:去掉 Cursor 式 frontmatter(`globs`/`alwaysApply`,Claude Code 不识别),保持全局加载
- `.claude/rules/02/04/06` → `paths: ["backend/**", "aisec/**"]`;`03/05` → `paths: ["frontend/**"]`
  (02–04 原为 Cursor `.mdc` 格式一并转换)
- 新建 `07-后端服务概览` / `08-前端服务概览` / `09-aisec服务概览`(均带 paths):
  承接被删子目录 CLAUDE.md 的独有内容(技术栈、常用命令、目录结构、aisec 特有规则)
- 删除 `backend/CLAUDE.md`、`frontend/CLAUDE.md`、`aisec/CLAUDE.md`
- `ecc/`、`母版/`、`AGENTS.md` 移出自动加载路径 → `.claude/reference/`(纯参考,不注入)
- 根 `CLAUDE.md` 目录结构节更新指引

## 验证方式

- [x] 9 个规则文件 frontmatter 逐一核查:01 无(全局),02–09 均为合法 `paths:` 列表
- [x] `.claude/rules/` 终态仅 01–09,无参考资料残留
- [x] 迁移后 grep 全仓:无存活配置引用旧路径(仅历史 walkthrough 与权限清单)
