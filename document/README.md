# document/ — 项目文档树总索引

> 结构遵循 `~/.claude/rules/collaboration-rules.md`(通用工程协作规则母版)的文档规则,
> 目录名沿用本项目约定 `document/`(母版允许项目覆盖路径,原则不变)。
> 过程文档**禁止放在项目根目录**;新建文档一律复制对应子目录的 `_TEMPLATE.md` 改写,不凭记忆手搓小节。

## 子目录用途

| 目录 | 用途 | 命名 | 索引 |
|---|---|---|---|
| [features/](features/) | 功能设计文档,每个功能一份,长期维护 | `{功能名}.md` | — |
| [changelog/](changelog/) | 变更日志:功能 / Bug 修复 / 需求讨论 / 运维操作 | `{FEAT\|FIX\|DISC\|REFACTOR\|OPS}-{编号}-{描述}.md` | [changelog/README.md](changelog/README.md) |
| [bugs/](bugs/) | Bug 防复发知识库,一类 bug 一份「根因 + tripwire + 关联规则」 | `BUG-{编号}-{描述}.md` | [bugs/README.md](bugs/README.md) |
| [adr/](adr/) | 架构决策记录 | `ADR-{编号}-{决策}.md` | — |
| [ops/](ops/) | 操作手册(启停、排错、灾备) | `{主题}.md` | — |
| [architecture/](architecture/) | 整体架构说明与架构级技术报告 | 自由 | — |
| [plans/](plans/) | 计划类文档(实施方案 / 任务清单),本项目特有类别 | `YYYYMMDD_[任务]_[类型].md` | — |
| [walkthroughs/](walkthroughs/) | 跨服务操作日志(walkthrough),本项目特有类别 | `walkthrough_[任务]_[日期].md` | — |

## 范围划分(与各服务 document/ 的分工)

- **跨服务 / 架构级**内容落本目录;
- **仅涉及单个服务**的 walkthrough / 计划落 `{服务}/document/walkthroughs/`、`{服务}/document/plans/`(如 `backend/document/walkthroughs/`);
- changelog / bugs / features / adr 均为**项目级**,只在本目录维护,不在服务目录分散建立。

## 写作纪律(摘自母版,完整规则见 `.claude/rules/01-工作流与语言规范.md`)

- 每次实质操作后写 walkthrough,**严禁覆盖旧记录**;
- 有价值的需求讨论 / 方案决策必须落 `changelog/DISC-*`,不允许只存在于对话;
- Bug 修复完成必须四件套:规则沉淀 → `changelog/FIX-*` → 更新 `features/` 对应文档 → `bugs/BUG-*` 防复发档案(含至少一条可执行 tripwire);
- 新增 changelog / bugs 文档后,同步更新对应 README 索引。
