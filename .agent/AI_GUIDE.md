# OmniAPI 开发者 AI 助手使用指南

本指南整合了项目中集成的 **ECC (Everything Claude Code)**、**Superpowers** 以及 **MCP (Model Context Protocol)** 的核心使用方法，旨在帮助你利用 AI 助手高效完成从需求分析到代码交付的完整流程。

---

## 🚀 1. ECC (Everything Claude Code) 指令集

ECC 提供了一套基于斜杠（Slash）的精确指令，用于触发特定的 AI 工作模式。

### 核心常用指令
| 指令 | 名称 | 适用场景 |
| :--- | :--- | :--- |
| **`/plan`** | **需求规划** | 开始新功能或重大重构前，进行需求分析、风险评估并生成分步计划。 |
| **`/tdd`** | **测试驱动** | 追求高稳定性代码。AI 会先编写测试用例，再编写实现代码，确保 100% 测试通过。 |
| **`/aside`** | **侧边交流** | 在不打断当前编程任务的情况下，咨询技术知识点或查看项目状态。 |
| **`/build-fix`**| **错误修复** | 当遇到编译错误或运行报错时，自动分析日志并修复。 |
| **`/code-review`**| **代码审计** | 在提交代码前，由内置的高级审计代理检查逻辑漏洞与规范。 |
| **`/checkpoint`**| **断点保存** | 在进行重大变更前手动保存状态，方便后续回滚或上下文恢复。 |

### 如何使用
直接在聊天窗口输入指令即可（例如：`/plan 增加 OAuth2 登录支持`）。忽略 IDE 弹出的“No matching results”提示，AI 会识别你的意图。

### 完整指北库 (60+ 扩展指令)

目前 `.agent/plugins/ecc` 驱动引擎已内建超过 60 种高级指令，涵盖 C++ / Go / Rust / Kotlin 测试构建、分布式工作流重放及上下文诊断。以下为完整可用集合及其示例用法（直接在聊天框输入即可触发）：

| 扩展指令 | 功能描述 | 示例用法 |
| :--- | :--- | :--- |
| **`/aside`** | 不丢失当前任务上下文的情况下，快速回答附带问题。回答后自动恢复工作。 | `/aside 这个函数的返回类型是什么？` |
| **`/build-fix`** | 执行自动构建修正工作流。 | `/build-fix 修复 src/main.rs 里的编译报错` |
| **`/checkpoint`** | 在重要变更前进行自动检查点保存。 | `/checkpoint 重构认证模块前快照` |
| **`/claw`** | 启动 NanoClaw v2 — ECC 持久、零依赖 REPL，具备指标报告与分支功能。 | `/claw` |
| **`/code-review`** | 触发常规架构或代码逻辑审计。 | `/code-review 检查 auth 模块并给出安全建议` |
| **`/context-budget`** | 分析上下文窗口（Tokens）使用情况，进行减负剪枝。 | `/context-budget --verbose` |
| **`/cpp-build`** / **`/cpp-review`** / **`/cpp-test`** | 快速处理 C++ 语言相关的 CMake 构建、安全性审计与 GoogleTest 驱动研发。 | `/cpp-test 帮我用 GTest 写一个网络请求验证测试` |
| **`/devfleet`** | 编排并发多 AI Agents 工作模式，在隔离的 Git Worktree 中并行开发。 | `/devfleet 规划一个新的管理后台模块协同开发` |
| **`/docs`** | 挂载相关远程或本地 API 文档增强理解。 | `/docs React Hooks 最新官方最佳实践` |
| **`/e2e`** | 采用 Playwright 自动化端到端验收测试构建与运行，并生成跟踪工件。 | `/e2e 编写和运行首页登录流程的 UI 自动化测试` |
| **`/eval`** / **`/evolve`** | 分析智能体当前本能 (Instinct) 模式并进行自我进化诊断。 | `/evolve 分析最新几次会话并提炼进化原则` |
| **`/go-build`** / **`/go-review`** / **`/go-test`** | 修复 Go 语言 vet 报错；审计并发/空指针安全性；推行表驱动 Go 测试流。 | `/go-review 检查一下这段 worker pool 有没有死锁风险` |
| **`/gradle-build`** | 修复移动端/跨平台项目 KMP/Android 相关的 Gradle 崩溃。 | `/gradle-build 解决 app-module 的依赖冲突` |
| **`/instinct-export`** / **`/instinct-import`** / **`/instinct-status`** | 配置和共享、展示项目的本能训练数据 (技能记忆)。 | `/instinct-export team-rules.yaml` |
| **`/kotlin-build`** / **`/kotlin-review`** / **`/kotlin-test`** | 处理 Kotlin 协程审计、空安全性审查以及使用 Kover 执行其驱动式 TDD 工作流。 | `/kotlin-test 生成针对 UserRepository 的单元测试` |
| **`/learn`** / **`/learn-eval`** | 从会话日志中总结模式，转化为团队可复用的原则（全局/项目级）。 | `/learn 从今天的开发中总结出 React 组件封装模式` |
| **`/loop-start`** / **`/loop-status`** / **`/model-route`** | 处理复杂自治循环任务的控制模块与状态监控。 | `/loop-start 循环抓取数据指导完成 --mode fast` |
| **`/multi-backend`** / **`/multi-execute`** / **`/multi-frontend`** / **`/multi-plan`** / **`/multi-workflow`** | 一整套微服务架构下的跨技术栈多维协同编程工作流（Plan -> Execute -> WorkFlow）。 | `/multi-plan 开始规划全栈商城订单模块` |
| **`/orchestrate`** | 为串联多个复杂编排脚本和 tmux 会话准备向导。 | `/orchestrate 搭建 redis 与 postgres 分布式联调沙盒` |
| **`/plan`** | 重写需求、评估风险并在不触及源文件的情况下制定极客级全量实施计划。 | `/plan 我要添加系统设置和多端主题切换功能` |
| **`/projects`** | 列出所见系统项目及其依赖库分析统计。 | `/projects` |
| **`/pm2`** | 控制或调度 PM2 常驻服务流。 | `/pm2 restart frontend-bridge` |
| **`/promote`** | 提升局部训练好的规则或指令为全局核心本能 (Global Instinct)。 | `/promote 自动检测并提升候选最佳实践` |
| **`/prompt-optimize`** | 分析一个用户写的普通 Prompt，并输出一个被 ECC 规范增强优化的超级版本。 | `/prompt-optimize 请帮我写一个生成贪吃蛇游戏的极佳提示词` |
| **`/prune`** | 修剪由于长时间不使用产生的无效临时本能。 | `/prune 删除所有 30 天未激活的过大记忆` |
| **`/python-review`** | Python 代码多维度审查（PEP8, Typehints, Security 防护）。 | `/python-review 审查这段 FastApi 路由配置` |
| **`/refactor-clean`** / **`/quality-gate`** | 强制唤起格式清理与工程级质量大门 (Gate)。 | `/refactor-clean 帮我清理 utils.ts 里的垃圾代码` |
| **`/resume-session`** / **`/save-session`** / **`/sessions`** | 高阶会话断点续传（管理 `~/.claude/sessions/` 断线文件），无损跨设备和时间衔接长线上下文。 | `/save-session 周五下班前保留当前进度上下文` |
| **`/rules-distill`** | 扫描当前全量 Skills 并生成规则指南供模型严格遵循。 | `/rules-distill 从现有的最佳实践中提炼 AGENT.md` |
| **`/rust-build`** / **`/rust-review`** / **`/rust-test`** | 修复 Rust 借用检查器 (Borrow Checker) 错误、生命周期审查与 cargo-llvm-cov 驱动工作流。 | `/rust-build 帮我处理生命周期参数推导报错` |
| **`/setup-pm`** | 全自动包管理器引导修正（npm/yarn/pnpm/bun 大统一）。 | `/setup-pm` |
| **`/skill-create`** / **`/skill-health`** | 从本地 Git 历史中逆向推导代码模式，自动生成 `SKILL.md` 新文件。 | `/skill-create 根据我昨天的提交提取 React 视图开发模式` |
| **`/tdd`** | 标准测试驱动：设计边界接口 -> 生成测试 -> 编写实现。 | `/tdd 我需要一个函数来计算购物车订单折扣总价` |
| **`/test-coverage`** / **`/verify`** | 测试结果检查以及全面自驱动验证流程。 | `/verify 运行全量检测脚本确保核心没挂` |
| **`/update-codemaps`** / **`/update-docs`** | 对系统当前 AST 代码树以及技术说明文档进行更新绑定。 | `/update-docs 同步最新的 API 文档改动` |



---

## 🧠 2. Superpowers 开发方法论

Superpowers 是一套深度集成的 AI 工作流规范，确保每一行输出都经过严密思考。

### 核心阶段
1.  **头脑风暴 (Brainstorming)**：在行动前，AI 会先思考潜在盲点、依赖关系和扩展性，可能会向你提出几个关键问题。
2.  **子代理协同 (Subagent-Driven)**：对于复杂任务，系统会派生出专门的“子代理”：
    *   **Architect**: 负责架构决策。
    *   **Implementer**: 专注代码编写。
    *   **Spec-Reviewer**: 确保代码与最初需求（Spec）100% 匹配。
3.  **终极质检 (Verification)**：在任务标记为完成前，AI 会自动运行测试、检查性能并确保符合项目规范。

---

## 🔗 3. MCP (Model Context Protocol) 同步实战

MCP 用于将外部工具（如 Google AI Studio）与本地开发环境打通。

### 本地 Stitch MCP 桥接
项目集成了 `mcp-sse-bridge.js`，用于将 AI Studio 的云端设计同步到本地。

*   **初始化 MCP 配置**（首次使用或环境变更）：
    ```bash
    cd frontend && npm run mcp:setup
    ```
*   **启动桥接服务**：
    ```bash
    cd frontend && npm run mcp:bridge
    ```
*   **同步流程**：
    1. 在 AI Studio (Stitch) 中完成 UI 原型设计。
    2. 打开桥接服务（及必要的隧道工具，如 `localhost.run`）。
    3. 向我下发指令：“**使用 Stitch MCP 获取项目 [ID]，同步到 frontend 目录。**”

---

## 🛠️ 4. 进阶协同工作流

**推荐的开发闭环：**
1.  **`/plan`**：输入需求，生成多阶段实施方案。
2.  **`/aside`**：针对方案中的技术难点询问 AI 的建议。
3.  **`/tdd`**：针对核心逻辑启动 TDD 模式开始编写。
4.  **`/build-fix`**：处理过程中遇到的环境或依赖报错。
5.  **`/code-review`**：交付前进行全方位的最终审计。

---

> [!TIP]
> **提示**：你可以随时通过回复 **`/aside 帮我解释一下这个指南里的 [某个功能]`** 来获取更多详细信息。



/plan 增加一个 API 密钥管理界面，开启结构化开发流程
/aside 使用中文书写呀