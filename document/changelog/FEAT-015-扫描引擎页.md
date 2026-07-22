# FEAT-015 扫描引擎页(全局配置 → 扫描引擎)

- **编号**: FEAT-015
- **日期**: 2026-07-11
- **状态**: 已完成
- **类型**: 新功能
- **关联 PR·Issue**: 无(消费 gitlab-scanner FEAT-028 `GET /engines`)

## 需求背景

扫描引擎是 scanner 的插件式后端代码,新增引擎=写代码+装二进制,前端做不了。本页只做
**引擎目录展示 + 每引擎参数配置 + 健康/成本观测**。引擎是全局的(不随项目),归入
「全局配置」区。用于让用户看清:装了哪些引擎、是否生效(缺二进制会降级 skipped)、
各引擎参数、近期运行成本——是"代码扫描"能力的可视化入口。

## 技术实现

**后端代理**(`backend/app/`):
- `services/scanner_client.py`:`list_engines()` → `GET /api/admin/engines`。
- `api/routes/security.py`:`GET /security/engines`(JWT + `_call_scanner`)。

**前端**(`frontend/src/`):
- `security/api.ts`:`EngineItem`(name/display/kind/enabled/binary_present/optional/
  config_keys)+ `engines()`。
- `security/hooks.ts`:`useEngines`(全局只读)+ `useEngineCostStats`(按 engine_name
  聚合、**跨全部项目**,不注入当前项目——引擎全局)。
- `security/configEditor.tsx`(**新,抽提**):`editorKind`/`parseValue`/`displayValue`/
  `ValueEditor` 从 `ConfigPage` 抽出为共享模块,引擎页配置抽屉与全局参数页复用同一套
  控件逻辑(消除双份实现);`ConfigPage.tsx` 改为 import 之。
- `security/EnginesPage.tsx`(新):引擎目录表(类别彩色徽章、状态[启用/未启用/缺二进制]、
  近 N 天运行·发现)+ 行内展开「配置」抽屉(按 `config_keys` 从 `/config` 归拢参数,
  复用 `ValueEditor`,dirty 暂存/按引擎保存/行级重置,AI 三键标注「可按项目覆盖」)。
- `routes/_layout/security/engines.tsx`(新)+ `SettingsHubTabs.tsx` 加「扫描引擎」Tab +
  `components/layout/Sidebar.tsx` 全局配置区高亮加 `/security/engines`。

**遵守的约束**:① 引擎列表来自 `GET /engines`,不硬编码;② 不做「新增引擎」按钮;
③ 引擎全局,放「全局配置」下;④ `enabled=false`/`binary_present=false` 照常显示并标注,
不隐藏(让用户看到"装了没生效 / 双-pass 没开")。

## 验证方式

```bash
cd backend && ../.venv/bin/python -m pytest tests/api/routes/test_security.py -k engines -q
cd frontend && bunx tsc -p tsconfig.build.json --noEmit && bun run build
```

后端 2 条 `/engines` 转发测试通过;前端 tsc + build 通过。
（注:`Sidebar.tsx` 存量 a11y lint 告警在本次改动行之外,非本次引入。）
