# 2026-04-05 修复变体重放 Status 0 时的“显示空白”诊断问题

## 现象 (Symptom)
当变体重放由于网络原因失败（Status 0）时，虽然卡片显示红色，但点击进入详情页后，“最近执行响应”区域由于显示 `NO REPLAY HISTORY FOUND`。
- **用户误导**: 用户无法判断是因为没执行，还是因为由于由于请求由于由于物理发送物理失败。

## 调查 (Investigation)
1. 检查 `index.tsx`：发现详情页使用 `if (selectedVariant.last_response_code)` 判定历史。
2. 逻辑漏洞：`0` 是 falsy 值，导致所有网络错误被渲染成了“无历史”。

## 根因 (Root Cause)
由于由于判定逻辑过于粗糙，未考虑到物理物理物理 0 状态码物理由于作为有意义的物理错误结果物理物理物理物理物理存在。

## 修复 (The Fix)
1. **由于由于判定逻辑精细化基由于由于由于由于由于由于**: 
   - 将 `code ? (...) : (...)` 修改为 `code !== null ? (...) : (...)`。
2. **由于由于新增诊断面板其由于由于由于由于由于由于**:
   - 针对物理物理物理 Status 0，新增了物理物理由于物理 `Connection Audit Failure` 面板。
   - 物理精确展示物理后端存入 `last_response_body` 中的具体异常文本（如 `httpx.ConnectError`）。
   - 移除了由于由于 Status 0 时由于由于冗余的 `Response Headers` 空白面板。

## 验证 (Proof)
1. 模拟网络连接拒绝场景。
2. 详情页刷新后物理由于正确物理弹出物理红色物理诊断区，显示物理 `ERROR: [Errno 111] Connection refused`。
