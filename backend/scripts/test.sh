#!/usr/bin/env bash

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
