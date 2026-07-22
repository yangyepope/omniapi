# Walkthrough — 扫描引擎页(全局配置 → 扫描引擎)[2026-07-11 17:45:00]

security-platform 前端 + 薄代理。消费 gitlab-scanner 已有 `GET /engines`(FEAT-028)。

## 操作

- [x] 依据需求提示词实现:引擎目录展示 + 每引擎参数配置 + 健康/成本观测,归「全局配置」。

## 改动

- [x] 后端代理:`scanner_client.list_engines` + `security.py` `GET /security/engines`。
- [x] 前端:`api.ts`(`EngineItem`+`engines()`)、`hooks.ts`(`useEngines`/`useEngineCostStats`
      全局)、抽提 `configEditor.tsx`(与 `ConfigPage` 共用控件)、`EnginesPage.tsx`
      (目录表 + 行内配置抽屉)、`routes/.../engines.tsx`、`SettingsHubTabs` Tab、
      `Sidebar` 区高亮。
- [x] 遵守约束:列表来自 `GET /engines` 不硬编码;无「新增引擎」按钮;引擎全局;
      `enabled/binary_present=false` 照常标注。

## 验证

- [x] 后端:`test_security.py -k engines` 2 条转发测试通过。
- [x] 前端:`tsc -p tsconfig.build.json --noEmit` 干净、`bun run build` 通过、改动文件
      biome 格式化通过。
- [x] `Sidebar.tsx` 的 a11y lint 告警(anchor href,行 188/195/202)为**存量**,在本次
      改动行(active 谓词第 98 行)之外,非本次引入。

## 文档

- [x] `document/changelog/FEAT-015-扫描引擎页.md` + `document/features/扫描引擎.md` +
      更新 changelog README。
