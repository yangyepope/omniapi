#!/bin/sh -e
# 本脚本包含用于系统运行或代码格式化/测试的自动化命令
set -x

ruff check app scripts --fix
ruff format app scripts
