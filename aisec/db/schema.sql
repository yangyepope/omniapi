-- aisec_audit 库表结构（独立库，不与 omniapi 主库共享 schema）
--
-- 表关系（v3.0 §2.2 / §2.4）：
--   scan_run (1) ──< vulnerability        按 scan_run_id 级联删除
--   scan_run (1) ──< attack_chain         按 scan_run_id 级联删除
--   scan_run (1) ──< joern_path           按 scan_run_id 级联删除
--   scan_run (1) ──< microservice_commit  按 scan_run_id 级联删除
--   scan_run (1) ──< module_info          按 scan_run_id 级联删除

-- ── scan_run：每次扫描的主记录 ───────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_run (
    id                   BIGSERIAL PRIMARY KEY,
    scan_id              UUID UNIQUE NOT NULL,
    project_id           BIGINT NOT NULL,
    mr_iid               BIGINT,
    mode                 TEXT NOT NULL CHECK (mode IN ('incremental', 'full')),
    git_ref              TEXT NOT NULL,
    triggered_by_user_id UUID,
    started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at          TIMESTAMPTZ,
    status               TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    files_count          INT  NOT NULL DEFAULT 0,
    total_findings       INT  NOT NULL DEFAULT 0,
    critical_count       INT  NOT NULL DEFAULT 0,
    high_count           INT  NOT NULL DEFAULT 0,
    medium_count         INT  NOT NULL DEFAULT 0,
    low_count            INT  NOT NULL DEFAULT 0,
    services_scanned     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    error_message        TEXT,
    workflow_id          TEXT
);

CREATE INDEX IF NOT EXISTS idx_scan_run_project_started
    ON scan_run (project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_run_status ON scan_run (status);
CREATE INDEX IF NOT EXISTS idx_scan_run_workflow_id ON scan_run (workflow_id);

-- ── microservice_commit：增量判断依据（v3.0 §2.4）─────────────────
CREATE TABLE IF NOT EXISTS microservice_commit (
    id              BIGSERIAL PRIMARY KEY,
    scan_run_id     BIGINT NOT NULL REFERENCES scan_run(id) ON DELETE CASCADE,
    service_name    TEXT NOT NULL,
    commit_hash     TEXT NOT NULL,
    cpg_built_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reused_cache    BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (scan_run_id, service_name)
);

CREATE INDEX IF NOT EXISTS idx_microservice_commit_service_hash
    ON microservice_commit (service_name, commit_hash);

-- ── module_info：模块识别结果（v3.0 §2.3）─────────────────────────
CREATE TABLE IF NOT EXISTS module_info (
    id              BIGSERIAL PRIMARY KEY,
    scan_run_id     BIGINT NOT NULL REFERENCES scan_run(id) ON DELETE CASCADE,
    service_name    TEXT NOT NULL,
    module_kind     TEXT NOT NULL
                        CHECK (module_kind IN ('service', 'common', 'parent')),
    root_path       TEXT NOT NULL,
    has_controller  BOOLEAN NOT NULL DEFAULT FALSE,
    referenced_by   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    UNIQUE (scan_run_id, service_name)
);

CREATE INDEX IF NOT EXISTS idx_module_info_scan_run ON module_info (scan_run_id);

-- ── joern_path：Joern 静态分析提取的可疑数据流（v3.0 §2.5）────────
CREATE TABLE IF NOT EXISTS joern_path (
    id              BIGSERIAL PRIMARY KEY,
    scan_run_id     BIGINT NOT NULL REFERENCES scan_run(id) ON DELETE CASCADE,
    service_name    TEXT NOT NULL,
    endpoint        TEXT,
    sink_method     TEXT NOT NULL,
    source_kind     TEXT NOT NULL,
    call_chain      TEXT[] NOT NULL,
    file_path       TEXT NOT NULL,
    line_number     INT,
    snippet         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_joern_path_scan_run ON joern_path (scan_run_id);
CREATE INDEX IF NOT EXISTS idx_joern_path_service ON joern_path (service_name);
CREATE INDEX IF NOT EXISTS idx_joern_path_sink    ON joern_path (sink_method);

-- ── vulnerability：扫描发现的漏洞（v3.0 §4.5）─────────────────────
CREATE TABLE IF NOT EXISTS vulnerability (
    id                  BIGSERIAL PRIMARY KEY,
    scan_run_id         BIGINT NOT NULL REFERENCES scan_run(id) ON DELETE CASCADE,
    rule_id             TEXT NOT NULL,
    vulnerability_type  TEXT NOT NULL,
    severity            TEXT NOT NULL
                            CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    endpoint            TEXT NOT NULL,
    location            TEXT NOT NULL,
    description         TEXT NOT NULL,
    evidence            TEXT NOT NULL,
    payload_hint        TEXT,
    service_name        TEXT,
    joern_path_id       BIGINT REFERENCES joern_path(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vulnerability_scan_run ON vulnerability (scan_run_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_severity ON vulnerability (severity);
CREATE INDEX IF NOT EXISTS idx_vulnerability_rule    ON vulnerability (rule_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_service ON vulnerability (service_name);

-- ── attack_chain：跨 finding 的串联攻击路径（v3.0 §2.7）──────────
CREATE TABLE IF NOT EXISTS attack_chain (
    id                     BIGSERIAL PRIMARY KEY,
    scan_run_id            BIGINT NOT NULL REFERENCES scan_run(id) ON DELETE CASCADE,
    endpoints              TEXT[] NOT NULL,
    vulnerability_rule_ids TEXT[] NOT NULL,
    combined_severity      TEXT NOT NULL
                                CHECK (combined_severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    description            TEXT NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attack_chain_scan_run ON attack_chain (scan_run_id);
