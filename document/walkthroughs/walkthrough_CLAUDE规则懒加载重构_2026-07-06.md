# [2026-07-06 12:50:00] CLAUDE.md 规则体系改为目录级懒加载结构

## 操作描述

用户要求把规则组织方式改为 Claude Code 的目录级懒加载结构:
根 CLAUDE.md 每次会话自动载入(只放全局规则),子目录 CLAUDE.md 仅在操作该目录文件时载入。
目的:减小无关上下文——改前端时不载入后端并发铁律,反之亦然。

## 改动详情

- [x] 重写 [CLAUDE.md](../CLAUDE.md)(根):
  - 只保留全局内容:`01-工作流与语言规范` + `collaboration-rules` 母版 + `AI_GUIDE`
  - 移除 02–06 的直接 `@` 导入,新增「规则分布地图」表说明各目录载入时机
  - 优先级章节改为"目录级铁律 > 全局铁律 > 协作母版"
- [x] 新建 [backend/CLAUDE.md](../backend/CLAUDE.md):`@../` 引用 02、04、06
- [x] 新建 [frontend/CLAUDE.md](../frontend/CLAUDE.md):`@../` 引用 03、05
- [x] 新建 [aisec/CLAUDE.md](../aisec/CLAUDE.md):复用 02、04、06
  (aisec 是平级 FastAPI 服务;04 的行锁/Upsert 纪律对其 `aisec_audit` 库写操作
  与 Temporal Worker 同样适用,备注已写入该文件)
- 规则本体全部留在 `.claude/rules/`(单一真相源),各级 CLAUDE.md 只引用不复制,
  `.agent/`、`.trae/` 等其它工具的引用路径不受影响

## 验证结果

- [x] 脚本逐一校验 4 个 CLAUDE.md 的全部 11 条 `@` 引用,均解析到真实文件(相对路径正确)
- [x] 懒加载语义确认:祖先 CLAUDE.md 始终载入,子目录 CLAUDE.md 触碰其文件时载入,
  兄弟目录互不载入(Claude Code 官方 memory 机制)

## 遗留

- 根目录 `collaboration-rules.md`、`ts-fullstack-consistency-template.md` 冗余副本仍待用户确认删除
- `collect.py` / `douyin.py` async 路由注入同步 Session 的代码修复待安排(见 06 附录)
