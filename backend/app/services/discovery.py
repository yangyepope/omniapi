import re
from typing import Any

def normalize_uri(uri: str) -> str:
    """
    简单的 URI 归一化逻辑，去除查询参数，并将包含数字或 UUID 的路径片段替换为 {id}
    例如: 
    /api/v1/users/123 -> /api/v1/users/{id}
    /api/v1/items/a1b2c3d4-e5f6-7890-1234-567890abcdef -> /api/v1/items/{id}
    /sts/api/list?page=1 -> /sts/api/list
    """
    # 先去除查询参数
    uri = uri.split('?')[0]
    
    # 替换纯数字
    uri = re.sub(r'/[0-9]+(?=/|$)', '/{id}', uri)
    
    # 替换包含不带连字符的 UUID (32位十六进制) 的路径片段
    uri = re.sub(r'/[^/]*[0-9a-fA-F]{32}[^/]*(?=/|$)', '/{id}', uri)
    
    # 替换包含带连字符的 UUID 的路径片段 (例如 /mcp-a7c5.../ -> /{id})
    uri = re.sub(r'/[^/]*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[^/]*(?=/|$)', '/{id}', uri)

    # 替换包含 URL 编码的 URI 协议头 (例如 agent-spiffe%3A%2F%2F... 等被作为 path 变量传入的值)
    uri = re.sub(r'/[^/]*%3A%2F%2F[^/]+(?=/|$)', '/{id}', uri)
    
    return uri

def extract_schemas(headers: dict, body_str: str) -> tuple[dict, dict]:
    """
    从 headers 和 body 中提取简单的 schema
    这只是一个非常基础的实现，实际生产中可以接入更复杂的 JSON Schema 推导
    """
    import json
    
    header_schema = {}
    for k, v in headers.items():
        # 过滤掉一些常变或无意义的 header
        if k.lower() not in ['host', 'connection', 'content-length', 'x-real-ip', 'x-original-uri', 'x-original-method']:
            header_schema[k] = type(v).__name__
            
    params_schema = {}
    try:
        if body_str:
            data = json.loads(body_str)
            if isinstance(data, dict):
                for k, v in data.items():
                    params_schema[k] = type(v).__name__
    except Exception:
        pass
        
    return params_schema, header_schema
