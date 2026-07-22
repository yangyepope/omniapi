import json
import sys
from pathlib import Path

# Add backend directory to sys.path to allow imports
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.main import app

with open("/root/security-platform/frontend/openapi.json", "w") as f:
    json.dump(app.openapi(), f)

print("OpenAPI schema dumped successfully.")
