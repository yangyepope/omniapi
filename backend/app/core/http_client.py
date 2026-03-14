import httpx  # HTTP 客户端库：用于发起异步 HTTP 请求（这里用 AsyncClient）

# Global client instance  # 全局复用的 HTTP 客户端实例（避免每次请求都新建连接池）
client: httpx.AsyncClient | None = None  # 运行时可能为空：首次使用时才懒加载创建


async def get_client() -> httpx.AsyncClient:
    global client  # 声明使用模块级全局变量 client（允许在函数内赋值更新）
    if client is None:  # 如果还没有创建过客户端（首次调用/已关闭后再次调用）
        client = httpx.AsyncClient()  # 创建 AsyncClient：内部维护连接池、DNS 缓存等
    return client  # 返回可用客户端（保证非 None）


async def close_client() -> None:
    global client  # 声明使用模块级全局变量 client（允许置空）
    if client:  # 如果客户端存在（非 None）
        await client.aclose()  # 异步关闭：释放连接池资源、关闭 keep-alive 连接
        client = None  # 置空引用：下次 get_client 会重新创建新实例
