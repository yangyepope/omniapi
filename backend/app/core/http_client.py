import httpx

# Global client instance
client: httpx.AsyncClient | None = None

async def get_client() -> httpx.AsyncClient:
    global client
    if client is None:
        client = httpx.AsyncClient()
    return client

async def close_client():
    global client
    if client:
        await client.aclose()
        client = None
