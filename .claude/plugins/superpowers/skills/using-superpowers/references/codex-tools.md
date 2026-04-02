# Codex 工具映射 (Codex Tool Mapping)

技能中使用了 Claude Code 的工具名称。当你在技能中遇到这些名称时，请使用你所在平台的等效工具：

| 技能引用 | Codex 等效项 |
|-----------------|------------------|
| `Task` 工具 (派发子代理) | `spawn_agent` (参见 [命名代理派发](#命名代理派发)) |
| 多次 `Task` 调用 (并行) | 多次 `spawn_agent` 调用 |
| 任务返回结果 | `wait` |
| 任务自动完成 | `close_agent` 以释放槽位 |
| `TodoWrite` (任务跟踪) | `update_plan` |
| `Skill` 工具 (调用技能) | 技能原生加载 —— 只需遵循指令即可 |
| `Read`, `Write`, `Edit` (文件) | 使用你原生的文件工具 |
| `Bash` (运行命令) | 使用你原生的 Shell 工具 |

## 子代理派发需要多代理支持

在你的 Codex 配置 (`~/.codex/config.toml`) 中添加：

```toml
[features]
multi_agent = true
```

这将为 `dispatching-parallel-agents` 和 `subagent-driven-development` 等技能启用 `spawn_agent`、`wait` 和 `close_agent` 功能。

## 命名代理派发 (Named agent dispatch)

Claude Code 技能引用的命名代理类型（如 `superpowers:code-reviewer`）。
Codex 没有命名代理注册表 —— `spawn_agent` 只能从内置角色（`default`, `explorer`, `worker`）创建通用代理。

当技能要求派发一个命名的代理类型时：

1. 找到该代理的提示词文件（例如：`agents/code-reviewer.md` 或技能本地的提示词模板如 `code-quality-reviewer-prompt.md`）。
2. 读取提示词内容。
3. 填充任何模板占位符（`{BASE_SHA}`, `{WHAT_WAS_IMPLEMENTED}` 等）。
4. 以填充后的内容作为 `message` 创建一个 `worker` 代理。

| 技能指令 | Codex 等效项 |
|-------------------|------------------|
| `Task tool (superpowers:code-reviewer)` | `spawn_agent(agent_type="worker", message=...)` 结合 `code-reviewer.md` 内容 |
| `Task tool (通用型)` 带有内联提示词 | 使用相同的提示词执行 `spawn_agent(message=...)` |

### 消息框架 (Message framing)

`message` 参数是用户级别的输入，而非系统提示词。为了最大程度提高指令遵循度，请按以下结构组织：

```
你的任务是执行以下操作。请严格遵循下方的指令。

<agent-instructions>
[来自代理 .md 文件的已填充提示词内容]
</agent-instructions>

立即执行。仅输出符合上方指令所规定格式的结构化响应。
```

- 使用任务指派框架（“你的任务是...”）而非角色框架（“你是...”）。
- 将指令包裹在 XML 标签中 —— 模型会将带有标签的块视为具有权威性的。
- 以明确的执行指令结束，以防止模型摘要指令内容。

### 何时可以移除此变通方法

这种方法是对 Codex 插件系统尚未在 `plugin.json` 中支持 `agents` 字段的补偿。当 `RawPluginManifest` 获得 `agents` 字段后，插件可以符号链接到 `agents/`（镜像现有的 `skills/` 符号链接），技能便可以直接派发命名的代理类型。

## 环境检测 (Environment Detection)

创建工作树（worktrees）或完成分支的技能应当在继续之前，通过只读的 git 命令检测其环境：

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

- `GIT_DIR != GIT_COMMON` ——> 已经位于链接的工作树中（跳过创建）。
- `BRANCH` 为空 ——> 分离头指针 (detached HEAD)（无法在沙盒中进行建支/推送/PR）。

参见 `using-git-worktrees` 第 0 步和 `finishing-a-development-branch` 第 1 步，了解各技能如何使用这些信号。

## Codex 应用完成流程 (Codex App Finishing)

当沙盒阻止分支/推送操作时（在外部管理的工作树中处于分离头指针状态），代理会提交所有工作，并通知用户使用应用的内置控件：

- **“创建分支 (Create branch)”** —— 命名分支，然后通过应用 UI 进行提交/推送/PR。
- **“移交给本地 (Hand off to local)”** —— 将工作转移到用户的本地检出中。

代理仍然可以运行测试、暂存文件，并输出建议的分支名称、提交消息和 PR 描述供用户复制。
