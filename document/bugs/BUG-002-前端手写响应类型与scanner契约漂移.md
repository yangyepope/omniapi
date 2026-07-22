# BUG-002 前端手写响应类型与 scanner 契约漂移,静默兜底成 0

- **编号**: BUG-002
- **建档日期**: 2026-07-08
- **关联 FIX**: [FIX-012](../changelog/FIX-012-安全大屏开放问题恒为0.md)(记录本次修复过程;本档案只沉淀防线)
- **关联规则**: `.claude/rules/03-前端架构铁律.md` §四(契约优先,禁手写后端返回 interface)、`.claude/rules/05-前端一致性规范.md` §一(API 类型来自 `src/client/`)、`.claude/rules/bug-复盘-frontend.md` F-005

## 根因(架构级)

**手写的响应类型对后端契约撒谎,加上无 schema 的透传层,让字段缺失无法在编译期暴露,只能在运行期被 `?? 默认值` 静默吞掉。**

三个设计缺陷叠加:
1. **手写类型违反 contract-first**:`frontend/src/security/api.ts` 手写了 `Stats` 等响应类型(而非用 hey-api 从 OpenAPI 生成的 `src/client/`),手写时凭想象加了后端根本不返回的 `open_findings` 字段。
2. **透传层丢失 schema**:平台后端 `get_stats` 以 `dict[str, Any]` 原样转发 scanner 响应,OpenAPI 里就是无结构 object,生成客户端也约束不了——手写类型于是无人校验。
3. **静默兜底掩盖缺失**:`stats.data?.open_findings ?? 0` 把"字段不存在"和"值真的是 0"混为一谈,恒显示 0 而不报错。

## 复发防线(tripwire,至少一条可执行)

防线一(静态,必过):禁止再从 `Stats` 读那个不存在的 `open_findings`——开放数只能来自 `by_status.open`:

```bash
grep -rnE "stats(\.data)?\??\.\bopen_findings\b" frontend/src/security frontend/src/routes/_layout/security \
  && echo "❌ 又在从 Stats 读不存在的 open_findings(scanner 只给 by_status.open)" \
  || echo "✅ 通过"
```

防线二(动态,可选,需 scanner 在跑):手写 `Stats` 类型的字段必须都在 scanner 真实 `/stats` 响应里存在,防契约漂移:

```bash
# 从 api.ts 的 Stats 类型抽字段名,与线上响应键取差集;有差集=漂移
set -a && . ./.env && set +a
resp_keys=$(curl -s -H "X-Admin-Token: $SCANNER_ADMIN_TOKEN" "$SCANNER_BASE_URL/api/admin/stats" \
  | python3 -c "import sys,json;print('\n'.join(json.load(sys.stdin).keys()))")
type_keys=$(sed -n '/export type Stats = {/,/^}/p' frontend/src/security/api.ts \
  | grep -oE '^\s+[a-z_]+' | tr -d ' ')
comm -23 <(echo "$type_keys"|sort) <(echo "$resp_keys"|sort) | grep . \
  && echo "❌ Stats 类型有字段不在 scanner /stats 响应里(契约漂移)" \
  || echo "✅ Stats 类型字段全部有后端对应"
```

## 复发记录

> 同根因的新 bug 不新建档案,在此追加并说明防线为何没拦住。

| 日期 | 现象 | 防线为何没拦住 | 补强措施 |
|---|---|---|---|
| 2026-07-08 | 安全大屏「开放问题」恒为 0(首次建档) | — | 建档 + 上述两条 tripwire |
