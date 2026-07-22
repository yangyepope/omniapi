# FEAT-007 运维面板:一键重建+部署 scanner

- **编号**: FEAT-007
- **日期**: 2026-07-07
- **状态**: 已完成
- **类型**: 新功能

## 需求背景

scanner 改完代码要"重建镜像 + 重启部署",以前只能上机器敲命令。把这个操作放进 security-platform 前端,点按钮就能重建部署。内部工具,不额外做鉴权(沿用现有 `CurrentUser`);用挂 docker.sock 直控。

## 讨论过程

- 范围:就一个操作「重建+部署 scanner」(`docker compose build scanner && up -d scanner`)。
- 执行:平台后端挂 `/var/run/docker.sock` + docker CLI/compose 插件,直接跑 compose。
- 鉴权:内部工具,不折腾(仅注释标注,勿暴露外网 = 主机容器控制权)。
- 安全垫:配合 scanner FIX-009,重建期间在跑的扫描被自动 interrupted → 断点续跑,按钮不再"点一下丢一次扫描"。

## 技术实现

- 后端 `backend/Dockerfile`:`COPY --from=docker:27-cli` 拿 docker CLI + compose v2 插件(静态二进制,不装 apt/不下 github,复用 uv 的 COPY 套路)。
- `compose.yml` backend:挂 `docker.sock` + **把 scanner 仓库挂到同名宿主机路径**(`/home/dreamer/gitlab-scanner:/home/dreamer/gitlab-scanner`)+ env `SCANNER_PROJECT_DIR`(=宿主机路径)/`SCANNER_COMPOSE_PROJECT`。
- `backend/app/services/ops_runner.py`:后台跑 `docker compose -p <proj> --project-directory <dir> -f <dir>/docker-compose.yml build scanner` 成功后 `up -d scanner`;单例状态 + `asyncio.Lock` 防并发;环形日志尾巴。
- `backend/app/api/routes/security.py`:`POST /security/ops/scanner/redeploy`(idempotent,已在跑返回 already_running)+ `GET /security/ops/scanner/status`。
- 前端:`security/api.ts`(`redeployScanner`/`opsStatus`+`OpsStatus` 类型)、`hooks.useOpsStatus(live)`(running 2s 轮询)、`security/OpsPanel.tsx`(按钮+二次确认+状态徽章+实时日志),挂在扫描配置页 `ConfigPage` 顶部「运维操作」。

### ⚠ 踩坑记录(docker-out-of-docker bind 路径)
第一版把 scanner 仓库挂到容器内自定义路径 `/opt/scanner-project` 并以此作 `--project-directory`,结果 `up -d` 后 scanner **崩溃重启**:`IsADirectoryError: /etc/scanner/manifest.yml`。根因:compose 的相对 bind(`./examples/manifest.yml`)由**宿主机 docker daemon** 按 `--project-directory` 解析成宿主机绝对路径;给容器内路径 `/opt/scanner-project/...`,daemon 在宿主机上找不到 → 自动建**空目录**挂到 `/etc/scanner/manifest.yml` → scanner 读到目录崩溃。**修复:把 scanner 仓库挂到与宿主机一致的同名路径**(`/home/dreamer/gitlab-scanner`),`-f` 在容器内可读、`--project-directory` 又能在宿主机正确解析 bind 源。

## 验证方式

- [x] `docker compose build backend`(装 docker CLI)→ `up -d backend`;容器内 `docker version`=27.5.1、`docker compose version`=2.33.0、`compose config --services` 出 db/scanner/nvd-sync(证明 socket+CLI+挂载通)。
- [x] `compose config` 解析出 manifest bind 源 = 宿主机路径 `/home/dreamer/gitlab-scanner/examples/manifest.yml`(修复后)。
- [x] `POST /ops/scanner/redeploy` → `GET /ops/scanner/status` 轮询 running(build→up)→ success(rc=0);scanner 重建重启后 healthz 正常、manifest 挂载是文件。
- [x] 并发保护:重建中再 POST → already_running,不起第二个 build。
- [ ] 前端:扫描配置页「运维操作」点「重建并部署扫描器」→ 状态徽章 构建中→成功、日志实时滚。
