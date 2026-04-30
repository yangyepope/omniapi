# 🔴 当前为占位文件

本目录下 24 个 `*.yaml` **全部是 `rules: []` 空列表**。
原因：开发期清理代码时连带删除了未提交的 397 条规则，git 无法找回。

⚠️ 不补这些规则，扫描平台只会让 LLM 凭通用知识审计，**漏报率非常高**。

---

## 必须补充（v3.0 §5.2 总计 397 条）

| 文件 | 数量 | 覆盖范围 |
|------|-----|---------|
| `sql_injection.yaml` | 15 | SQL 注入（MyBatis/JPA/JdbcTemplate/二阶注入） |
| `xss.yaml` | 15 | XSS（反射/存储/DOM/模板引擎） |
| `ssrf.yaml` | 12 | SSRF（URL 过滤/DNS 重绑定/云元数据/协议限制） |
| `injection.yaml` | 12 | 其他注入（命令/SpEL/SSTI/XXE/LDAP/JNDI） |
| `auth_failures.yaml` | 42 | 认证失败（密码策略/JWT/OAuth2/会话/CSRF） |
| `broken_access_control.yaml` | 16 | 访问控制（IDOR/越权/Mass Assignment/RBAC） |
| `cryptographic_failures.yaml` | 12 | 加密失败（弱算法/IV 复用/CBC Oracle/TLS） |
| `security_misconfiguration.yaml` | 25 | 安全配置（CORS/HTTP 头/Actuator/HTTP 走私） |
| `insecure_design.yaml` | 17 | 不安全设计（业务逻辑/竞态/状态机/限额绕过） |
| `logging_failures.yaml` | 24 | 日志缺失（操作审计/PII 记录/安全告警） |
| `deserialization.yaml` | 10 | 反序列化（Java 原生/Fastjson/Jackson/XStream） |
| `file_security.yaml` | 19 | 文件安全（上传校验/路径穿越/Zip Slip/病毒扫描） |
| `information_disclosure.yaml` | 18 | 信息泄露（Swagger/堆栈追踪/硬编码密钥/PII） |
| `microservice_security.yaml` | 10 | 微服务安全（Feign 签名/mTLS/服务发现/熔断） |
| `ai_llm_security.yaml` | 45 | AI/LLM 安全（LLM01-LLM10/MCP/HITL/RAG） |
| `protocol_security.yaml` | 11 | 协议安全（GraphQL/gRPC/WebSocket） |
| `iam_lifecycle.yaml` | 12 | IAM 生命周期（休眠账号/Token 吊销/权限漂移） |
| `api_rate_limiting.yaml` | 12 | 限速/资源防护（双维度限速/ReDoS/分布式计数） |
| `third_party_integration.yaml` | 12 | 第三方集成（Webhook 签名/外部 API/SSL 证书） |
| `data_privacy.yaml` | 12 | 数据隐私（PII 脱敏/导出审计/数据删除/跨境） |
| `event_driven_security.yaml` | 12 | 事件驱动安全（消息验证/防重放/跨租户隔离） |
| `caching_security.yaml` | 12 | 缓存安全（租户隔离/权限失效/缓存击穿/Session） |
| `thread_context_security.yaml` | 10 | 线程上下文安全（@Async/ThreadLocal/虚拟线程） |
| `spring_autoconfig_security.yaml` | 12 | Spring 自动配置（Data REST/Config Server/Gateway） |

---

## 单条规则模板

```yaml
rules:
  - id: RULE-SQL-001
    name: 字符串拼接 SQL（MyBatis ${} 直拼）
    type: static                      # static / dynamic
    severity: HIGH                    # CRITICAL / HIGH / MEDIUM / LOW
    detection_hint: >
      检测说明：在 MyBatis Mapper XML 中使用 ${param} 直接拼接，
      未使用 #{param} 参数化绑定。关键代码特征：<select> 标签内
      含 ${...} 表达式且对应参数源自 @RequestParam / @RequestBody。
```

详见仓库根方案文档。
