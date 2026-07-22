# [2026-07-06 15:20:00] 规则体系重构:paths 按需加载落地

## 操作描述

按用户确认的方案,把规则组织从"子目录 CLAUDE.md 懒加载"改为
**`.claude/rules/*.md` + `paths:` frontmatter 按需加载**,并清理无差别注入的参考资料。
方案讨论与决策记录见 [document/changelog/REFACTOR-001-规则体系paths按需加载重构.md](../changelog/REFACTOR-001-规则体系paths按需加载重构.md)。

## 改动详情

- [x] frontmatter 改造:01 去掉 Cursor 式 frontmatter 保持全局;02/04/06 → `paths: ["backend/**","aisec/**"]`;
  03/05 → `paths: ["frontend/**"]`(02–04 原为 Cursor `.mdc` 的 `globs`/`alwaysApply`,Claude Code 不识别,已转换)
- [x] 新建 `.claude/rules/07-后端服务概览.md`、`08-前端服务概览.md`、`09-aisec服务概览.md`(均带 paths):
  承接子目录 CLAUDE.md 的独有内容(技术栈/常用命令/目录结构/aisec 特有规则:Temporal 视同 Celery、回传不阻断、禁宣称可投产)
- [x] 删除 `backend/CLAUDE.md`、`frontend/CLAUDE.md`、`aisec/CLAUDE.md`(硬性规则由 02–06 全文按 paths 载入,不再需要摘要副本)
- [x] `ecc/`、`母版/`(含 collaboration-rules 项目副本,自此不再重复注入)、`AGENTS.md`(Trae)
  移到 `.claude/reference/`,停止自动加载;`.agent/`、`.trae/` 自有副本不受影响
- [x] 根 CLAUDE.md 目录结构节更新(去掉指向已删文件的指引,标注 rules/reference 机制)
- [x] 核查 01 的 walkthrough/plans 路径口径已与新文档树一致,无矛盾

## 验证结果

- [x] `.claude/rules/` 终态 = 01–09 共 9 个文件;01 无 frontmatter(全局),02–09 均带合法 `paths:`
- [x] `.claude/reference/` = ecc/ + 母版/ + AGENTS.md
- [x] grep 全仓:除历史 walkthrough 与 settings.json 权限清单外,无存活引用指向旧路径
- [x] changelog 索引已更新(REFACTOR 下一编号 002)

## 效果

- 每次会话固定注入:根 CLAUDE.md + 01 + 用户全局 `~/.claude/rules/`;其余规则按触碰路径载入
- 消除三重浪费:ecc 中英双份、母版与全局重复、Trae 规则误注入

---

# [2026-07-06 15:50:00] 追加:规则组织母版落地

- [x] 新建规则组织母版,最终落位 `.claude/rules/00-规则组织母版.md`(项目内、进 git、无 frontmatter 全局载入):
  固化"CLAUDE.md 保持薄 + `.claude/rules/NN-主题.md` + `paths:` 按需加载 + reference/ 不注入"模式,
  含新建规则文件模板、新增前自查清单、四条反模式(Cursor frontmatter/双份注入/多副本/参考资料混入 rules)
- 曾短暂放 `~/.claude/rules/`(用户全局),按用户要求移入项目并删除家目录副本,避免双份注入;
  其它项目复用时从本项目复制该文件即可

---

# [2026-07-06 16:30:00] 追加:抽出独立通用规则库 claude-rules

## 决策(经用户确认)
- 分发机制:独立仓库 + `install.sh` 复制式安装(否决 submodule/plugin/symlink)
- 收录范围:只收通用规则,项目特化(02/03/05/07/08/09)留在 security-platform

## 落地
- [x] 新建 `~/claude-rules`(与 security-platform 平级,独立 git,已首次提交 b708bdd,87 文件)
- [x] 结构:`rules/{common,workflow,backend,frontend,ecc}` + `install.sh` + `README.md`
- [x] 通用规则去项目特化:
  - workflow/工作流与语言规范:重写,去掉 SecurityPlatform 名/aisec 服务示例/尾部乱码,服务名改占位
  - backend/fastapi-编码最佳实践:存量缺口改为空模板,交叉引用(02/04)泛化
  - backend/数据库并发安全:skill 路径改"项目自备"提示,02 交叉引用泛化
  - frontend/前端一致性规范:存量缺口改空模板,header 去掉悬空的 母版/03 引用
  - common/00 + 01(协作准则=collaboration-rules)本就纯通用,原样收录
  - ecc/ 多语言规则集原样收录(本就语言无关)
- [x] install.sh:common+workflow 总装,backend/frontend/ecc:<语言> 按需;平铺进 .claude/rules/ 保 paths 生效;默认不覆盖(--force 覆盖)
- [x] 实跑验证:装入临时项目结构正确;二次运行全部跳过(幂等不覆盖项目特化)

## 与本项目的关系
- security-platform 是 claude-rules 的参考实现;本项目 .claude/rules/ 里的通用规则(00/01/04/06/05)
  日后可改为从 claude-rules 重装同步,特化规则(02/03/07/08/09)始终本地维护
- 暂未把 claude-rules 推远程,也未改动 security-platform 现有规则(仅新增记录)

---

# [2026-07-06 17:10:00] 追加:bug 踩坑清单规则集

## claude-rules 侧(提交 6c240b9)
- [x] 新增 `rules/bug-lessons/`:`bug-复盘-backend.md`(paths: backend/**)、`bug-复盘-frontend.md`(paths: frontend/**)
  - 每份含:只增不删说明 + 写坑格式(现象→根因→铁律→tripwire)+ 索引表 + 真实种子条目
  - 后端种子:B-001 async 路由用同步 Session、B-002 查-判-写并发重复
  - 前端种子:F-001 mutation 后未 invalidate、F-002 useEffect 手动 fetch 竞态
- [x] install.sh 新增 `bug` 集 + `seed_file`:只在文件不存在时播种,**--force 也不覆盖**(保护积累记录)
- [x] 验证:首装播种两份;模拟追加 F-999 后 --force 重装,追加内容保住未被覆盖

## security-platform 侧
- [x] 装入 bug 清单两份文件(`bug-复盘-backend/frontend.md`)
- [x] 清理副作用:install 总装 common 时带入的 `01-协作准则-karpathy.md` 与全局 `~/.claude/rules/collaboration-rules.md`
  内容一致(diff 确认),按 00 母版"禁双份注入"删除本地副本

## 用法
每修一个前后端 bug,往对应 `bug-复盘-*.md` 追加一条;改该端代码时 Claude 按 paths 自动加载该清单。
