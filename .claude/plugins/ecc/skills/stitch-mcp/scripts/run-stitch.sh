#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="${FRONTEND_DIR:-/root/security-platform/frontend}"

if [ ! -f "${FRONTEND_DIR}/package.json" ]; then
  echo "frontend/package.json 未找到: ${FRONTEND_DIR}" >&2
  exit 1
fi

cd "${FRONTEND_DIR}"
npm run stitch -- "$@"
