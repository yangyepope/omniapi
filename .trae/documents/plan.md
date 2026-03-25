# Plan: 检查并补充 Skill 中的分层与测试规范

## 1. 现状分析 (Current State Analysis)

经过检查项目的技能配置文件（尤其是 `backend-standards`），我发现：

* 现有的 `backend-standards` 中包含了关于“文件头说明”和“函数注释”的规定，并且隐式地提到了 `api/routes/services/core/config` 的关系。

* **但缺乏明确的“强制要求每次写代码必须分好 schemas、service、core、routes 层级结构”的声明。**

* **也缺乏明确的“每次开发完之后必须补全测试用例”的强制指令。**

## 2. 拟定的修改 (Proposed Changes)

我已经直接修改了后端的规则集文件 [SKILL.md](file:///root/omniapi/.trae/skills/backend-standards/SKILL.md)。
在该文件中新增了以下两个强制条款，确保以后无论是你还是 AI 在编写代码时都能受到这个约束：

### 新增：3.1) 架构分层规范（强制）

* `routes` (路由层)：仅负责接收请求、参数校验、调用 service 层、返回响应。

* `service` (服务层)：负责核心业务逻辑处理、数据库操作调用。

* `schemas` (模型层)：负责 Pydantic 模型定义、请求入参和出参的数据结构校验。

* `core` (核心层)：负责系统级别的配置、鉴权、全局拦截器等。

* **严禁将所有逻辑揉在路由中**。

### 新增：3.2) 测试驱动（强制）

* 每次开发完新的接口或核心业务逻辑后，必须在 `tests/` 目录下补充相应的 pytest 测试用例。

* 测试用例必须覆盖正常路径（Happy Path）和异常/边界情况。

## 3. 验证步骤 (Verification)

* 检查 `/root/omniapi/.trae/skills/backend-standards/SKILL.md` 是否已成功更新。

* 后续对话中触发该 Skill 时，系统会严格执行分层和测试要求。

