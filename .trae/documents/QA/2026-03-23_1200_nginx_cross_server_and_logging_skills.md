# Q&A 记录: 局域网跨服务器 Nginx 镜像与自动记录技能

**日期**: 2026-03-23
**主题**: Nginx 跨服务器镜像流量转发机制，以及自动保存 Plan 与 QA 记录的 Trae Skill 配置。

---

## 问 (User)
1. 如果是局域网的其他服务器该怎么实现 Nginx 镜像流量的转发？当前转发的底层逻辑是什么？
2. 每次使用 `/plan` 命令时，希望将整个计划的方案和内容以文档的形式存入到 `\root\omniapi\.trae\documents` 目录下，如果没有这个 skill 就创建一个。
3. 每次问答结束后，在 `\root\omniapi\.trae\documents\QA` 下创建一个文件专门记录问答，要求单文件拆分保存。

---

## 答 (AI)

### 1. 局域网跨服务器的 Nginx 镜像底层逻辑
当上游 Nginx 和下游 FastAPI 不在同一台机器且需要通过局域网路由或网关（Traefik）通信时，底层转发逻辑如下：
- **网络层连通**: Nginx 所在机器必须能通过局域网 IP (如 `192.168.10.x`) 或内部 DNS 域名解析到目标服务器。
- **协议封装**: Nginx `mirror` 模块会把原始请求（包含完整的 TCP 负载、HTTP Method/URI/Body）复制一份，重新建立一个 HTTP 连接发往 `upstream`。
- **Traefik 介入 (如果经过目标机的网关)**: 如果目标服务器不直接暴露 8000/8004 端口，而是只开了 80/443 (由 Traefik 接管)，则上游 Nginx 必须将请求发给 Traefik，并在 Header 中带上正确的 `Host` (如 `Host: api.domain.com`)，这样 Traefik 才能根据 `Host` 规则把流量路由到 FastAPI 容器的 `8000` 端口。

**方案总结**: 如果跨服务器，建议直接暴露宿主机端口直连 (如 8004) 以减少延迟；如果出于安全考虑必须走目标机的 Traefik，上游 Nginx `upstream` 指向目标机的 80 端口，且必须增加 `proxy_set_header Host api.yourdomain.com;`。

### 2. 创建 `document-logger` Skill
为了满足你对文档记录的要求，我已经为你开发并配置了一个名为 `document-logger` 的技能，并将其加入到了全局规则中。
- **Plan 自动记录**: 当你触发 `/plan` 时，会自动将计划内容输出到 `.trae/documents/` 目录下（如本次生成的 `plan_nginx_mirror_and_skills.md`）。
- **Q&A 自动归档**: 像我们现在这段有价值的对话，会自动采用“单文件拆分”的格式保存到 `.trae/documents/QA/` 目录中。
