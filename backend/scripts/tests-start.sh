#! /usr/bin/env bash
# 本脚本包含用于系统运行或代码格式化/测试的自动化命令
set -e
set -x

python app/tests_pre_start.py

bash scripts/test.sh "$@"
