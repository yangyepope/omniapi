import hashlib
import json
import re
from typing import Any


def extract_service_name_from_path(path: str) -> str:
    """
    [功能]：从 URL 路径中提取第一层作为服务名称。
    [示例]：/sts/v1/list -> sts
    """
    parts = [p for p in path.split('/') if p]
    return parts[0] if parts else "default"

def normalize_uri(uri: str) -> str:
    """
    [功能]：URI 归一化逻辑。
    1. 去除查询参数（Query Params）。
    2. 将包含数字、UUID 等动态片段替换为 {id} 占位符。
    """
    # 按照需求：仅保留路径，忽略 Query
    uri = uri.split('?')[0]

    # 替换纯数字块
    uri = re.sub(r'/[0-9]+(?=/|$)', '/{id}', uri)

    # 替换 UUID (32位十六进制) 片段
    uri = re.sub(r'/[^/]*[0-9a-fA-F]{32}[^/]*(?=/|$)', '/{id}', uri)

    # 替换带连字符的标准 UUID 片段
    uri = re.sub(r'/[^/]*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[^/]*(?=/|$)', '/{id}', uri)

    # 针对带 URL 编码协议头的路径片段进行泛化
    uri = re.sub(r'/[^/]*%3A%2F%2F[^/]+(?=/|$)', '/{id}', uri)

    return uri

def filter_headers_for_dedup(headers: dict) -> dict:
    """
    [去重规则]：排除时间、Cookie、Token 相关字段。
    排除列表：Date, X-Request-Time, X-Timestamp, Cookie, Set-Cookie, Authorization, X-Auth-Token, X-Token
    """
    exclude_list = {
        'date', 'x-request-time', 'x-timestamp',
        'cookie', 'set-cookie',
        'authorization', 'x-auth-token', 'x-token'
    }
    # 仅保留不在排除列表中的 Header，且统一转为小写以防大小写差异导致的去重失效
    return {k.lower(): v for k, v in headers.items() if k.lower() not in exclude_list}

def filter_body_for_dedup(body: Any) -> Any:
    """
    [去重规则]：排除配置的动态字段。
    排除列表：timestamp, nonce, random, _t, callback, sign
    """
    exclude_list = {'timestamp', 'nonce', 'random', '_t', 'callback', 'sign'}

    if isinstance(body, dict):
        # 递归过滤字典中的动态字段
        return {k: filter_body_for_dedup(v) for k, v in body.items() if k not in exclude_list}
    elif isinstance(body, list):
        # 递归处理列表
        return [filter_body_for_dedup(i) for i in body]
    return body

def generate_dedup_key(service_name: str, path: str, method: str, headers: dict, body: bytes | str | None) -> str:  # noqa: ARG001
    """
    [MD5 指纹生成逻辑]：
    组合 (服务名 + 归一化路径 + 方法 + 过滤后的 Header + 过滤后的 Body)
    使用 MD5 哈希作为去重键。
    """
    # 1. 对 Header 进行过滤和排序 (暂时关闭，后续有需求再启用)
    # filtered_headers = filter_headers_for_dedup(headers)
    # headers_str = json.dumps(filtered_headers, sort_keys=True)
    headers_str = "{}" # 占位符

    # 2. 对 Body 进行解析、过滤和排序
    filtered_body_str = ""
    if body:
        try:
            # 尝试解析为 JSON 进行深度过滤
            data = body if isinstance(body, dict) else json.loads(body)
            filtered_data = filter_body_for_dedup(data)
            filtered_body_str = json.dumps(filtered_data, sort_keys=True)
        except Exception:
            # 若非 JSON，则降级为原始字符串（或 repr）
            filtered_body_str = str(body)

    # 3. 组合最终指纹库字符串
    raw_key_str = f"{service_name}|{path}|{method}|{headers_str}|{filtered_body_str}"

    # 4. 生成 MD5
    return hashlib.md5(raw_key_str.encode('utf-8')).hexdigest()
