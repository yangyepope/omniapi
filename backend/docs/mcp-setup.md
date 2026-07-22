# MCP Server 接入指南 (Claude Desktop / Cursor)

security-platform backend 在 `/mcp/sse` 暴露一个 MCP server,让 LLM 客户端用自然语言操作安全平台 — 列 findings、标 FP、触发 scan,不用 CLI / UI。

---

## 一、security-platform 这边怎么配

### 1. 生成 MCP token

```bash
openssl rand -hex 32
# 比如得到: 8a4f...c91d
```

### 2. 写进 security-platform backend .env

```bash
SECURITY_PLATFORM_MCP_TOKEN=8a4f...c91d        # 上一步生成的值
```

### 3. 重启 security-platform backend

```bash
cd /home/dreamer/security-platform
docker compose up -d backend
```

容器启动后 log 应看到:

```
✅ [MCP] scanner MCP server mounted at /mcp/sse
```

如果显示 `MCP server disabled`,token 没生效;`mcp package not installed` 则 image 没装 mcp 包,需要 rebuild。

### 4. 验证 mount(可选)

```bash
# 无 token → 401
curl -i http://localhost:8001/mcp/sse | head -3

# 带 token → 200 SSE stream
curl -i -H "Authorization: Bearer 8a4f...c91d" http://localhost:8001/mcp/sse
```

---

## 二、Claude Desktop 这边怎么配

编辑 Claude Desktop 配置文件:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

加进 `mcpServers`:

```json
{
  "mcpServers": {
    "security-platform-scanner": {
      "url": "http://security-platform.internal:8001/mcp/sse",
      "headers": {
        "Authorization": "Bearer 8a4f...c91d"
      }
    }
  }
}
```

> 把 `security-platform.internal` 换成你 security-platform backend 的实际地址;`Bearer` 后面那串换成上面生成的 token。

**保存后完全退出 Claude Desktop 再重新打开**(必须重启,不然不会重载配置)。

---

## 三、可用工具(7 个)

打开 Claude Desktop 新建对话,可以用 `@security-platform-scanner` 唤起工具菜单,也可以直接说话让 AI 自己挑工具。

| 工具 | 用途 |
|---|---|
| `list_findings` | 列 finding,支持 service / severity / status / engine / rule_prefix / limit / offset 过滤 |
| `get_finding` | 单条 finding 详情含 verifier 反驳理由 |
| `triage_finding` | 标 fp / fixed / wontfix / suppressed / duplicate / reopen,带 reason 和 by(操作员邮箱) |
| `list_services` | 列服务 + 计数 + 最近一次 scan 时间 |
| `list_scan_runs` | 一个 service 的扫描历史 |
| `trigger_scan` | 手动触发 scan,返 task_id 后通过 list_scan_runs 看状态 |
| `stats` | dashboard 总览 — by severity / engine / status |

---

## 四、对话示例

```
你: 我们 aam-parent 项目有多少 HIGH 级别的真问题?

Claude: [调 list_findings(service="aam-parent", severity="HIGH", status="open")]
        当前有 150 条 HIGH 级别的 open finding。其中:
          - 11 条 inner-secret 默认值相关
          - 5 条 verbose error message 暴露
          - ... 要列详情吗?

你: 11 条 inner-secret 详情

Claude: [调 list_findings(service="aam-parent", rule_prefix="ai/owasp_api02")]
        显示 11 条,每条带文件:行号 + Claude verifier 给的理由。

你: #501 我看过了是真问题但 dev 已修。标 fixed

Claude: [调 triage_finding(501, "fixed", "operator confirmed fix", "yangye@company.com")]
        ✓ #501 已标 fixed。

你: 把 #515 标误报,理由是 single-admin 模式下 BOLA 不适用

Claude: [调 triage_finding(515, "fp", "single-admin 模式 BOLA 不适用", "yangye@company.com")]
        ✓ #515 已标 fp。下次 scan 时 AI 会自动跳这条同类 pattern。

你: 重新跑一遍 aam-parent

Claude: [调 trigger_scan("aam-parent")]
        ✓ scan 启动 (task=abc12345),大概 50-60 分钟。要我等完成提醒你吗?
```

---

## 五、谁该用 MCP,谁该用前端

| 场景 | 走哪条 |
|---|---|
| 例行打开 Dashboard 看一眼 | **前端 UI**(更直观) |
| 批量浏览/筛选 finding | **前端 UI**(表格更好用) |
| 写一句话说清楚要的过滤条件 | **MCP**(自然语言比一堆 checkbox 快) |
| 跨多条做批量决策,带复杂 reason | **MCP**(让 AI 帮你按 pattern 一次性标) |
| 调度 / 联动其它工具(JIRA / Slack) | **MCP**(让 Claude 串多个工具) |
| 不会用 CLI 也不爱 click 的人 | **MCP** |

两条路并行,共用 ScannerClient,共用同一份数据。

---

## 六、安全注意

- **不要把 SECURITY_PLATFORM_MCP_TOKEN 提交进 git**。`.env` 已在 `.gitignore`,别复制到别处。
- **不要在多人共用机器上写进 claude_desktop_config.json**。token 是 root-level 权限,任何 MCP 调用都可以触发 scan / 改 finding 状态。
- **token 长期有效**。要轮转就改 security-platform .env + 同步改 Claude Desktop config + 重启 security-platform backend。
- **生产建议加 IP 白名单**(在 security-platform 前面的反向代理上),只允许内网调 `/mcp/*`。

---

## 七、排查

| 现象 | 原因 |
|---|---|
| Claude Desktop 显示 "Failed to connect" | security-platform `/mcp/sse` 不可达 — 试 curl 上面那个命令 |
| `SECURITY_PLATFORM_MCP_TOKEN unset` (503) | security-platform .env 没配,或没重启 security-platform backend |
| `invalid bearer token` (401) | Claude Desktop config 里的 token 跟 security-platform .env 不一致 |
| Tool 调用报 `scanner unreachable` | security-platform 连不上 scanner — 看 `SCANNER_BASE_URL` 和网络可达性 |
| Tool 调用报 `scanner refused security-platform credentials` | scanner 那边 `SCANNER_ADMIN_TOKEN` 跟 security-platform `.env` 里的不一致 |

---

## 八、扩展

要加新 MCP tool? 编辑 `security-platform/backend/app/mcp/scanner_mcp_server.py`,加一个 `@mcp.tool()` 装饰函数即可。tool 函数文档字符串会被 Claude 当成工具说明读。

要换 transport(stdio 而非 SSE)? FastMCP 同时支持。stdio 适合 Claude Desktop 直接 launch 进程的场景,不需要网络;但 security-platform 是常驻服务,SSE 更合适。
