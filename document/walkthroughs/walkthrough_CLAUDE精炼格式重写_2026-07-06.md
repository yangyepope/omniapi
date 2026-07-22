# [2026-07-06 13:10:00] CLAUDE.md 改为精炼直读格式(项目/命令/硬性规则/目录结构)

## 操作描述

用户对上一版(各级 CLAUDE.md 用 `@` 导入长规则文件)不满意,要求改为**自包含的精炼格式**:
每个 CLAUDE.md 直接写「项目 / 常用命令 / 硬性规则 / 目录结构」四段短内容,几十行内读完。

## 改动详情

四个文件全部重写,**取消全部 `@` 导入**,规则以短句 bullet 形式内联:

- [x] [CLAUDE.md](../CLAUDE.md)(根,全局):项目一句话、docker compose / bun 常用命令、
  8 条全局硬性规则(中文输出/操作日志/外科手术改动/环境文件同步/E2E 凭据/Bug 沉淀/行为验证)、顶层目录图
- [x] [backend/CLAUDE.md](../backend/CLAUDE.md):同步 SQLModel 栈说明、test.sh/lint.sh/alembic 命令、
  15 条硬性规则(02/04/06 全部要点压缩:分层/mypy/领域异常/async 决策/UniqueConstraint/
  禁查判写/SQL 计数器/Celery 行锁/Annotated 依赖/PyJWT/dependency_overrides/脚本归位/命名约定)
- [x] [frontend/CLAUDE.md](../frontend/CLAUDE.md):栈说明、dev/lint/generate-client/E2E 命令、
  12 条硬性规则(03/05 全部要点压缩:@/ 别名/hey-api 禁手写/TanStack Query/token/单向依赖/
  150 行/四态/i18n/format 唯一入口)
- [x] [aisec/CLAUDE.md](../aisec/CLAUDE.md):骨架状态声明、uv/compose 命令、
  规则引用 backend 同款 + Temporal Worker 并发纪律 + 禁宣称可投产

**详细规范全文保留在 `.claude/rules/01–06`**,各文件末尾以纯路径提示"按需查阅"
(不再 `@` 自动载入);`.agent/`、`.trae/`、skills 对规则文件的引用不受影响。

## 验证结果

- [x] 四个文件均为自包含短文档(根 33 行 / backend 44 行 / frontend 40 行 / aisec 37 行)
- [x] 所有命令经实际核对:根 package.json scripts、backend/scripts/{test,lint}.sh 内容、
  `@/*` 别名在 frontend/tsconfig.json:22、alembic 在 backend/app/alembic
- [x] 懒加载语义不变:根必载,子目录触碰时载入

## 遗留

- 根目录 `collaboration-rules.md`、`ts-fullstack-consistency-template.md` 冗余副本待确认删除
- `collect.py` / `douyin.py` async 路由注入同步 Session 待修(改法见 06 §一)

---

# [2026-07-06 13:40:00] 追加:规则内容完整同步(01–06 + 母版 → 各级 CLAUDE.md)

## 操作描述
用户指出精炼版遗漏了规则文件的部分实质内容,要求把 01–06 与母版的要点**完整同步**进对应 CLAUDE.md(仍保持 bullet 直读格式,不用 @ 导入)。

## 改动详情
- [x] 根 CLAUDE.md 补齐:Karpathy 四条(先想后写/最简/外科手术/目标驱动,来自母版)、
  修改安全五条(grep 影响面/引用先确认/边界验证/构建实起/环境文件同步)、
  文档沉淀细则(walkthrough 命名与标题格式/计划文档命名/讨论必落 document//Bug 修复四件套)、
  E2E 凭据 + auth.setup.ts 会话持久化 —— 覆盖 01 + collaboration-rules 全部要点
- [x] backend/CLAUDE.md 补齐(02/04/06 全量要点):DI 禁函数内实例化、统一响应 code/message/details、
  中文 Docstring、Field 约束细则、禁 json_encoders、BaseSettings 按域拆、SQL-first、
  迁移 static/reversible、计数字段配对账、依赖请求内缓存、存量缺口 + tripwire
- [x] frontend/CLAUDE.md 补齐(03/05 全量要点):禁手写 .css、next-themes 暗黑、Mobile-First、
  三步决策、禁 barrel、StatusBadge 映射渲染分离、handleError 唯一入口、ErrorBoundary、
  zod-Pydantic 对齐示例、单向依赖 tripwire 命令、存量缺口清单
- [x] aisec/CLAUDE.md 修复懒加载盲区:原"规则同 backend 不复述"在懒加载下落空
  (操作 aisec/** 时 backend/CLAUDE.md 不载入),已把后端规则要点**内联**

## 验证结果
- [x] 逐份对照 01/02/03/04/05/06/collaboration-rules,实质性条目均已入对应文件
- [x] 规则全文仍保留 `.claude/rules/` 原位,文末纯路径提示按需查阅

---

# [2026-07-06 14:00:00] 追加:删除 collaboration-rules 母版副本

- [x] 经用户确认"不需要",删除 `.claude/rules/母版/collaboration-rules.md`
- [x] 删前 grep 确认:无存活配置引用(仅历史 walkthrough 提及,保留不改);其全部要点已内联进根 CLAUDE.md
- [x] 核实:根目录两份冗余副本(collaboration-rules / ts-fullstack)已被用户提前手动删除,无需处理
- 注:用户家目录 `~/.claude/rules/collaboration-rules.md`(个人全局规则)不属于本项目,未动
- 现状:`母版/` 目录仅剩 `ts-fullstack-consistency-template.md`(跨项目参考原件,保留)

---

# [2026-07-06 14:30:00] 追加:误删纠正 + 移除 joern-runner

## 误删纠正
- [x] 上一轮把用户"这个不需要"误解为指 collaboration-rules(实际指 joern-runner),已从字节级相同的
  `~/.claude/rules/collaboration-rules.md` 恢复 `.claude/rules/母版/collaboration-rules.md`(md5 校验一致)

## 移除 joern-runner(用户确认范围:只删 joern-runner,aisec 代码保留)
- [x] 停止并移除容器 `security-platform-joern-runner-1`
- [x] compose.yml 清理 5 处:joern-runner 服务块、aisec-api 的 JOERN_RUNNER_URL、
  aisec-worker 的 depends_on 与 JOERN_RUNNER_URL、两处注释;`docker compose config` 校验退出码 0
- [x] 删除 `joern-runner/` 目录;`.env` / override 本无 JOERN 变量
- [x] 根 CLAUDE.md 目录结构删去该行
- [x] aisec-api / aisec-worker / neo4j / temporal 容器不受影响仍在运行
- 注:aisec 代码(`cpg/joern_client.py` 等 8 文件)保留,其扫描链路自此不可用——aisec 本为未投产骨架,
  用户知情;`aisec/config.py` 里 JOERN_RUNNER_URL 默认值未动
