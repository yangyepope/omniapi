# Walkthrough：项目改名 OmniAPI → Security Platform（任务 #183）

**日期**：2026-07-02
**范围**：跨服务 / 架构级（backend、frontend、aisec、compose、多工具规则目录、历史文档）
**类型**：REFACTOR / OPS
**状态**：代码与配置改名已完成并通过语法校验；**数据层迁移(DB + docker 卷)待人工执行**（见下文「必做迁移步骤」）。

---

## 一、操作描述

将全仓库 274 处 `omniapi`（各大小写形态）统一改名为 `security-platform`。采用**有序、大小写敏感**的替换，区分「功能性标识符」与「品牌/展示文案」，避免 HTTP 头契约、环境变量、数据库名被破坏。

## 二、改动详情

### 命名映射（大小写敏感，specific → generic）

| 旧 | 新 | 类别 |
|---|---|---|
| `OMNIAPI_MCP_TOKEN` | `SECURITY_PLATFORM_MCP_TOKEN` | 环境变量（config.py 字段 + 5 处 reader + .env + 前端展示 + docs 同步）|
| `OmniAPI_PG` | `security_platform_pg` | PostgreSQL 数据库名（**需迁移**）|
| `omniapi_app-db-data` / `omniapi_aisec-cache` / `omniapi_neo4j-data` / `omniapi_neo4j-logs` | `security-platform_*` | docker 外部数据卷（**需迁移**）|
| `omni-api` | `security-platform` | copier stack_name |
| `OmniAPI`（无空格 PascalCase）| `SecurityPlatform` | HTTP 头契约 / 代码内标识（头名不能含空格）|
| `omniapi`（小写）| `security-platform` | 主机名 `*.internal`、镜像命名空间 `*/aisec`、容器名 doc 引用、绝对路径、散文注释 |

### 展示文案润色（空格版，纯 UI，无契约）

- `.env` `PROJECT_NAME='Security Platform Service'`
- `frontend/index.html` `<title>Security Platform</title>`
- `frontend/src/routes/_layout/index.tsx` `Dashboard - Security Platform`
- `frontend/src/routes/_layout/services/index.tsx` `服务管理 - Security Platform`

### 关键契约保持一致

- **HTTP 重放环路检测头**：生产者 `http_pool.py` 发 `User-Agent: SecurityPlatform-HighScale-Replayer/2.0`，匹配器 `collect.py` 判 `X-SecurityPlatform-Replay` 头与 `"SecurityPlatform-Replayer" in User-Agent`——两端同步替换，子串关系与改名前完全等价。
- **MCP 鉴权变量**：`config.py` 字段名、`main.py`/`security.py`/`scanner_mcp_server.py` 全部 reader、`.env` 键名、`backend/docs/mcp-setup.md`、`MCPPanel.tsx` 展示 —— 全部为 `SECURITY_PLATFORM_MCP_TOKEN`。token 值未变，无需轮换。
- **compose 项目名**已是 `security-platform`，故容器名运行时即 `security-platform-*`；`.agent/settings.local.json` 里过时的 `omniapi-db-1` 权限项被顺带修正为 `security-platform-db-1`。

## 三、验证结果

- [x] 全仓 `grep -ri omniapi` 残留 = **0**（排除 node_modules/.git/.venv/lock）
- [x] `docker compose config -q` 通过
- [x] `backend/app/{main,core/config,core/http_pool,api/routes/collect,api/routes/security,mcp/scanner_mcp_server}.py` AST 语法通过
- [x] `.claude/.agent/settings.local.json`、`devcontainer.json`、`.copier-answers.yml` JSON 解析通过
- [ ] **数据层迁移未执行**（DB 改名 + 卷迁移，见下）

## 四、必做迁移步骤（人工执行，具破坏性，勿在有连接时进行）

> 这两步涉及真实数据，未执行前**切勿 `docker compose up`**（外部卷 `security-platform_*` 尚不存在会直接报错）。先停栈。

```bash
# 0) 停栈
docker compose down

# 1) 迁移 docker 卷：omniapi_* → security-platform_*（docker 无原生 rename，创建新卷并整体拷贝）
for pair in \
  "omniapi_app-db-data security-platform_app-db-data" \
  "omniapi_aisec-cache security-platform_aisec-cache" \
  "omniapi_neo4j-data security-platform_neo4j-data" \
  "omniapi_neo4j-logs security-platform_neo4j-logs"; do
  set -- $pair
  docker volume create "$2"
  docker run --rm -v "$1":/from -v "$2":/to alpine sh -c "cd /from && cp -a . /to/"
done

# 2) 起 db（仅 db），改数据库名 OmniAPI_PG → security_platform_pg
docker compose up -d db
docker exec -i security-platform-db-1 \
  psql -U postgres -d postgres \
  -c 'ALTER DATABASE "OmniAPI_PG" RENAME TO security_platform_pg;'

# 3) 起全栈验证
docker compose up -d
docker compose ps
# 打接口 / 看日志确认 backend 能连库、MCP 鉴权正常

# 4) 确认无误后，回收旧卷（可选，确认后再删）
# docker volume rm omniapi_app-db-data omniapi_aisec-cache omniapi_neo4j-data omniapi_neo4j-logs
```

### 镜像重建（若用默认镜像名）

compose 默认镜像名已改为 `security-platform/aisec`、`security-platform/joern-runner`。若本地按默认名构建，需重新 `docker compose build`（或通过 `DOCKER_IMAGE_AISEC` / `DOCKER_IMAGE_JOERN_RUNNER` 覆盖）。

## 五、影响范围

backend（config/main/collect/security/http_pool/mcp）、frontend（title/展示/security 面板）、aisec（注释/env 示例）、compose、`.env`、`.copier-answers.yml`、`.devcontainer`、多工具规则目录（`.claude`/`.agent`/`.trae`/`.cursor`）、历史文档（`document/`、各服务 `document/walkthrough_*`、`.trae/documents/`）。
