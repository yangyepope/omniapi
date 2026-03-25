# Plan: 局域网跨服 Nginx 镜像流量方案与 Trae 日志技能创建

## 1. 现状分析 (Current State Analysis)
- **业务需求 1 (网络架构)**: 用户询问如果是局域网的其他服务器（不是内网直连的 192.168.10.27 宿主机），如何实现 Nginx 流量转发，以及底层逻辑是什么。
- **业务需求 2 (Trae 技能扩展)**: 用户要求每次使用 `/plan` 时，自动将计划方案存入 `\root\omniapi\.trae\documents`。
- **业务需求 3 (Trae 技能扩展)**: 用户要求每次问答结束后，在 `\root\omniapi\.trae\documents\QA` 下记录对话。用户选择了“单文件拆分”的记录方式。
- **当前状态**: 经检索，项目中尚不存在自动记录 `/plan` 和 `Q&A` 的 Skill，需要手动创建。

## 2. 技术实现方案 (Proposed Architecture & Implementation)

### 2.1 局域网跨服务器的 Nginx 镜像底层逻辑
当上游 Nginx 和下游 FastAPI 不在同一台机器且需要通过局域网路由或网关（Traefik）通信时，底层转发逻辑如下：
1. **网络层连通**: Nginx 所在机器必须能通过局域网 IP (如 `192.168.10.x`) 或内部 DNS 域名解析到目标服务器。
2. **协议封装**: Nginx `mirror` 模块会把原始请求（包含完整的 TCP 负载、HTTP Method/URI/Body）复制一份，重新建立一个 HTTP 连接发往 `upstream`。
3. **Traefik 介入 (如果经过目标机的网关)**: 如果目标服务器不直接暴露 8000/8004 端口，而是只开了 80/443 (由 Traefik 接管)，则上游 Nginx 必须将请求发给 Traefik，并在 Header 中带上正确的 `Host` (如 `Host: api.domain.com`)，这样 Traefik 才能根据 `Host` 规则把流量路由到 FastAPI 容器的 `8000` 端口。

**方案总结**: 如果跨服务器，建议直接暴露宿主机端口直连 (如 8004) 以减少延迟；如果出于安全考虑必须走目标机的 Traefik，上游 Nginx `upstream` 指向目标机的 80 端口，且必须增加 `proxy_set_header Host api.yourdomain.com;`。

### 2.2 创建 `document-logger` Skill
为了满足用户对文档记录的要求，我们需要在 `.trae/skills/` 下创建一个名为 `document-logger` 的技能。

**Skill 职责**:
1. **Plan 记录**: 当检测到用户使用 `/plan` 时，自动将生成的计划 Markdown 内容保存至 `.trae/documents/`，以时间戳或主题命名。
2. **QA 记录**: 当检测到一轮问答结束时，将问答的核心内容保存至 `.trae/documents/QA/`，采用单文件拆分模式 (如 `2026-03-23_1200_topic.md`)。

**创建步骤**:
1. 创建目录: `mkdir -p /root/omniapi/.trae/skills/document-logger` 和 `/root/omniapi/.trae/documents/QA`
2. 编写 `SKILL.md`: 定义该技能的触发条件、执行逻辑和输出路径规范。
3. 将该技能注册到 `.trae/rules/AGENTS.md` (或类似的全局规则入口)，确保其在默认行为中生效。

## 3. 实施步骤 (Execution Steps)
1. **[只读/说明]** 向用户详细解释局域网跨服转发的底层逻辑。
2. **[执行]** 编写并创建 `document-logger` 技能的 `SKILL.md`。
3. **[执行]** 更新全局规则（如 `AGENTS.md`），将该技能设为默认激活的 P0 规则，或明确其触发场景。
4. **[执行]** 创建 `.trae/documents/QA` 目录。
5. **[执行]** 将本次的问答（关于 Nginx 跨服和 Skill 创建）作为第一次测试，存入 QA 目录。

## 4. 验证步骤 (Verification)
- 检查 `/root/omniapi/.trae/skills/document-logger/SKILL.md` 是否存在且内容正确。
- 检查 `/root/omniapi/.trae/documents/QA` 目录下是否成功生成了第一份问答记录文档。
