# 前端一键「重建+部署 scanner」的部署前置

- **类型**: 操作手册 / 部署前置
- **关联**: FEAT-007

## 是什么

security-platform 扫描配置页「运维操作」的「重建并部署扫描器」按钮,让平台后端经 docker.sock 跑 `docker compose build scanner && up -d scanner`,一键用最新代码重建重启 scanner。

## 前置条件(部署这台机器时必须满足)

1. **平台后端镜像含 docker CLI + compose 插件**:`backend/Dockerfile` 已 `COPY --from=docker:27-cli`。改了 Dockerfile 后需 `docker compose build backend`。
2. **backend 容器挂载**(compose.yml 已配):
   - `/var/run/docker.sock:/var/run/docker.sock` —— 主机容器控制权。
   - `${SCANNER_PROJECT_DIR_HOST}:${SCANNER_PROJECT_DIR_HOST}` —— scanner 仓库,**挂到与宿主机一致的同名路径**(关键,见下)。
3. **`.env` 配置**(本机默认已填):
   - `SCANNER_PROJECT_DIR_HOST=/home/dreamer/gitlab-scanner`(宿主机上 scanner 仓库路径)
   - `SCANNER_COMPOSE_PROJECT=gitlab-scanner`(必须与 scanner 原始部署的 compose 项目名一致,否则 `up -d` 与固定 `container_name=gitlab-scanner` 冲突)
   - 后端配置 `SCANNER_PROJECT_DIR` 默认 = 该宿主机路径。

## ⚠ 关键坑:必须挂"同名路径"

docker 的 bind 挂载源路径由**宿主机 daemon** 解析,不是发命令的容器。scanner 的 compose 用相对 bind(`./examples/manifest.yml`)。若把 scanner 仓库挂到容器内自定义路径(如 `/opt/scanner-project`)并以此作 `--project-directory`,daemon 会在**宿主机**上找 `/opt/scanner-project/examples/manifest.yml` → 找不到 → 自动建**空目录**挂进去 → scanner 启动 `IsADirectoryError` 崩溃重启。

**所以必须**:`SCANNER_PROJECT_DIR_HOST` 挂到容器内的**同名路径**,并作 `--project-directory`——这样 `-f` 在容器内可读、bind 源又能在宿主机正确解析。换机器部署改 `SCANNER_PROJECT_DIR_HOST` 为该机 scanner 仓库真实路径即可。

## 验证

- 容器内:`docker exec <backend> docker compose --project-directory $SCANNER_PROJECT_DIR -f $SCANNER_PROJECT_DIR/docker-compose.yml -p gitlab-scanner config | grep manifest.yml` → source 应为**宿主机绝对路径**。
- 点按钮 → `GET /api/v1/security/ops/scanner/status` 走 running→success → `docker ps` 里 gitlab-scanner 重建且 healthz ok。

## 安全

docker.sock 挂进平台后端 = 该后端拿到宿主机全部容器的控制权。内部工具,**勿把该后端暴露到不可信网络**;ops 接口当前沿用平台登录态、未做额外 RBAC。
