# CLAUDE.md(根目录,全局生效)

## 项目
SecurityPlatform — 流量采集与安全测试平台。
FastAPI + SQLModel + Celery 后端 / React 19 + Vite 前端 / aisec 独立 AI 扫描服务,Docker Compose 部署。

## 常用命令
- 启动全栈: `docker compose up -d`
- 看日志: `docker compose logs -f backend`
- 前端开发: `bun run dev`(根目录代理到 frontend)
- 前端检查: `bun run lint`
- E2E 测试: `bun run test`(Playwright)

## 硬性规则(语言与注释)
- 所有输出用简体中文:注释、解释、错误诊断、计划文档;技术术语保持原文
- 新建/修改任何代码默认写注释,核心业务逻辑**逐行中文注释**,解释 Why 而非 What;禁止以"代码简单"为由省略

## 硬性规则(先想后写 · Karpathy)
- 不确定先问,不凭猜测开干;有多种解读时并列摆出,不默默选一个
- 最简实现:不做没要求的功能、不为单次使用建抽象、不加没要求的"灵活性"
- 外科手术式改动:只改任务要求的部分,不顺手重构/优化无关代码;自己改动产生的孤儿 import/变量要清掉
- 目标驱动:动手前先定验证标准("修 bug"→"先写复现测试再让它通过")

## 硬性规则(修改安全)
- 改函数/组件前先 grep 引用,列出影响范围;重构数据结构必须扫全部派生引用
- 引用字段/配置前先确认它存在,禁 `getattr(x,"y",None)` 式静默兜底
- 改完必须跑对应模块测试 + 实际行为验证(打接口/查数据/看日志);边界场景(空数据/并发/取消)不能只验 happy path
- 改了构建/依赖/容器定义,必须实际起一遍,不能只 dry-run
- 禁止硬编码密钥/端口/魔法数;多份环境文件(.env / compose / 配置模板)必须同步改,禁止只改在跑的那份
- 不把"请用户手动执行"当主要交付

## 硬性规则(文档与沉淀)
- 文档树遵循母版结构,总索引见 `document/README.md`:`changelog/`(FEAT/FIX/DISC/REFACTOR/OPS)、`bugs/`、`features/`、`adr/`、`ops/`、`architecture/`、`plans/`、`walkthroughs/`;新建文档一律复制对应目录 `_TEMPLATE.md` 改写,新增 changelog/bugs 文档后同步更新其 README 索引
- 每次实质操作后写操作日志:单服务落 `{服务}/document/walkthroughs/walkthrough_[任务]_[日期].md`,跨服务落根 `document/walkthroughs/`;标题含 `[YYYY-MM-DD HH:mm:ss]`,分层写"操作/改动/验证",用 `- [x]` 清单;**严禁覆盖旧记录**,禁平铺在 document/ 根或服务根目录
- 计划类文档落 `document/plans/`(单服务落 `{服务}/document/plans/`),命名 `YYYYMMDD_[任务]_[类型].md`
- 有价值的需求讨论/方案决策必须落 `document/changelog/DISC-*`,不允许只存在于对话
- Bug 修复必须**正面修复**(禁调用点加 if 绕过/只改在跑的环境/留新旧双轨),修完四件套缺一不可:根因沉淀为规则 → `document/changelog/FIX-*` 变更日志 → 更新 `document/features/` 功能文档 → `document/bugs/BUG-*` 防复发档案(含至少一条可执行 tripwire);做完才能说"修复完成"

## 硬性规则(E2E 凭据)
- 凭据只从根 `.env` 读 `FIRST_SUPERUSER` / `FIRST_SUPERUSER_PASSWORD`,缺失就提醒用户补,禁止编造 Mock
- 401/403 时先跑 `npx playwright test tests/auth.setup.ts` 持久化登录态

## 目录结构
- `/backend`      主平台 API(FastAPI + SQLModel)
- `/frontend`     Web 前端(React + Vite)
- `/aisec`        AI 渗透扫描子服务(独立 FastAPI,未投产骨架)
- `/document`     跨服务操作日志与计划文档(结构见上方"文档与沉淀")
- `/.claude/rules` 专项规则(01 全局;02–09 带 `paths:` frontmatter,触碰对应目录时自动载入)
- `/.claude/reference` 参考资料(ecc 指令集、跨项目母版、Trae 规则),不自动载入
