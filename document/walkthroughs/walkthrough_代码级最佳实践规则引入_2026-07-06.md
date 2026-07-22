# [2026-07-06 12:20:00] 引入代码级最佳实践规则(fastapi-best-practices + bulletproof-react)

## 操作描述

用户反馈此前推荐的规则资源"太泛",要求细到代码层面、能直接指导写高质量前后端代码的内容。
本次从两个高质量源头提炼并**按项目真实情况适配**后落成规则:

- 后端:[zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
  的 AGENTS.md(专为 AI 代理编写的 Do/Don't 机器可读版)
- 前端:[alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react)
  的 project-structure.md(单向依赖架构 + lint 强制)

关键前置发现:本项目 `.copier/.copier-answers.yml` 显示项目派生自
`full-stack-fastapi-template`(fork),后端为**同步 SQLModel Session**(`create_engine`,
threadpool 扩容 200)——因此 AGENTS.md 中 AsyncSession/异步优先的建议**不能照抄**,已反向适配。

## 改动详情

- [x] 新建 [.claude/rules/06-后端编码最佳实践.md](../.claude/rules/06-后端编码最佳实践.md)
  - async/sync 路由决策表(本项目默认 `def`;async def + 同步 Session = 事件循环阻塞,附 Do/Don't 代码)
  - Pydantic v2 惯用法(StrEnum/Field 约束/field_serializer/禁 json_encoders)
  - 依赖注入:校验下沉 Depends、链式依赖、请求内缓存、Annotated 统一写法
  - DB 命名约定(snake 单数/_at 后缀/naming_convention)、SQL-first
  - BackgroundTasks vs Celery 分界表;测试 dependency_overrides 模式
  - 反模式速查表(9 条,review 触发即改)
  - 附可执行 tripwire:grep 检测 async 路由注入 SessionDep
- [x] 增补 [.claude/rules/05-前端一致性规范.md](../.claude/rules/05-前端一致性规范.md) 新 §二「单向依赖」
  - 分层:共享层(ui/Common/providers/layout/lib/hooks/client)→ feature 层(components/<Feature>)→ 应用层(routes)
  - feature 互相 import 禁令 + 禁 barrel 文件
  - 附已验证的 tripwire 脚本;后续章节重编号(三~八),表内交叉引用同步修正
- [x] 修改 [CLAUDE.md](../CLAUDE.md):§一 追加 `06-后端编码最佳实践`(范围 `backend/**`)+ @导入

## 验证结果

- [x] tripwire 1(后端)实跑:抓到存量违例 `collect.py:28`、`douyin.py:23`
  (async def 路由注入同步 SessionDep)——已记入 06 附录存量缺口,未顺手改代码(规则任务不夹带代码变更)
- [x] tripwire 2(前端)实跑:首版误报 `Common/→providers/`,据此把 `providers/`、`layout/`
  归入共享层定义后重跑,**通过(当前无 feature 互引)**
- [x] CLAUDE.md 导入链:§一 六个规则文件,无重复

## 遗留

- `collect.py` / `douyin.py` 的 async/sync 修复属代码变更,待用户安排(改法见 06 §一)
- 根目录 `collaboration-rules.md`、`ts-fullstack-consistency-template.md` 冗余副本仍待用户确认删除
