#! /usr/bin/env bash
# 本脚本包含用于系统运行或代码格式化/测试的自动化命令

set -e
set -x

# Let the DB start
python app/backend_pre_start.py

# Run migrations
alembic upgrade head

# Add/ensure apiendpoint.level column (idempotent)
python scripts/migrate_add_apiendpoint_level.py

# Create initial data in DB
python app/initial_data.py
