# 🔴 当前为占位文件

本目录下 10 个 `*.md` **不是 v3.0 设计文档要求的角色定义**，
仅是 22 行通用描述，用于让 `scanner/loader.py` 不报错地启动。

---

## 必须补充

按 v3.0 §4.1 表格补齐：

| 文件 | OWASP | 责任范围 |
|------|-------|---------|
| `access_control.md` | A01 | 访问控制失效 |
| `crypto_data.md` | A02 | 加密失败 |
| `injection.md` | A03 | 注入 |
| `insecure_design.md` | A04 | 不安全设计 |
| `misconfiguration.md` | A05 | 安全配置错误 |
| `auth_failures.md` | A07 | 认证失败 |
| `integrity_failures.md` | A08 | 数据完整性失败 |
| `logging_monitoring.md` | A09 | 日志监控不足 |
| `ssrf.md` | A10 | SSRF |
| `ai_llm_security.md` | OWASP LLM | AI/LLM 安全 |

每个文件应包含：
1. 安全视角（角色定位）
2. 分析方法（怎么读 Neo4j 调用链 / 源码）
3. 输出格式要求
4. 不应包含具体规则 — 规则在 `../rules/*.yaml` 里

详见 [`../../README.md`](../../README.md) 与仓库根方案文档。
