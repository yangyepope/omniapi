---
name: code-review
description: 代码审查技能 — 对最近修改的代码进行质量、安全、并发安全、架构规范的全面审查，输出分级问题报告。
user-invocable: true
---

# /code-review — 代码审查

用户通过 `/code-review` 触发时，**必须**按以下流程执行。

## 执行流程

### 阶段一：变更范围确认

```bash
git diff HEAD --name-only        # 查看未提交变更文件列表
git diff HEAD                    # 查看具体变更内容
git log --oneline -5             # 了解最近提交上下文
```

### 阶段二：多维度审查

使用 **everything-claude-code:code-reviewer** 子代理，对所有变更文件逐一检查：

#### 2.1 安全审查（最高优先级）

参照 `ecc/common/security.md`：
- [ ] 无硬编码密钥（API Key、Token、密码）
- [ ] 所有用户输入经过验证
- [ ] 无 SQL 注入、XSS、路径遍历风险
- [ ] 错误响应不暴露内部堆栈

#### 2.2 数据库并发安全（后端必查）

参照 `04-数据库并发安全铁律.md`，**遇到以下特征立即标记**：
- `.first()` 后接 `if not xxx:` 再 `session.add()` → 查-判-写反模式
- `obj.xxx_count += 1` → Python 级计数器，必须改为 SQL 表达式
- 新增 `table=True` 模型无 `__table_args__` UniqueConstraint
- Celery Task 内写操作无 `.with_for_update()`

#### 2.3 代码质量

参照 `ecc/common/coding-style.md`：
- [ ] 函数 < 50 行，文件 < 800 行
- [ ] 无深层嵌套（> 4 层）
- [ ] 错误处理完整，无裸 `except Exception`
- [ ] 无 `console.log` / `print` 调试语句遗留

#### 2.4 架构合规（后端）

参照 `02-后端架构铁律.md`：
- [ ] 路由层不含业务逻辑
- [ ] 服务层不直接操作 HTTP 请求
- [ ] 依赖通过 FastAPI `Depends` 注入

#### 2.5 前端规范

参照 `03-前端架构铁律.md`：
- [ ] 异步状态使用 TanStack Query，无 `useEffect` 手动 fetch
- [ ] 图标只用 `lucide-react`
- [ ] 无手写 CSS 文件，只用 Tailwind

### 阶段三：输出问题报告

按严重级别分类输出：

| 级别 | 含义 | 处理 |
|------|------|------|
| 🔴 CRITICAL | 安全漏洞 / 数据丢失风险 | 必须立即修复，阻塞合并 |
| 🟠 HIGH | Bug / 并发竞态 | 强烈建议修复 |
| 🟡 MEDIUM | 可维护性问题 | 酌情修复 |
| 🟢 LOW | 风格建议 | 可选 |

### 阶段四：修复确认

对每个 CRITICAL / HIGH 问题，提供：
1. 问题位置（文件:行号）
2. 问题描述
3. 修复建议（代码片段）

询问用户是否立即修复。

## 输出语言

全程简体中文，代码保持原文。
