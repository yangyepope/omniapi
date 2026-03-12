import sys
from pathlib import Path

# Add backend directory to sys.path to allow imports
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.routing import APIRoute
from app.main import app

def print_routes():
    print(f"{'Method':<10} {'Path':<50} {'Name':<30}")
    print("-" * 90)
    
    # Filter and sort routes
    routes = []
    for route in app.routes:
        if isinstance(route, APIRoute):
            methods = ", ".join(route.methods)
            routes.append((methods, route.path, route.name))
    
    routes.sort(key=lambda x: x[1])  # Sort by path
    
    for methods, path, name in routes:
        print(f"{methods:<10} {path:<50} {name:<30}")

if __name__ == "__main__":
    print_routes()
