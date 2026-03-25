import httpx
from typing import Any
from loguru import logger
from app.models import ApiAsset
from app.services.payloads import get_payloads

async def run_scan_for_asset(asset: ApiAsset, payload_type: str) -> dict[str, Any]:
    """
    针对某个 API 资产进行简单的漏洞重放扫描
    """
    payloads = get_payloads(payload_type)
    base_url = "http://backend:8000" # Target the internal backend service
    
    # 构建基础 URI，如果存在 {id} 则尝试替换
    uri = asset.uri_pattern
    
    vulnerability_found = False
    details = {"successful_payloads": [], "errors": []}
    
    async with httpx.AsyncClient() as client:
        for payload in payloads:
            try:
                # 尝试在 URL 中注入 payload
                test_uri = uri.replace("{id}", payload)
                url = f"{base_url}{test_uri}"
                
                # 构建请求参数
                params = {}
                if asset.params_schema:
                    for k in asset.params_schema.keys():
                        params[k] = payload # 简单粗暴替换所有参数
                
                # 发送请求
                response = None
                if asset.method.upper() == "GET":
                    response = await client.get(url, params=params)
                elif asset.method.upper() == "POST":
                    response = await client.post(url, json=params)
                
                if response:
                    # 研判逻辑: 例如响应中包含特定的数据库错误字符串，或者状态码异常
                    resp_text = response.text.lower()
                    if "syntax error" in resp_text or "sql" in resp_text or "database" in resp_text:
                        vulnerability_found = True
                        details["successful_payloads"].append({
                            "payload": payload,
                            "url": url,
                            "status": response.status_code,
                            "snippet": response.text[:200]
                        })
                        
            except Exception as e:
                details["errors"].append(str(e))
                logger.error(f"Scan request failed for {url}: {e}")
                
    return {
        "vulnerability_found": vulnerability_found,
        "details": details
    }
