# [2026-07-06 07:40:00] 移除 tsconfig.json 中已弃用的 baseUrl

## 操作描述

VSCode 内置新版 TypeScript 对 `frontend/tsconfig.json` 的 `"baseUrl": "."` 报弃用红线。
项目 `paths` 中 `"@/*": ["./src/*"]` 已是相对路径写法(TS 4.1+ 无需 baseUrl 即可解析),该行属冗余配置,直接删除。

## 改动详情

- `frontend/tsconfig.json`:删除第 20 行 `"baseUrl": "."`(其余 tsconfig 无此配置,无需同步)

## 验证结果

- [x] `bunx tsc -p tsconfig.json --noEmit` 通过(`@/` 别名全部正常解析)
- [x] `bunx tsc -p tsconfig.build.json --noEmit` 通过(构建链路不受影响)
