# Claude Code 斜杠命令大全

> 整理日期：2026-04-02

---

## Agent 与对话管理

| 命令 | 说明 |
|------|------|
| `/agents` | 管理 Agent 配置，创建、编辑和控制子 Agent |
| `/resume [session]` | 通过 ID 或名称恢复对话，或打开会话选择器。别名：`/continue` |
| `/branch [name]` | 在当前位置创建对话分支。别名：`/fork` |
| `/rewind` | 将对话和/或代码回退到之前某个节点。别名：`/checkpoint` |

---

## 会话与导航

| 命令 | 说明 |
|------|------|
| `/clear` | 清除对话历史，释放上下文空间。别名：`/reset`、`/new` |
| `/rename [name]` | 重命名当前会话；不传参数则根据对话历史自动生成名称 |
| `/compact [instructions]` | 压缩对话历史，可附加聚焦指令 |
| `/exit` | 退出 CLI。别名：`/quit` |
| `/help` | 显示帮助和可用命令列表 |

---

## 模型与配置

| 命令 | 说明 |
|------|------|
| `/model [model]` | 选择或切换 AI 模型；支持左右方向键调整 effort 等级 |
| `/effort [low\|medium\|high\|max\|auto]` | 设置模型 effort 等级；`max` 仅当前会话生效（需 Opus 4.6） |
| `/config` | 打开设置界面，调整主题、模型、输出风格等偏好。别名：`/settings` |
| `/theme` | 切换颜色主题，包括浅色/深色、色盲友好及 ANSI 主题 |
| `/color [color\|default]` | 设置当前会话提示栏颜色（red/blue/green/yellow/purple/orange/pink/cyan） |

---

## 计划与权限

| 命令 | 说明 |
|------|------|
| `/plan [description]` | 进入计划模式；可附加描述直接开始任务，如 `/plan fix the auth bug` |
| `/permissions` | 管理工具权限的允许/询问/拒绝规则。别名：`/allowed-tools` |

---

## 文件与上下文管理

| 命令 | 说明 |
|------|------|
| `/add-dir <路径>` | 在当前会话中添加额外的工作目录，供文件访问使用 |
| `/memory` | 编辑 `CLAUDE.md` 记忆文件，启用/禁用自动记忆，查看记忆条目 |
| `/init` | 初始化项目，生成 `CLAUDE.md` 引导文件 |
| `/context` | 可视化显示当前上下文使用量，并提供优化建议 |

---

## 代码审查与差异

| 命令 | 说明 |
|------|------|
| `/diff` | 打开交互式差异查看器，显示未提交的变更和每轮对话的 diff |
| `/security-review` | 分析当前分支的待提交变更，检查安全漏洞（注入、认证问题、数据泄露等） |
| `/pr-comments [PR]` | 获取并显示 GitHub PR 的评论（需安装 `gh` CLI） |
| `/review` | **已废弃**，请改用 `code-review` 插件 |

---

## 集成与工具

| 命令 | 说明 |
|------|------|
| `/mcp` | 管理 MCP 服务器连接和 OAuth 认证 |
| `/chrome` | 配置 Claude in Chrome 设置 |
| `/plugin` | 管理 Claude Code 插件 |
| `/reload-plugins` | 重新加载所有激活的插件以应用变更，无需重启 |
| `/skills` | 列出所有可用技能（Skills） |
| `/hooks` | 查看工具事件的钩子（Hook）配置 |
| `/keybindings` | 打开或创建快捷键配置文件 |

---

## 环境与系统

| 命令 | 说明 |
|------|------|
| `/doctor` | 诊断并验证 Claude Code 安装和配置 |
| `/status` | 打开设置界面（状态标签），显示版本、模型、账号和连接状态 |
| `/version` | 输出当前版本号（也可用 `claude -v`） |
| `/terminal-setup` | 配置终端快捷键（如 Shift+Enter），适用于 VS Code、Alacritty、Warp 等 |
| `/sandbox` | 切换沙箱模式（仅支持特定平台） |
| `/remote-env` | 配置远程会话的默认远程环境 |

---

## IDE 集成

| 命令 | 说明 |
|------|------|
| `/ide` | 管理 IDE 集成并显示状态 |
| `/desktop` | 在 Claude Code 桌面应用中继续当前会话（仅 macOS 和 Windows）。别名：`/app` |

---

## 远程与云端

| 命令 | 说明 |
|------|------|
| `/remote-control` | 使当前会话可从 claude.ai 进行远程控制。别名：`/rc` |
| `/schedule [description]` | 创建、更新、列出或运行云端定时任务 |

---

## 输出与分享

| 命令 | 说明 |
|------|------|
| `/copy [N]` | 复制最后一条 AI 回复到剪贴板；`/copy 2` 复制倒数第二条；有代码块时显示选择器 |
| `/export [filename]` | 将当前对话导出为纯文本文件 |

---

## 用量与统计

| 命令 | 说明 |
|------|------|
| `/cost` | 显示 Token 使用统计 |
| `/usage` | 显示计划用量限制和速率限制状态 |
| `/stats` | 可视化每日用量、会话历史、连续使用天数和模型偏好 |
| `/insights` | 生成分析报告，包括项目领域、交互模式和使用痛点 |
| `/extra-usage` | 配置触达速率限制后的额外用量 |

---

## 账号与认证

| 命令 | 说明 |
|------|------|
| `/login` | 登录 Anthropic 账号 |
| `/logout` | 退出登录 |
| `/upgrade` | 打开升级页面（仅 Pro/Max 计划可用） |
| `/passes` | 向好友分享一周免费的 Claude Code 使用权（符合条件的账号可见） |
| `/privacy-settings` | 查看和更新隐私设置（仅 Pro/Max 计划订阅者可用） |

---

## 模式与功能

| 命令 | 说明 |
|------|------|
| `/vim` | 切换 Vim 编辑模式 |
| `/fast [on\|off]` | 切换快速模式开/关 |
| `/voice` | 切换语音听写（需要 Claude.ai 账号） |
| `/statusline` | 配置 Claude Code 状态栏；不传参数则根据 Shell 提示符自动配置 |

---

## 后台任务

| 命令 | 说明 |
|------|------|
| `/tasks` | 列出并管理后台任务。别名：`/bashes` |
| `/btw <问题>` | 在不影响主对话的情况下提一个临时的侧边问题 |

---

## 其他

| 命令 | 说明 |
|------|------|
| `/feedback [report]` | 提交关于 Claude Code 的反馈。别名：`/bug` |
| `/release-notes` | 查看完整更新日志 |
| `/install-github-app` | 为仓库设置 Claude GitHub Actions 应用 |
| `/install-slack-app` | 安装 Claude Slack 应用（通过浏览器完成 OAuth 流程） |
| `/mobile` | 显示 Claude 移动端 App 下载二维码。别名：`/ios`、`/android` |
| `/stickers` | 订购 Claude Code 贴纸 |

---

## 内置技能命令（Skills）

当前会话已配置的技能，输入 `/` 可见：

| 命令 | 说明 |
|------|------|
| `/simplify` | 审查已修改的代码，优化复用性、质量和效率 |
| `/loop` | 按固定间隔循环执行命令（如 `/loop 5m /foo`，默认 10 分钟） |
| `/schedule` | 创建/管理定时远程 Agent 任务 |
| `/update-config` | 通过 `settings.json` 配置 Claude Code 自动化行为（钩子等） |
| `/keybindings-help` | 自定义键盘快捷键 |
| `/claude-api` | 使用 Claude API 或 Anthropic SDK 构建应用 |

---

## MCP 动态命令

连接 MCP 服务器后，会自动发现以下格式的命令：

```
/mcp__<服务器名>__<命令名>
```

---

## 快捷提示

- 在提示符前输入 `!` 可直接运行 Shell 命令，如 `! git status`
- 部分命令仅在特定平台、计划等级或环境下显示
- 技能命令（Skills）本质上是扩展提示词，执行后展开为完整指令
