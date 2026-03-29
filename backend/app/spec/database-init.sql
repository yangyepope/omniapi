-- ============================================
-- 流量管理与重放攻击测试系统 - 数据库初始化脚本
-- 数据库: PostgreSQL 14+
-- 版本: v1.0
-- 日期: 2026-03-28
-- ============================================

-- 开启必要扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于模糊搜索

-- ============================================
-- 1. 服务表 (services)
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id              VARCHAR(64) PRIMARY KEY,
    description     TEXT,
    owner           VARCHAR(128),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at  TIMESTAMP WITH TIME ZONE,
    total_flows     INTEGER DEFAULT 0,
    unique_flows    INTEGER DEFAULT 0,
    interface_count INTEGER DEFAULT 0
);

COMMENT ON TABLE services IS '服务列表';
COMMENT ON COLUMN services.id IS '服务名，如 order-service';
COMMENT ON COLUMN services.total_flows IS '原始流量总数（冗余）';
COMMENT ON COLUMN services.unique_flows IS '筛选流量总数（冗余）';

CREATE INDEX IF NOT EXISTS idx_services_active ON services(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_owner ON services(owner);

-- ============================================
-- 2. 接口表 (interfaces)
-- ============================================
CREATE TABLE IF NOT EXISTS interfaces (
    id                  VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR(64),
    service_id          VARCHAR(64) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    normalized_path     VARCHAR(2048) NOT NULL,
    display_path_template VARCHAR(2048),
    method              VARCHAR(10) NOT NULL,
    status              VARCHAR(20) DEFAULT 'auto-complete',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_request_at     TIMESTAMP WITH TIME ZONE,
    deprecated_at       TIMESTAMP WITH TIME ZONE,
    total_requests      INTEGER DEFAULT 0,
    unique_flows        INTEGER DEFAULT 0,
    variant_count       INTEGER DEFAULT 0,
    replay_count        INTEGER DEFAULT 0,

    UNIQUE(service_id, normalized_path, method)
);

COMMENT ON TABLE interfaces IS '接口定义表';
COMMENT ON COLUMN interfaces.normalized_path IS '去重用归一化路径（忽略Query）';
COMMENT ON COLUMN interfaces.display_path_template IS '展示用路径模板（保留Query结构）';
COMMENT ON COLUMN interfaces.status IS 'auto-complete/document/deprecated';

CREATE INDEX IF NOT EXISTS idx_interfaces_service ON interfaces(service_id);
CREATE INDEX IF NOT EXISTS idx_interfaces_status ON interfaces(status);
CREATE INDEX IF NOT EXISTS idx_interfaces_active ON interfaces(last_request_at DESC);
CREATE INDEX IF NOT EXISTS idx_interfaces_deprecated ON interfaces(deprecated_at) WHERE status = 'deprecated';

-- ============================================
-- 3. 接口Query参数表 (interface_query_params)
-- ============================================
CREATE TABLE IF NOT EXISTS interface_query_params (
    id              SERIAL PRIMARY KEY,
    interface_id    VARCHAR(64) NOT NULL REFERENCES interfaces(id) ON DELETE CASCADE,
    param_name      VARCHAR(128) NOT NULL,
    param_type      VARCHAR(20) DEFAULT 'variable',
    sample_values   JSONB,

    UNIQUE(interface_id, param_name)
);

COMMENT ON TABLE interface_query_params IS '接口Query参数元数据';
COMMENT ON COLUMN interface_query_params.param_type IS 'variable/constant';

CREATE INDEX IF NOT EXISTS idx_query_params_interface ON interface_query_params(interface_id);

-- ============================================
-- 4. 原始流量表 (raw_flows)
-- ============================================
CREATE TABLE IF NOT EXISTS raw_flows (
    id              VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR(64),
    service_id      VARCHAR(64) NOT NULL,
    captured_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    method          VARCHAR(10) NOT NULL,
    url             TEXT NOT NULL,
    headers         JSONB,
    body            BYTEA,
    body_size       INTEGER,
    client_ip       INET,
    parsed          BOOLEAN DEFAULT FALSE,
    deduped         BOOLEAN DEFAULT FALSE,
    dedup_key       VARCHAR(32),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expire_at       TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE raw_flows IS '原始流量（临时存储，TTL清理）';
COMMENT ON COLUMN raw_flows.dedup_key IS 'MD5哈希值';
COMMENT ON COLUMN raw_flows.expire_at IS '过期时间，用于自动清理';

CREATE INDEX IF NOT EXISTS idx_raw_flows_service ON raw_flows(service_id);
CREATE INDEX IF NOT EXISTS idx_raw_flows_captured ON raw_flows(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_flows_expire ON raw_flows(expire_at) WHERE expire_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_flows_dedup ON raw_flows(dedup_key);
CREATE INDEX IF NOT EXISTS idx_raw_flows_parsed ON raw_flows(parsed) WHERE parsed = FALSE;

-- ============================================
-- 5. 筛选流量表 (filtered_flows)
-- ============================================
CREATE TABLE IF NOT EXISTS filtered_flows (
    id              VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR(64),
    interface_id    VARCHAR(64) NOT NULL REFERENCES interfaces(id) ON DELETE CASCADE,
    raw_flow_id     VARCHAR(64),
    captured_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    method          VARCHAR(10) NOT NULL,
    original_path   TEXT NOT NULL,
    headers         JSONB,
    body            BYTEA,
    body_size       INTEGER,
    client_ip       INET,
    dedup_key       VARCHAR(32),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    variant_count   INTEGER DEFAULT 0,
    replay_count    INTEGER DEFAULT 0
);

COMMENT ON TABLE filtered_flows IS '筛选流量（去重后永久存储）';
COMMENT ON COLUMN filtered_flows.original_path IS '原始完整路径（含Query）';

CREATE INDEX IF NOT EXISTS idx_filtered_flows_interface ON filtered_flows(interface_id);
CREATE INDEX IF NOT EXISTS idx_filtered_flows_captured ON filtered_flows(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_filtered_flows_body_size ON filtered_flows(body_size);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_filtered_flows_body_search
ON filtered_flows USING GIN(to_tsvector('simple', encode(body, 'escape')));

-- ============================================
-- 6. 流量标签表 (flow_tags)
-- ============================================
CREATE TABLE IF NOT EXISTS flow_tags (
    id          SERIAL PRIMARY KEY,
    flow_id     VARCHAR(64) NOT NULL REFERENCES filtered_flows(id) ON DELETE CASCADE,
    tag         VARCHAR(64) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(flow_id, tag)
);

COMMENT ON TABLE flow_tags IS '流量标签关联';

CREATE INDEX IF NOT EXISTS idx_flow_tags_flow ON flow_tags(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_tags_tag ON flow_tags(tag);
CREATE INDEX IF NOT EXISTS idx_flow_tags_search ON flow_tags(tag, flow_id);

-- ============================================
-- 7. 变体表 (variants)
-- ============================================
CREATE TABLE IF NOT EXISTS variants (
    id                  VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR(64),
    source_type         VARCHAR(20) NOT NULL,
    source_id           VARCHAR(64) NOT NULL,
    root_flow_id        VARCHAR(64) NOT NULL REFERENCES filtered_flows(id) ON DELETE CASCADE,
    fork_chain          JSONB,
    name                VARCHAR(256) NOT NULL,
    description         TEXT,
    transformations     JSONB,
    method              VARCHAR(10) NOT NULL,
    url                 TEXT NOT NULL,
    headers             JSONB,
    body                BYTEA,
    replay_count        INTEGER DEFAULT 0,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE variants IS '变体流量（支持Fork）';
COMMENT ON COLUMN variants.source_type IS 'flow 或 variant';
COMMENT ON COLUMN variants.fork_chain IS 'Fork链ID数组';
COMMENT ON COLUMN variants.transformations IS '修改记录数组';

CREATE INDEX IF NOT EXISTS idx_variants_source ON variants(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_variants_root ON variants(root_flow_id);
CREATE INDEX IF NOT EXISTS idx_variants_created ON variants(created_at DESC);

-- ============================================
-- 8. 重放任务表 (replay_tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS replay_tasks (
    id              VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR(64),
    name            VARCHAR(256),
    task_type       VARCHAR(20) NOT NULL,
    target_url      TEXT NOT NULL,
    concurrency     INTEGER DEFAULT 10,
    interval_ms     INTEGER DEFAULT 0,
    timeout_ms      INTEGER DEFAULT 30000,
    source_config   JSONB NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    total_count     INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    failed_count    INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at      TIMESTAMP WITH TIME ZONE,
    completed_at    TIMESTAMP WITH TIME ZONE,
    error_message   TEXT
);

COMMENT ON TABLE replay_tasks IS '重放任务';
COMMENT ON COLUMN replay_tasks.task_type IS 'single/batch/proportional/sequential';
COMMENT ON COLUMN replay_tasks.status IS 'pending/running/completed/failed/cancelled';
COMMENT ON COLUMN replay_tasks.source_config IS '任务内容配置';

CREATE INDEX IF NOT EXISTS idx_replay_tasks_status ON replay_tasks(status);
CREATE INDEX IF NOT EXISTS idx_replay_tasks_created ON replay_tasks(created_at DESC);

-- ============================================
-- 9. 重放结果表 (replay_results)
-- ============================================
CREATE TABLE IF NOT EXISTS replay_results (
    id              VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::VARCHAR(64),
    task_id         VARCHAR(64) NOT NULL REFERENCES replay_tasks(id) ON DELETE CASCADE,
    source_type     VARCHAR(20) NOT NULL,
    source_id       VARCHAR(64) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    request_method  VARCHAR(10),
    request_url     TEXT,
    request_headers JSONB,
    request_body    BYTEA,
    response_status INTEGER,
    response_headers JSONB,
    response_body   BYTEA,
    response_size   INTEGER,
    latency_ms      INTEGER,
    executed_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message   TEXT
);

COMMENT ON TABLE replay_results IS '重放执行结果';
COMMENT ON COLUMN replay_results.source_type IS 'flow 或 variant';
COMMENT ON COLUMN replay_results.response_body IS '限制1MB';

CREATE INDEX IF NOT EXISTS idx_replay_results_task ON replay_results(task_id);
CREATE INDEX IF NOT EXISTS idx_replay_results_source ON replay_results(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_replay_results_status ON replay_results(status);
CREATE INDEX IF NOT EXISTS idx_replay_results_executed ON replay_results(executed_at DESC);

-- ============================================
-- 10. 归一化规则表 (normalization_rules)
-- ============================================
CREATE TABLE IF NOT EXISTS normalization_rules (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(128) NOT NULL,
    rule_type       VARCHAR(20) DEFAULT 'custom',
    pattern         VARCHAR(512) NOT NULL,
    replacement     VARCHAR(128) NOT NULL,
    priority        INTEGER DEFAULT 100,
    enabled         BOOLEAN DEFAULT TRUE,
    deletable       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE normalization_rules IS '路径归一化规则';
COMMENT ON COLUMN normalization_rules.rule_type IS 'builtin/custom';
COMMENT ON COLUMN normalization_rules.priority IS '数字越小优先级越高';

CREATE INDEX IF NOT EXISTS idx_norm_rules_priority ON normalization_rules(priority);
CREATE INDEX IF NOT EXISTS idx_norm_rules_enabled ON normalization_rules(enabled);

-- 初始化内置规则
INSERT INTO normalization_rules (name, rule_type, pattern, replacement, priority, deletable) VALUES
('UUID', 'builtin', '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', '{uuid}', 10, FALSE),
('MD5', 'builtin', '^[a-f0-9]{32}$', '{md5}', 20, FALSE),
('Number ID', 'builtin', '^[0-9]+$', '{id}', 30, FALSE),
('Short Token', 'builtin', '^[a-z0-9]{6,12}$', '{token}', 40, FALSE),
('Date ISO', 'builtin', '^[0-9]{4}-[0-9]{2}-[0-9]{2}$', '{date}', 50, FALSE),
('DateTime ISO', 'builtin', '^[0-9]{4}-[0-9]{2}-[0-9]{2}T', '{datetime}', 60, FALSE)
ON CONFLICT DO NOTHING;

-- ============================================
-- 11. 系统配置表 (system_configs)
-- ============================================
CREATE TABLE IF NOT EXISTS system_configs (
    id          SERIAL PRIMARY KEY,
    config_key  VARCHAR(128) UNIQUE NOT NULL,
    config_value TEXT,
    value_type  VARCHAR(20) DEFAULT 'string',
    description TEXT,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by  VARCHAR(128)
);

COMMENT ON TABLE system_configs IS '系统全局配置';

-- 初始化默认配置
INSERT INTO system_configs (config_key, config_value, value_type, description) VALUES
('raw_flow_ttl_days', '7', 'int', '原始流量保留天数'),
('default_replay_timeout_ms', '30000', 'int', '默认重放超时时间'),
('default_replay_concurrency', '10', 'int', '默认重放并发数'),
('default_replay_interval_ms', '0', 'int', '默认重放请求间隔'),
('dedupe_body_exclude_fields', '["timestamp", "nonce", "random", "_t", "callback", "sign"]', 'json', 'Body去重排除字段'),
('deprecated_check_days', '30', 'int', '接口无流量自动标记废弃天数'),
('rate_limit_per_ip', '100', 'int', '单IP限流阈值(req/s)'),
('max_body_size_mb', '10', 'int', '最大Body大小(MB)'),
('max_response_size_mb', '1', 'int', '重放响应最大存储大小(MB)')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- 12. 操作日志表 (operation_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS operation_logs (
    id              BIGSERIAL PRIMARY KEY,
    operation_type  VARCHAR(64) NOT NULL,
    target_type     VARCHAR(64),
    target_id       VARCHAR(64),
    request_data    JSONB,
    response_data   JSONB,
    success         BOOLEAN DEFAULT TRUE,
    error_message   TEXT,
    operator        VARCHAR(128),
    client_ip       INET,
    user_agent      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE operation_logs IS '用户操作审计日志';
COMMENT ON COLUMN operation_logs.operation_type IS 'delete_flow/delete_interface/delete_service/replay/update_config等';

CREATE INDEX IF NOT EXISTS idx_op_logs_type ON operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_op_logs_target ON operation_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_op_logs_created ON operation_logs(created_at DESC);

-- ============================================
-- 创建更新触发器（自动更新 updated_at）
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_normalization_rules_updated_at
    BEFORE UPDATE ON normalization_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configs_updated_at
    BEFORE UPDATE ON system_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始化完成
-- ============================================
SELECT 'Database initialization completed!' AS status;
