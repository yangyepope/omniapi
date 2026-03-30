---
name: using-git-worktrees
description: 在开始需要与当前工作区隔离的功能开发或执行实施计划前使用 —— 创建带有智能目录选择和安全验证的隔离 Git 工作树 (worktrees)
---

# 使用 Git 工作树 (Using Git Worktrees)

## 概览

Git 工作树 (worktrees) 可以在同一个代码库中创建共享的隔离工作空间，允许同时在多个分支上工作而无需频繁切换。

**核心原则：** 系统化的目录选择 + 安全验证 = 可靠的隔离环境。

**开始时宣布：** “我正使用 using-git-worktrees 技能来设置一个隔离的工作空间。”

## 目录选择流程

请遵循以下优先级顺序：

### 1. 检查既有目录

```bash
# 按优先级顺序检查
ls -d .worktrees 2>/dev/null     # 首选（隐藏目录）
ls -d worktrees 2>/dev/null      # 备选
```

**如果找到：** 使用该目录。如果两者都存在，以 `.worktrees` 为准。

### 2. 检查 CLAUDE.md

```bash
grep -i "worktree.*director" CLAUDE.md 2>/dev/null
```

**如果指定了偏好：** 运行该偏好设置，无需询问。

### 3. 询问用户

如果既没有现成目录，CLAUDE.md 中也没有偏好设置：

```
未找到工作树目录。我应该在哪里创建工作树？

1. .worktrees/ (项目本地，隐藏目录)
2. ~/.config/superpowers/worktrees/<项目名称>/ (全局位置)

你更倾向于哪一个？
```

## 安全验证

### 针对项目本地目录 (.worktrees 或 worktrees)

**在创建工作树之前，必须验证目录已被 git 忽略 (ignored)：**

```bash
# 检查目录是否被忽略（遵循本地、全局和系统级 gitignore 设置）
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**如果未被忽略：**

根据 Jesse 的规则 “发现问题立即修复”：
1. 向 `.gitignore` 添加适当的行。
2. 提交该更改。
3. 继续创建工作树。

**为什么要这样做（非常关键）：** 防止意外将工作树的内容提交到代码库中。

### 针对全局目录 (~/.config/superpowers/worktrees)

由于在项目外部，无需进行 `.gitignore` 验证。

## 创建步骤

### 1. 检测项目名称

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. 创建工作树

```bash
# 确定完整路径
case $LOCATION in
  .worktrees|worktrees)
    path="$LOCATION/$BRANCH_NAME"
    ;;
  ~/.config/superpowers/worktrees/*)
    path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"
    ;;
esac

# 创建带有新分支的工作树
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. 运行项目环境搭建 (Setup)

自动检测并运行相应的设置命令：

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

### 4. 验证干净的基准线 (Baseline)

运行测试以确保工作树从干净状态开始：

```bash
# 示例 —— 使用适合项目的命令
npm test
cargo test
pytest
go test ./...
```

**如果测试失败：** 报告失败项，询问是继续执行还是进行调查。

**如果测试通过：** 报告已就绪。

### 5. 报告位置

```
工作树已就绪，位于 <full-path>
测试已通过 (<N> 个测试通过，0 个失败)
准备开始实现 <功能名称>
```

## 快速参考

| 情境 | 操作 |
|-----------|--------|
| `.worktrees/` 已存在 | 使用它（验证是否被忽略） |
| `worktrees/` 已存在 | 使用它（验证是否被忽略） |
| 两者都存在 | 使用 `.worktrees/` |
| 都不存在 | 检查 CLAUDE.md ——> 询问用户 |
| 目录未被忽略 | 添加到 .gitignore 并提交 |
| 基准测试失败 | 报告失败并询问 |
| 无 package.json/Cargo.toml 等 | 跳过依赖安装 |

## 常见错误

### 跳过忽略验证 (Ignore verification)

- **问题：** 工作树内容被跟踪，污染了 git status。
- **修正：** 在创建项目本地工作树前，始终使用 `git check-ignore`。

### 臆断目录位置

- **问题：** 造成不一致，违反项目惯例。
- **修正：** 遵循优先级：既有 > CLAUDE.md > 询问。

### 在测试失败的情况下继续

- **问题：** 无法区分是新产生的 bug 还是预先存在的问题。
- **修正：** 报告失败，获取明确许可后再继续。

### 写死环境搭建命令

- **问题：** 在使用不同工具的项目中会发生报错。
- **修正：** 从项目文件（package.json 等）中自动检测。

## 示例工作流

```
你：我正使用 using-git-worktrees 技能来设置一个隔离的工作空间。

[检查 .worktrees/ —— 已存在]
[验证是否被忽略 —— git check-ignore 确认 .worktrees/ 已被忽略]
[创建工作树: git worktree add .worktrees/auth -b feature/auth]
[运行 npm install]
[运行 npm test —— 47 个测试通过]

工作树已就绪，位于 /Users/jesse/myproject/.worktrees/auth
测试已通过 (47 个测试通过，0 个失败)
准备开始实现 auth 功能
```

## 警示信号 (Red Flags)

**严禁执行以下操作：**
- 在未验证项目本地目录是否被忽略的情况下创建工作树。
- 跳过基准测试验证。
- 在测试失败的情况下且未经询问就继续。
- 在含义模糊时臆断目录位置。
- 跳过 CLAUDE.md 检查。

**务必执行：**
- 遵循目录优先级：既有 > CLAUDE.md > 询问。
- 验证项目本地目录已被忽略。
- 自动检测并运行项目环境搭建。
- 验证干净的测试基准线。

## 集成

**由以下技能调用：**
- **brainstorming** (第 4 阶段) —— 在设计获批且紧接着进行实现时是**必须项**。
- **subagent-driven-development** —— 在执行任何任务前是**必须项**。
- **executing-plans** —— 在执行任何任务前是**必须项**。
- 任何需要隔离工作空间的技能。

**配合项：**
- **finishing-a-development-branch** —— 在工作完成后用于清理。
