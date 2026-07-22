# [2026-07-06 12:21:04] 协作规则母版去重（删除项目内重复副本）

## 操作描述

用户发现 `.claude/rules/母版/collaboration-rules.md` 疑似"没有生效、没同步进 CLAUDE.md"。排查结论：该母版实际已生效——Claude Code 会自动加载 `~/.claude/rules/`（全局)与项目 `.claude/rules/`（含子目录）下的规则文件,两份内容经 diff 确认完全一致,导致同一份规则被重复注入上下文两遍。

经与用户确认,采用「保留全局唯一真相源、删除项目副本」方案:
- 全局副本 `~/.claude/rules/collaboration-rules.md` 保留(跨项目复用,改一处全生效,符合母版自身设计意图);
- 项目副本 `.claude/rules/母版/collaboration-rules.md` 删除;
- **不**在 CLAUDE.md 加 `@~/.claude/rules/collaboration-rules.md` 导入行——`~/.claude/rules/` 本身已自动加载,再加 `@` 导入会造成二次重复注入。

## 改动详情

- [x] 删除 `.claude/rules/母版/collaboration-rules.md`(与全局 `~/.claude/rules/collaboration-rules.md` 内容完全一致的重复副本)
- [x] 保留 `.claude/rules/母版/ts-fullstack-consistency-template.md`(另一份独立母版,与本次无关,不动)
- [x] CLAUDE.md 无需改动:其中 `/.claude/rules 规则全文` 的描述仍然成立,且本就没有 `@` 导入行

## 验证结果

- [x] 删除前 grep 全仓引用:`collaboration-rules` 仅出现在 4 份历史 walkthrough 记录(历史档案不修改)与被删文件自身,无任何活跃引用,删除安全
- [x] 删除后 `ls .claude/rules/母版/` 仅剩 `ts-fullstack-consistency-template.md`,符合预期
- [x] `diff` 确认全局副本与被删副本内容一致,规则内容零丢失

## 注意事项

项目副本随 git 仓库走,全局副本只存在于本机。若将来此仓库在新机器/其他协作者环境使用,需先安装全局母版:
`cp <母版来源> ~/.claude/rules/collaboration-rules.md`
