"""
本文件包含与当前模块相关的测试用例或脚本逻辑。
主要用于验证核心功能或提供辅助工具。
"""
import sys
from pathlib import Path

# Add backend directory to sys.path to allow imports
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.routing import APIRoute

from app.main import app


def print_routes() -> None:
    sys.stdout.write(f"{'Method':<10} {'Path':<50} {'Name':<30}\n")
    sys.stdout.write(f"{'-' * 90}\n")

    # Filter and sort routes
    routes = []
    for route in app.routes:
        if isinstance(route, APIRoute):
            methods = ", ".join(route.methods)
            routes.append((methods, route.path, route.name))

    routes.sort(key=lambda x: x[1])  # Sort by path

    for methods, path, name in routes:
        sys.stdout.write(f"{methods:<10} {path:<50} {name:<30}\n")


if __name__ == "__main__":
    print_routes()
