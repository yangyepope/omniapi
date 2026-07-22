# [2026-07-06 12:31:26] 全项目文档系统按协作规则母版重构

## 操作描述

按 `~/.claude/rules/collaboration-rules.md`(通用工程协作规则母版)的文档规则,对整个项目的文档系统做结构化重构:根 `document/` 41 个文件与根 `bugfix/` 10 个文件原先全部平铺(且 `bugfix/` 违反母版"过程文档禁放项目根目录"),`backend/document/` 22 个 walkthrough 也无分类。目录名保留项目约定 `document/`(母版允许覆盖路径,原则不变),内部采用母版约定子目录 + 两个项目特有类别(`plans/`、`walkthroughs/`)。

## 改动详情

### 1. 新建文档树(含模板与索引)

- [x] `document/README.md` — 总索引:各子目录用途、范围划分、写作纪律
- [x] `document/changelog/` — `_TEMPLATE.md` + `README.md`(FEAT/FIX/DISC/REFACTOR/OPS 编号索引)
- [x] `document/bugs/` — `_TEMPLATE.md`(根因 + tripwire + 复发记录)+ `README.md`(空索引,下一编号 BUG-001)
- [x] `document/features/`、`adr/`、`ops/` — 各建 `_TEMPLATE.md`
- [x] `document/architecture/`、`plans/`、`walkthroughs/` — 迁移目标目录

### 2. 文件迁移(git mv 保留历史,共 66 处 rename)

- [x] `bugfix/` 10 个修复记录 → `document/changelog/FIX-001` ~ `FIX-010`(按日期+字母序编号,中文描述命名),`bugfix/` 目录删除
- [x] 根 `document/` 25 个实施方案/任务清单/plan → `document/plans/`
- [x] 根 `document/` 8 个并发/Gevent 架构技术报告 → `document/architecture/`
- [x] 根 `document/` 8 个 walkthrough(含 2 个 `*_Walkthrough.md` 命名的)→ `document/walkthroughs/`
- [x] `backend/document/` 22 个 walkthrough → `backend/document/walkthroughs/`

### 3. 规则与技能同步(多处引用旧路径,全部更新)

- [x] `CLAUDE.md` 硬性规则(文档与沉淀):新增文档树总则,walkthrough/plans/DISC/FIX/BUG 路径全部指向新结构
- [x] `.claude/rules/01-工作流与语言规范.md` 第二、三节:存放位置表更新为 `walkthroughs/`、`plans/` 子目录,补充项目级类别说明
- [x] `.agent/rules/01-工作流与语言规范.md`(Trae 旧版镜像):命名格式与计划文档节同步更新
- [x] `.claude/skills/plan/SKILL.md`:计划文档保存路径 → `document/plans/`
- [x] `.agent/plugins/ecc/skills/bugfix-archiver/SKILL.md` + `evals/evals.json`:回档路径从失效的 `/root/security-platform/bugfix/` 改为 `document/changelog/FIX-*`,并补充 BUG 档案配套要求

## 验证结果

- [x] 文件数核对:根 41 + bugfix 10 = 51 全部归位(plans 25 + architecture 8 + walkthroughs 8 + changelog 10);backend 22 个全部入 `walkthroughs/`,无遗漏
- [x] `git status` 记录 66 处 rename(git mv 保留历史),未追踪文件用 mv 同步迁移
- [x] 残留引用核查:全仓 grep `security-platform/bugfix`、`document/YYYYMMDD` 旧路径模式,零命中
- [x] `bugfix/` 目录已删除(rmdir 成功,确认为空)
- [x] 本日志本身即按新规则落 `document/walkthroughs/`

## 注意事项

- 历史文档只迁移未改写:FIX-001~010 是单次修复过程记录,尚未按"一类问题"提炼 `bugs/BUG-*` 防线档案,后续修 bug 按四件套流程建档
- `.trae/documents/` 是 Trae 自己的文档约定,本次不动
- 迁移未提交 git,需要提交时通知
