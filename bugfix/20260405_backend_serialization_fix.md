# 2026-04-05 修复 Backend 序列化 500 错误

## 现象 (Symptom)
在 API 返回变体详情时，后端报错 `500 Internal Server Error`。
- **报错堆栈**: `pydantic.error_wrappers.ValidationError: 1 validation error for VariantPublic ... 'body' value is not a valid dict`。
- **背景**: 发生在 `api/v1/services/{id}/endpoints/{id}/traffic/{id}` 接口。

## 调查 (Investigation)
1. 检查数据库记录：发现部分旧流量记录中的 `body` 字段存储的是字符串形式的 JSON，而不是解析后的字典。
2. 检查 `models.py`：发现 `VariantPublic` 包含了一个 `validate_json_body` 验证器。
3. 问题定位：当 Pydantic 尝试序列化这些不规范的记录时，验证器在 **响应模型** 中触发了二次验证。

## 根因 (Root Cause)
验证逻辑位置放置不当。
- **核心逻辑缺陷**: 复杂的 JSON 校验逻辑被强行塞进了 `Response Model` (VariantPublic) 中。
- **影响**: 这导致查询历史记录（哪怕是脏数据）时都会触发 500 报错，而真正的校验应该发生在数据 **写入** 时。

## 修复 (The Fix)
1. 将 `validate_json_body` 从 `VariantPublic` 中移除。
2. 将该校验逻辑物理迁移至 `VariantCreate` 和 `VariantUpdate` 请求模型中。
3. **Git Diff 摘要**:
```diff
- class VariantPublic(VariantBase):
-     @validator("body", pre=True)
-     def validate_json_body(cls, v): ...
+ class VariantCreate(VariantBase):
+     @validator("body", pre=True)
+     def validate_json_body(cls, v): ...
```

## 验证 (Proof)
1. 重启后端服务。
2. 重新访问流量详情页。
3. **结果**: 页面成功渲染，不再抛出序列化错误。
