# [2026-07-06 11:45:00] 前端一致性规范提炼落地(母版 → 项目规则)

## 操作描述

用户要求把根目录两份母版(`collaboration-rules.md`、`ts-fullstack-consistency-template.md`)
"使用到项目中",其中 ts-fullstack 需提炼有用部分适配本项目栈。

核查发现:两份文件在 `.claude/rules/母版/` 已有**字节级相同**副本,且 CLAUDE.md §二 早已 `@` 导入
——"引入"这步此前已完成;本次真正缺的是**提炼落地**这一步。

## 改动详情

- [x] 新建 [.claude/rules/05-前端一致性规范.md](../.claude/rules/05-前端一致性规范.md)
  - 母版纪律(单一真相源/三步决策/视觉 token/format 唯一入口/四态)全部保留
  - 路径按真实项目映射:`src/components/ui|Common`、`src/index.css @theme`、`src/client/`(hey-api)、`src/locales/`、`src/lib/utils.ts`、`src/utils.ts handleError`
  - 与 03 铁律对齐:组件 ≤150 行(严于母版 200 行)、lucide-react、禁 useEffect fetch
  - 与存量风格对齐:组件文件保持 PascalCase,**不采纳**母版的 kebab-case
  - 附「存量缺口」清单(基于实扫):`lib/format.ts` 缺失、`toLocaleDateString` 散落 ≥5 处、裸 hex/任意值 ≥8 文件、StatusBadge/EmptyState/ConfirmDialog 共享版缺失;执行口径 = 新代码 100% 合规、触碰即修、不专项重构
- [x] 修改 [CLAUDE.md](../CLAUDE.md)
  - §一 表格与导入区追加 `05-前端一致性规范`(范围 `frontend/**`)
  - §二 停止 `@` 导入 ts-fullstack 母版原件(避免 Next.js/tRPC 示例与提炼版双轨冲突),原件留在 `母版/` 作跨项目参考;`collaboration-rules` 照旧导入
- [ ] 未删除文件:根目录 `collaboration-rules.md`、`ts-fullstack-consistency-template.md` 与
  `.claude/rules/母版/` 下副本完全相同,属冗余,按"物理删除须确认"规则**留待用户确认后删除**

## 验证结果

- [x] `diff -q` 确认根目录两文件与 `母版/` 副本一致(提炼基于同一内容)
- [x] 05 规则中所有路径均经实扫核对存在(`ui/` 24 组件、`Common/` 7 组件、`@theme` 在 index.css:7、zod/@hookform/resolvers 在 package.json)
- [x] CLAUDE.md 导入链:§一 五个铁律 + §二 collaboration-rules,无重复导入
