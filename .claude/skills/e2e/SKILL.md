---
name: e2e
description: E2E 端到端测试技能 — 生成、运行、维护 Playwright 测试，覆盖关键用户流程，输出截图/录屏取证。
user-invocable: true
---

# /e2e — 端到端测试

用户通过 `/e2e` 触发时，**必须**按以下流程执行。

## 执行流程

### 阶段零：凭据检查（必须）

参照 `01-工作流与语言规范.md` 第四节：

```bash
# 读取根目录 .env 获取测试账号
grep -E "FIRST_SUPERUSER|FIRST_SUPERUSER_PASSWORD" /root/security-platform/.env
```

若变量缺失，**停止并提醒用户补充**，不得使用 Mock 数据。

### 阶段一：Session 维护

```bash
# 持久化登录态，供后续所有测试复用
cd /root/security-platform/frontend && npx playwright test tests/auth.setup.ts
```

### 阶段二：确定测试范围

根据用户描述，使用 **everything-claude-code:e2e** 子代理，识别需要覆盖的用户流程：
- 列出关键路径（Happy Path）
- 列出边界场景（空数据、错误状态、权限限制）
- 列出数据一致性断言点（数值是否与后端一致）

### 阶段三：测试文件生成/更新

测试文件放置规范：
- E2E 测试：`frontend/tests/*.spec.ts`
- 数据一致性测试：`frontend/tests/[功能名]-consistency.spec.ts`

测试基准 URL：`http://localhost:5173`

### 阶段四：执行测试

```bash
cd /root/security-platform/frontend
npx playwright test [test-file] --reporter=list
```

### 阶段五：视觉取证

测试完成后，**必须**：
1. 检查 `frontend/test-results/` 目录下的截图/录屏
2. 将截图路径同步至 `backend/walkthrough_e2e_[日期].md`
3. 失败的测试附上错误截图说明

## 注意事项

- 测试账号只从 `.env` 获取，**严禁硬编码**
- 视觉取证是强制要求，不可省略
- 如测试因 401 失败，重新运行 `auth.setup.ts` 后再试
