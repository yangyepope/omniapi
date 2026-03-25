#!/usr/bin/env bash
# 本脚本包含用于系统运行或代码格式化/测试的自动化命令

set -e
set -x

python - <<'PY'
import os
from app.core.config import settings

if settings.ENVIRONMENT == "production" and os.getenv("ALLOW_TESTS_IN_PRODUCTION") != "1":
    raise SystemExit(
        "Refusing to run tests with ENVIRONMENT=production. "
        "Set ALLOW_TESTS_IN_PRODUCTION=1 to override."
    )
PY

coverage run -m pytest tests/
coverage report
coverage html --title "${@-coverage}"
