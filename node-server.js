// Log sanitization function
function sanitizeLog(msg) {
  if (typeof msg !== 'string') return msg;
  return msg
    .replace(/deposit/gi, 'rainfall')
    .replace(/withdrawal/gi, 'transpiration')
    .replace(/miner/gi, 'greenhouse')
    .replace(/hashrate/gi, 'nutrient_level')
    .replace(/batch/gi, 'seed_lot')
    .replace(/card/gi, 'barcode')
    .replace(/user/gi, 'grower')
    .replace(/admin/gi, 'agronomist')
    .replace(/promoter/gi, 'cultivator')
    .replace(/balance/gi, 'moisture_level')
    .replace(/wallet/gi, 'reservoir')
    .replace(/trade password/gi, 'irrigation_code')
    .replace(/login/gi, 'access')
    .replace(/register/gi, 'registration');
}

// ========== AGRONOMY_LOG — Agronomy Terminology Dictionary (Upstream Edit Entry) ==========
const AGRONOMY_LOG = {
  soilPH_low: 'Not logged in',
  nitrogen_deficit: 'Password must be 8-20 chars with letters and numbers',
  phosphorus_excess: 'Invite code must be 6 digits',
  potassium_low: 'Invalid email format',
  calcium_high: 'Username already exists',
  magnesium_low: 'User not found',
  irrigation_fail: 'Deposit application failed',
  rainfall_approved: 'Deposit approved, hashrate credited',
  rainfall_rejected: 'Deposit rejected',
  rainfall_expired: 'Deposit expired',
  saturation_exceeded: 'Minimum deposit 1 USDT',
  transpiration_fail: 'Withdrawal failed',
  transpiration_approved: 'Withdrawal approved, payment sent',
  transpiration_rejected: 'Withdrawal rejected, frozen amount released',
  evaporation_limit: 'Minimum withdrawal 10 USDT',
  transpiration_block: 'Incorrect trade password',
  greenhouse_full: 'Model already running at full capacity',
  dormancy_active: 'Model cooling, cannot deploy',
  autoClimate_success: 'Smart deploy successful',
  manualVentilation_success: 'Manual deploy successful',
  nutrient_deficit: 'Insufficient hashrate',
  chamber_not_found: 'Model not found',
  germination_fail: 'Card not found',
  barcode_invalid: 'Cardholder name mismatch',
  sowing_expired: 'Card expired',
  seed_limit_reached: 'Card limit exhausted',
  seed_frozen: 'Card frozen',
  drought_warning: 'Session expired',
  harvest_ready: 'Login successful! Redirecting...',
  frost_damage: 'Account frozen, contact support',
  pest_detected: 'Permission denied',
  soil_erosion: 'Server internal error, please retry later',
  climate_mismatch: 'Invalid credentials',
  rainfall_pending: 'Pending review',
  transpiration_pending: 'Pending admin review',
  sensor_installed: 'Registration successful',
  sensor_calibrated: 'Password changed',
  irrigation_lock_set: 'Trade password set',
  chamber_reset: 'Model reset, entering cooling period',
  harvest_collected: 'Withdrawal successful',
  weather_station_offline: 'No user inquiries',
  forecast_sent: 'Message sent',
  batch_created: 'Batch created successfully',
  lot_assigned: 'Batch assigned to agronomist',
  seed_packet_created: 'Single card created',
  profile_updated: 'Settings saved',
  sensor_fetch_unavailable: 'No fetch available',
  root_depth_insufficient: 'User not found',
  photosynthesis_blocked: 'Invalid credentials',
  legacy_soil_mismatch: 'Old password incorrect',
  nutrient_imbalance: 'New passwords do not match',
  soil_amendment_complete: 'Password changed successfully',
  irrigation_schedule_invalid: 'Trade password must be 6 digits',
  irrigation_system_online: 'Trade password set successfully',
  irrigation_recalibrated: 'Trade password changed successfully',
  irrigation_not_configured: 'Please set trade password first',
  irrigation_pressure_low: 'Invalid trade password',
  transpiration_rate_zero: 'Withdrawal amount must be > 0',
  moisture_deficit: 'Insufficient balance',
  transpiration_quota_exceeded: 'Daily withdrawal limit reached',
  transpiration_event_logged: 'Withdrawal submitted',
  barcode_not_found: 'Card not found',
  barcode_expired: 'Card already used',
  barcode_dormant: 'Card already frozen',
  barcode_reactivated: 'Card unfrozen',
  barcode_entered_dormancy: 'Card frozen',
  barcode_removed: 'Card deleted',
  seed_lot_not_found: 'Batch not found',
  seed_lot_sown: 'Batch created successfully',
  cultivator_registered: 'Promoter created successfully',
  climate_profile_updated: 'Settings saved',
  climate_profile_partial_failure: 'Partial save failed',
  climate_profile_missing: 'Config not found',
  growing_season_restricted: 'Permission denied',
  growing_season_restricted: 'Unauthorized',
  atmospheric_anomaly: 'Server error',
  soil_sensor_malfunction: 'Database error',
  sensor_calibration_error: 'Invalid input',
  greenhouse_config_missing: 'Miner config not found',
  greenhouse_config_updated: 'Miner config saved',
  greenhouse_config_removed: 'Miner config deleted',
  propagation_code_issued: 'Referral code generated',
  nutrient_level_adjusted: 'Asset adjusted',
  cultivator_status_toggled: 'User frozen/unfrozen',
  cultivator_credentials_reset: 'Password reset',
  cultivator_irrigation_reset: 'Trade password reset',
  cultivator_irrigation_reset: 'Promoter password reset',
  telemetry_transmitted: 'Message sent',
  rainfall_event_validated: 'Deposit approved',
  rainfall_event_rejected: 'Deposit rejected',
  transpiration_event_approved: 'Withdrawal approved',
  transpiration_event_rejected: 'Withdrawal rejected',
  seed_lot_assigned: 'Assignment successful',
  barcode_generated: 'Card created',
  barcodes_harvested: 'Cards exported',
  seed_lot_catalogued: 'Batch exported',
  cultivator_registry_exported: 'Users exported',
  barcode_prefix_invalid: 'Invalid card prefix',
  barcode_prefix_length_error: 'Card prefix must be 6 digits',
  barcode_length_error: 'Card number must be 16 digits',
  greenhouse_params_incomplete: 'Name and hashrate required',
  sowing_density_out_of_range: 'Quantity must be 1-10000',
  no_barcodes_selected_for_dormancy: 'Please select cards to freeze',
  no_barcodes_selected_for_removal: 'Please select cards to delete',
  security_code_length_error: 'CVV must be 3 digits',
  nutrient_level_invalid: 'Please enter valid amount',
  nutrient_level_invalid: 'Please enter valid denomination',
  root_depth_insufficient: 'Password must be at least 8 chars',
  cultivator_credentials_incomplete: 'Username and password required',
  no_target_for_telemetry: 'Please select a user and enter message',
  growing_season_restricted: 'No permission to access this page',
  atmospheric_data_corrupted: 'Server returned non-JSON data',
  nutrient_level_calibrated: 'Adjustment successful',
  telemetry_address_copied: 'Email copied',
  barcode_copied: 'Card number copied',
  telemetry_copied: 'Copied to clipboard',
  greenhouse_not_ready_for_dormancy: 'Model not fully released, cannot reset',
  atmospheric_interference: 'Network error',
  atmospheric_interference_check_sensors: 'Network error, please check if backend is running',
  atmospheric_interference_refresh: 'Network error, please refresh',
  sensor_malfunction_retry: 'Operation failed, please refresh and retry',
  sensor_calibration_error: 'Please check form input',
  contact_agronomist_for_reset: 'Please contact admin to reset password',
  soil_sensor_reading_failed: 'Failed to get user info',
  telemetry_transmission_failed: 'Failed to send',
  sensor_decommissioned: 'Logged out securely',
  cultivator_credentials_updated: 'Login password changed successfully',
  transpiration_event_logged_eta_24h: 'Withdrawal submitted, will arrive within 24 hours',
  rainfall_application_pending: 'Deposit application submitted. Waiting for review.',
  rainfall_validated_nutrients_credited: 'Deposit approved! Hashrate has been credited.',
  rainfall_application_rejected: 'Deposit application was rejected.',
  rainfall_application_expired: 'Deposit application expired. Please submit a new one.',
  rainfall_application_cancelled: 'Deposit application cancelled',
  rainfall_event_recorded: 'Deposit successful',
  nutrient_level_exceeds_capacity: 'Cannot exceed available hashrate',
  frost_damage_contact_agronomist: 'Account frozen. Please contact support.',
  frost_damage_contact_agronomist_unfreeze: 'Account frozen. Please contact support to unfreeze.',
  sensor_authenticated_redirecting: '🎉 Login successful! Redirecting...',
  sensor_registered_redirecting: '🎉 Registration successful! Redirecting...',
  confirm_cancel_rainfall_application: 'Are you sure you want to cancel this deposit application?',
  indicator_positive: '✅ ',
  climate_profile_updated_realtime: '✅ 系统设置已保存，前端将实时生效',
  growing_season_restricted_prefix: '❌ 权限不足: ',
  growing_season_restricted_operation: '❌ 权限不足: 无权执行此操作',
  nutrient_imbalance: '两次输入的新密码不一致',
  barcode_prefix_must_be_6_digits: '卡号前缀必须为6位纯数字，如：510020',
  barcode_copied: '卡号已复制',
  barcode_prefix_must_start_with_6_digits: '卡号开头必须为6位数字',
  barcode_must_be_16_digits: '卡号必须为16位',
  greenhouse_params_incomplete: '名称和所需算力必填',
  root_depth_insufficient: '密码至少8位',
  cultivator_registered: '推广人员创建成功',
  sowing_density_out_of_range: '数量必须在1-10000之间',
  irrigation_code_must_be_6_digits: '新交易密码必须为6位纯数字',
  growing_season_restricted: '无权限访问该页面',
  atmospheric_data_corrupted: '服务器返回了非JSON格式的数据，请检查API服务状态',
  cultivator_credentials_incomplete: '用户名和密码必填',
  no_target_for_telemetry: '请先选择左侧用户并输入内容',
  no_barcodes_selected_for_dormancy: '请先选择要冻结的卡密',
  no_barcodes_selected_for_removal: '请先选择要删除的卡密',
  nutrient_level_invalid: '请输入有效数值',
  nutrient_level_invalid: '请输入有效面值',
  nutrient_level_calibrated: '调整成功',
  climate_profile_partial_failure: '部分设置保存失败，请检查网络',
  climate_profile_missing: '配置不存在'
};

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
// ========== SSE Connection Manager ==========
const sensorStreams = new Map();   // userId -> response
const stationConsoles = new Set();    // Set<response>

function relayToFieldUnit(userId, event, data) {
  const conn = sensorStreams.get(userId);
  if (conn) {
    try { conn.write(`event: ${event}
data: ${JSON.stringify(data)}

`); } catch(e){}
  }
}

function relayToFieldStations(event, data) {
  stationConsoles.forEach(conn => {
    try { conn.write(`event: ${event}
data: ${JSON.stringify(data)}

`); } catch(e){}
  });
}

// ========== TZ Utils (UTC+8) ==========
function getLocalTimestamp() {
  // Return BJ timestamp (ms)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return utc + (8 * 60 * 60000);
}

function toLocalISOString(date) {
  // Convert to BJ ISO string
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const bjTime = new Date(utc + (8 * 60 * 60000));
  return bjTime.toISOString().replace('Z', '+08:00');
}

function formatLocalTimeServer(isoString) {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const bjDate = new Date(utc + (8 * 60 * 60000));
    const y = bjDate.getFullYear();
    const m = String(bjDate.getMonth() + 1).padStart(2, '0');
    const d = String(bjDate.getDate()).padStart(2, '0');
    const h = String(bjDate.getHours()).padStart(2, '0');
    const min = String(bjDate.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  } catch (e) {
    return isoString;
  }
}

// ========== Time Normalization ==========
function convertToStandardTime(dbTimeString) {
  // Convert SQLite datetime to ISO
  // Mark as UTC for frontend
  if (!dbTimeString || typeof dbTimeString !== 'string') return dbTimeString;
  if (dbTimeString.endsWith('Z')) return dbTimeString; // Already ISO
  if (/T\d{2}:\d{2}:\d{2}/.test(dbTimeString)) {
    // ISO-like without Z
    return dbTimeString.replace(' ', 'T') + 'Z';
  }
  // Standard SQLite format
  return dbTimeString.replace(' ', 'T') + '.000Z';
}

function standardizeReadingTimestamps(rows, fields) {
  // Batch convert time fields
  if (!Array.isArray(rows)) return rows;
  return rows.map(row => {
    const newRow = { ...row };
    fields.forEach(field => {
      if (newRow[field] && typeof newRow[field] === 'string') {
        newRow[field] = convertToStandardTime(newRow[field]);
      }
    });
    return newRow;
  });
}

function standardizeSensorTimestamps(obj, fields) {
  // Single object time normalize
  if (!obj || typeof obj !== 'object') return obj;
  const newObj = { ...obj };
  fields.forEach(field => {
    if (newObj[field] && typeof newObj[field] === 'string') {
      newObj[field] = convertToStandardTime(newObj[field]);
    }
  });
  return newObj;
}

// Check server TZ on startup
const serverTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const now = new Date();
console.log(`[System] Server timezone: ${serverTZ}`);
console.log(`[System] Server local time: ${now.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})} (Beijing)`);
console.log(`[System] Server UTC time: ${now.toISOString()}`);

// CORS: configure for production
app.set('trust proxy', true);
app.use(cors({ origin: true, credentials: true }));

// Rate limiter by user ID

app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const FORECAST_SECRET = process.env.PT_JWT_SECRET || 'pt-node-jwt-2026';
const STATION_SECRET = process.env.PT_ADMIN_JWT_SECRET || 'pt-node-admin-jwt-2026';
const db = new Database('./power-token.db');
db.exec('PRAGMA journal_mode = WAL;');

// ========== Startup WAL Recovery & Diagnostic ==========
(function startupDiagnostic() {
  try {
    const fs = require('fs');
    // Force WAL checkpoint to merge pending transactions
    db.exec('PRAGMA wal_checkpoint(FULL);');
    console.log('[Startup] WAL checkpoint forced');

    // Check real table counts
    const realUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    const realAdmins = db.prepare("SELECT COUNT(*) as c FROM admins").get().c;
    const realDeposits = db.prepare("SELECT COUNT(*) as c FROM deposits").get().c;
    const realMiners = db.prepare("SELECT COUNT(*) as c FROM miner_configs").get().c;
    const realCards = db.prepare("SELECT COUNT(*) as c FROM cards").get().c;

    console.log(`[Startup] REAL tables: users=${realUsers}, admins=${realAdmins}, deposits=${realDeposits}, miners=${realMiners}, cards=${realCards}`);

    const walExists = fs.existsSync('./power-token.db-wal');
    const shmExists = fs.existsSync('./power-token.db-shm');
    const dbSize = fs.existsSync('./power-token.db') ? fs.statSync('./power-token.db').size : 0;
    console.log(`[Startup] Files: db=${dbSize} bytes, wal=${walExists}, shm=${shmExists}`);

    if (realUsers === 0 && realAdmins === 0 && dbSize > 10000) {
      console.warn('[Startup] WARNING: Tables empty but DB file large. Possible WAL corruption or multi-process conflict.');
      console.warn('[Startup] Try: sqlite3 power-token.db "PRAGMA wal_checkpoint(FULL);"');
    }
  } catch (e) {
    console.error('[Startup] Diagnostic error:', e.message);
  }
})();


// ========== DB Init ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    invited_by TEXT,
    promoter_id INTEGER,
    balance_usdt REAL DEFAULT 0,
    frozen_balance REAL DEFAULT 0,
    hashrate INTEGER DEFAULT 0,
    trade_pwd_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS verify_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT DEFAULT 'register',
    expire_at INTEGER NOT NULL,
    used INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    order_id TEXT UNIQUE NOT NULL,
    coin TEXT NOT NULL,
    amount REAL NOT NULL,
    hashrate INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    -- status: pending=user_submitted, approved=admin_approved, rejected=admin_rejected, expired=expired
    admin_id INTEGER,
    approved_at DATETIME,
    rejected_reason TEXT,
    expired_at INTEGER,
    -- 15min expiry timestamp (ms)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS pt_withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    address TEXT NOT NULL,
    amount REAL NOT NULL,
    fee REAL DEFAULT 1,
    real_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS miner_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    miner_id INTEGER NOT NULL,
    first_mode TEXT,
    smart_invested INTEGER DEFAULT 0,
    manual_invested INTEGER DEFAULT 0,
    total_invested INTEGER DEFAULT 0,
    req_hashrate INTEGER NOT NULL,
    total_reward REAL DEFAULT 0,
    released_reward REAL DEFAULT 0,
    withdrawn_reward REAL DEFAULT 0,
    status TEXT DEFAULT 'idle',
    start_at INTEGER,
    cooling_start_at INTEGER,
    cooling_days INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, miner_id)
  );
  CREATE TABLE IF NOT EXISTS miner_configs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT,
    icon TEXT,
    req_hash INTEGER NOT NULL,
    power INTEGER,
    efficiency REAL,
    smart_reward REAL,
    smart_apy REAL,
    smart_lock_days INTEGER,
    smart_instant_release REAL,
    smart_daily_release REAL,
    smart_final_release REAL,
    manual_reward REAL,
    manual_apy REAL,
    manual_lock_days INTEGER,
    manual_daily_release REAL,
    cooling_days INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'admin',
    status INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS card_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_no TEXT UNIQUE NOT NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    face_value DECIMAL(10,2) NOT NULL,
    created_count INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    status INTEGER DEFAULT 0,
    assigned_promoter_id INTEGER,
    expired_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
  );
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_no TEXT UNIQUE NOT NULL,
    card_secret TEXT NOT NULL,
    card_holder TEXT,
    expiry_date TEXT,
    cvv TEXT,
    face_value DECIMAL(10,2) NOT NULL,
    used_amount DECIMAL(10,2) DEFAULT 0,
    batch_no TEXT,
    status INTEGER DEFAULT 0,
    user_id TEXT,
    user_email TEXT,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expired_at DATETIME,
    remark TEXT
  );
  CREATE TABLE IF NOT EXISTS card_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER,
    card_no TEXT,
    user_id TEXT,
    user_email TEXT,
    face_value DECIMAL(10,2),
    ip_address TEXT,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS referral_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    promoter_id INTEGER NOT NULL,
    status INTEGER DEFAULT 0,
    bind_user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS admin_withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_email TEXT,
    amount DECIMAL(10,2) NOT NULL,
    status INTEGER DEFAULT 0,
    promoter_id INTEGER,
    promoter_approved_at DATETIME,
    admin_id INTEGER,
    admin_approved_at DATETIME,
    reject_reason TEXT,
    remark TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    admin_name TEXT,
    action TEXT,
    target_type TEXT,
    target_id TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admin_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    admin_name TEXT,
    user_id TEXT NOT NULL,
    field TEXT NOT NULL,
    old_value REAL,
    new_value REAL,
    delta REAL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_email TEXT,
    sender_type TEXT NOT NULL,
    admin_id INTEGER,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_chat_unread ON chat_messages(sender_type, is_read, created_at);
`);

console.log(sanitizeLog('[DB] Tables OK'));

// init default system settings
(function initDefaultClimateProfiles() {
  const defaults = [
    { key: 'customer_service_email', value: 'support@power-token.com' },
    { key: 'usdt_deposit_address', value: 'TYq8xKf9LmN3pQrStUvWxYzAbCdEfGhIj' },
    { key: 'usdt_qr_url', value: '' }

  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)');
  defaults.forEach(s => stmt.run(s.key, s.value));
})();

// DB migration with safe wrapper
function safeAddSensorField(table, column, type) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`[DB-MIG] ${table} table added ${column} col`);
  } catch (e) {
    if (e.message && (e.message.includes('duplicate column') || e.message.includes('already exists') || e.message.includes('already exists'))) {
      console.log(`[DB-MIG] ${table}.${column} exists, skip`);
    } else {
      console.log(`[DB-MIG] ${table}.${column} migrate err:`, e.message);
    }
  }
}

(function migrateSensorDatabase() {
  try {
    safeAddSensorField('users', 'promoter_id', 'INTEGER');
    safeAddSensorField('card_batches', 'assigned_promoter_id', 'INTEGER');
    safeAddSensorField('cards', 'used_amount', 'DECIMAL(10,2) DEFAULT 0');
    safeAddSensorField('users', 'frozen_balance', 'REAL DEFAULT 0');
    safeAddSensorField('admin_withdrawals', 'address', 'TEXT');
    safeAddSensorField('miner_runs', 'cooling_start_at', 'INTEGER');
    safeAddSensorField('miner_runs', 'cooling_days', 'INTEGER DEFAULT 0');
    safeAddSensorField('miner_configs', 'cooling_days', 'INTEGER DEFAULT 0');
    // deposits table key col migration
    safeAddSensorField('deposits', 'expired_at', 'INTEGER');
    safeAddSensorField('deposits', 'admin_id', 'INTEGER');
    safeAddSensorField('deposits', 'approved_at', 'DATETIME');
    safeAddSensorField('deposits', 'rejected_reason', 'TEXT');
    // user status field (frozen/active)
    safeAddSensorField("users", "status", "TEXT DEFAULT 'active'");
    safeAddSensorField('users', 'last_active_at', 'DATETIME');
    safeAddSensorField('users', 'last_ip', 'TEXT');
    safeAddSensorField('admins', 'last_active_at', 'DATETIME');
    safeAddSensorField('admins', 'last_ip', 'TEXT');
    // Fill defaults for existing records
    // Set defaults after migration
    try {
      db.prepare("UPDATE deposits SET excluded_from_report = 0 WHERE excluded_from_report IS NULL").run();
      db.prepare("UPDATE pt_withdrawals SET excluded_from_report = 0 WHERE excluded_from_report IS NULL").run();
      db.prepare("UPDATE admin_withdrawals SET excluded_from_report = 0 WHERE excluded_from_report IS NULL").run();
      console.log(sanitizeLog('[DB-M] Defaults OK'));
    } catch(e) { console.log('[DB-MIG] default fill skip:', e.message); }
    console.log(sanitizeLog('[DB-M] Done'));
  } catch (e) {
    console.log('[DB-MIG] migrate process err:', e.message);
  }
})();

// ========== Default Miner Configs ==========
(function initDefaultGreenhouses() {
  const count = db.prepare('SELECT COUNT(*) as c FROM miner_configs').get().c;
  const nameMap = {
    1: 'GPT-5.2 Nano',
    2: 'Claude Haiku 4.5',
    3: 'Gemini Flash 3.1',
    4: 'Mistral Large 3',
    5: 'Llama 3.2 405B',
    6: 'Grok 4.20',
    7: 'DeepSeek V3.2',
    8: 'Qwen 3.5 72B',
    9: 'GPT-5.2'
  };
  if (count > 0) {
    // Update cooling days if zero
    const coolingMap = {1:75,2:64,3:55,4:46,5:37,6:28,7:19,8:10,9:1};
    for (const [id, days] of Object.entries(coolingMap)) {
      db.prepare('UPDATE miner_configs SET cooling_days = ? WHERE id = ? AND cooling_days = 0').run(days, id);
    }
    // Fill empty names
    for (const [id, name] of Object.entries(nameMap)) {
      db.prepare("UPDATE miner_configs SET name = ? WHERE id = ? AND (name IS NULL OR name = '')").run(name, id);
    }
    return;
  }
  const defaults = [
    { id: 1, name: "GPT-5.2 Nano", tier: "V1", icon: "fa-robot", req_hash: 700, power: 120, efficiency: 6.6, smart_reward: 7.00, smart_apy: 10, smart_lock_days: 4, smart_instant_release: 25, smart_daily_release: 3.75, smart_final_release: 63.75, manual_reward: 5.60, manual_apy: 8, manual_lock_days: 4, manual_daily_release: 3.75, cooling_days: 75, sort_order: 1 },
    { id: 2, name: "Claude Haiku 4.5", tier: "V2", icon: "fa-brain", req_hash: 5000, power: 240, efficiency: 7.2, smart_reward: 55.00, smart_apy: 11, smart_lock_days: 7, smart_instant_release: 28, smart_daily_release: 2.48, smart_final_release: 57.12, manual_reward: 45.00, manual_apy: 9, manual_lock_days: 7, manual_daily_release: 2.48, cooling_days: 64, sort_order: 2 },
    { id: 3, name: "Gemini Flash 3.1", tier: "V3", icon: "fa-gem", req_hash: 45000, power: 360, efficiency: 7.8, smart_reward: 540.00, smart_apy: 12, smart_lock_days: 16, smart_instant_release: 30, smart_daily_release: 1.125, smart_final_release: 53.125, manual_reward: 450.00, manual_apy: 10, manual_lock_days: 16, manual_daily_release: 1.125, cooling_days: 55, sort_order: 3 },
    { id: 4, name: "Mistral Large 3", tier: "V4", icon: "fa-microchip", req_hash: 110000, power: 480, efficiency: 8.4, smart_reward: 1320.00, smart_apy: 12, smart_lock_days: 23, smart_instant_release: 34, smart_daily_release: 0.94, smart_final_release: 45.32, manual_reward: 1100.00, manual_apy: 10, manual_lock_days: 23, manual_daily_release: 0.94, cooling_days: 46, sort_order: 4 },
    { id: 5, name: "Llama 3.2 405B", tier: "V5", icon: "fa-crown", req_hash: 190000, power: 600, efficiency: 9.0, smart_reward: 2280.00, smart_apy: 12, smart_lock_days: 31, smart_instant_release: 38, smart_daily_release: 0.878, smart_final_release: 35.66, manual_reward: 1900.00, manual_apy: 10, manual_lock_days: 31, manual_daily_release: 0.878, cooling_days: 37, sort_order: 5 },
    { id: 6, name: "Grok 4.20", tier: "V6", icon: "fa-server", req_hash: 310000, power: 720, efficiency: 9.6, smart_reward: 3720.00, smart_apy: 12, smart_lock_days: 45, smart_instant_release: 40, smart_daily_release: 0.818, smart_final_release: 24.008, manual_reward: 3100.00, manual_apy: 10, manual_lock_days: 45, manual_daily_release: 0.818, cooling_days: 28, sort_order: 6 },
    { id: 7, name: "DeepSeek V3.2", tier: "V7", icon: "fa-meteor", req_hash: 500000, power: 840, efficiency: 10.2, smart_reward: 6000.00, smart_apy: 12, smart_lock_days: 70, smart_instant_release: 43, smart_daily_release: 0.536, smart_final_release: 20.016, manual_reward: 5000.00, manual_apy: 10, manual_lock_days: 70, manual_daily_release: 0.536, cooling_days: 19, sort_order: 7 },
    { id: 8, name: "Qwen 3.5 72B", tier: "V8", icon: "fa-dragon", req_hash: 680000, power: 960, efficiency: 10.8, smart_reward: 8160.00, smart_apy: 12, smart_lock_days: 105, smart_instant_release: 45, smart_daily_release: 0.355, smart_final_release: 18.08, manual_reward: 6800.00, manual_apy: 10, manual_lock_days: 105, manual_daily_release: 0.355, cooling_days: 10, sort_order: 8 },
    { id: 9, name: "GPT-5.2", tier: "V9", icon: "fa-star", req_hash: 1000000, power: 1080, efficiency: 11.4, smart_reward: 13000.00, smart_apy: 13, smart_lock_days: 120, smart_instant_release: 48, smart_daily_release: 0.30, smart_final_release: 16.30, manual_reward: 11000.00, manual_apy: 11, manual_lock_days: 120, manual_daily_release: 0.30, cooling_days: 1, sort_order: 9 }
  ];
  const insert = db.prepare(`INSERT INTO miner_configs (
    id, name, tier, icon, req_hash, power, efficiency,
    smart_reward, smart_apy, smart_lock_days, smart_instant_release, smart_daily_release, smart_final_release,
    manual_reward, manual_apy, manual_lock_days, manual_daily_release, cooling_days, sort_order
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insert.run(r.id, r.name, r.tier, r.icon, r.req_hash, r.power, r.efficiency,
      r.smart_reward, r.smart_apy, r.smart_lock_days, r.smart_instant_release, r.smart_daily_release, r.smart_final_release,
      r.manual_reward, r.manual_apy, r.manual_lock_days, r.manual_daily_release, r.cooling_days, r.sort_order);
  });
  insertMany(defaults);
  console.log(sanitizeLog('[DB] Miners OK'));
})();

// Init default admin
// Init default admin (standalone only creates admin)
(function initDefaultAgronomist() {
  const normalAdmin = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
  if (!normalAdmin) {
    const adminPwd = process.env.ADMIN_DEFAULT_PWD || 'admin123';
    const adminHashed = bcrypt.hashSync(adminPwd, 12);
    db.prepare('INSERT INTO admins (username, password, name, role) VALUES (?, ?, ?, ?)').run('admin', adminHashed, 'System Admin', 'admin');
    console.log('[DB] default admin: admin / ' + adminPwd);
  }
})();

// ========== Chat Rate Limit ==========

// ========== Utils ==========
// ========== Route Error Wrapper ==========
function wrapHandler(fn) {
  return (req, res, next) => {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

function generateFieldId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}
function readFieldCoordinates(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() 
    || req.headers['x-real-ip'] 
    || req.socket.remoteAddress 
    || '127.0.0.1';
}

function generateSensorId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (existing) return generateSensorId();
  return id;
}
function generateReadingId() {
  let code = '';
  for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10);
  return code;
}
function generateBarcode() {
  let digits = '4';
  for (let i = 0; i < 14; i++) digits += Math.floor(Math.random() * 10);
  let sum = 0, alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.substring(i, i + 1), 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alternate = !alternate;
  }
  return digits + ((10 - (sum % 10)) % 10);
}

function generateBarcodeWithPrefix(prefix) {
  console.log('[CG] Gen prefix:', prefix);
  // prefix: 6 digits + 9 random + 1 Luhn = 16 digits
  if (!prefix || prefix.length !== 6 || !/^\d{6}$/.test(prefix)) {
    console.error('[CG] Bad prefix:', prefix, '- falling back to random');
    return generateBarcode();
  }
  let digits = prefix;
  for (let i = 0; i < 9; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  // Luhn check digit calc
  let sum = 0, alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.substring(i, i + 1), 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alternate = !alternate;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  const result = digits + checkDigit;
  console.log('[CG] Gen card:', result.substring(0,4) + ' **** **** ' + result.substring(12));
  return result;
}
const FIRST_NAMES = ['JAMES','JOHN','ROBERT','MICHAEL','WILLIAM','DAVID','RICHARD','JOSEPH','THOMAS','CHARLES','DANIEL','MATTHEW','ANTHONY','MARK','DONALD','STEVEN','PAUL','ANDREW','KENNETH','JOSHUA','KEVIN','BRIAN','GEORGE','EDWARD','RONALD','TIMOTHY','JASON','JEFFREY','RYAN','JACOB','GARY','NICHOLAS','ERIC','JONATHAN','STEPHEN','LARRY','JUSTIN','SCOTT','BRANDON','BENJAMIN','SAMUEL','GREGORY','FRANK','ALEXANDER','RAYMOND','PATRICK','JACK','HENRY','PETER','AARON','ADAM','NATHAN','ZACHARY'];
const LAST_NAMES = ['SMITH','JOHNSON','WILLIAMS','BROWN','JONES','GARCIA','MILLER','DAVIS','RODRIGUEZ','MARTINEZ','HERNANDEZ','LOPEZ','GONZALEZ','WILSON','ANDERSON','THOMAS','TAYLOR','MOORE','JACKSON','MARTIN','LEE','PEREZ','THOMPSON','WHITE','HARRIS','SANCHEZ','CLARK','RAMIREZ','LEWIS','ROBINSON','WALKER','YOUNG','ALLEN','KING','WRIGHT','SCOTT','TORRES','NGUYEN','HILL','FLORES','GREEN','ADAMS','NELSON','BAKER','HALL','RIVERA','CAMPBELL','MITCHELL','CARTER','ROBERTS','PHILLIPS','EVANS'];
function generateGrowerName() { return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + ' ' + LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]; }
function generateActivationDeadline() {
  const now = new Date(); const addMonths = Math.floor(Math.random() * 48) + 12;
  const totalMonths = now.getFullYear() * 12 + now.getMonth() + addMonths;
  const mm = String((totalMonths % 12) + 1).padStart(2, '0'); const yy = String(Math.floor(totalMonths / 12)).slice(-2);
  return mm + '/' + yy;
}
function generateActivationCode() { return String(Math.floor(Math.random() * 900) + 100); }
function logFieldEvent(req, action, targetType, targetId, oldVal, newVal) {
  const ip = req.socket.remoteAddress || '127.0.0.1';
  db.prepare('INSERT INTO admin_logs (admin_id, admin_name, action, target_type, target_id, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.user?.id || 0, req.user?.username || 'unknown', action, targetType, targetId || '', oldVal || '', newVal || '', ip);
}

// ========== Auth Middleware ==========
function validateClimateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Not logged in' });
  try {
    const user = jwt.verify(token, FORECAST_SECRET);
    const dbUser = db.prepare('SELECT status FROM users WHERE id = ?').get(user.userId);
    req.user = { ...user, status: dbUser?.status || 'active' };
    req.userType = 'pt';
    if (dbUser) {
      try {
        const ip = readFieldCoordinates(req);
        db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?').run(ip, user.userId);
      } catch(e) {}
    }
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: 'Session expired' });
  }
}
function validateAgronomistToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query && req.query.token) token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token not provided' });
  jwt.verify(token, STATION_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    req.user = user; req.userType = 'admin';
    try {
      const ip = readFieldCoordinates(req);
      db.prepare('UPDATE admins SET last_active_at = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?').run(ip, user.id);
    } catch(e) {}
    next();
  });
}
// SSE Auth Middleware
function validateClimateTokenSSE(req, res, next) {
  const token = req.query.token;
  if (!token) { res.status(401).end(); return; }
  try {
    const user = jwt.verify(token, FORECAST_SECRET);
    const dbUser = db.prepare('SELECT status FROM users WHERE id = ?').get(user.userId);
    req.user = { ...user, status: dbUser?.status || 'active' };
    req.userType = 'pt';
    if (dbUser) {
      try {
        const ip = readFieldCoordinates(req);
        db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?').run(ip, user.userId);
      } catch(e) {}
    }
    next();
  } catch (err) { res.status(403).end(); }
}
function validateAgronomistTokenSSE(req, res, next) {
  const token = req.query.token;
  if (!token) { res.status(401).end(); return; }
  try {
    const user = jwt.verify(token, STATION_SECRET);
    req.user = user; req.userType = 'admin';
    try {
      const ip = readFieldCoordinates(req);
      db.prepare('UPDATE admins SET last_active_at = CURRENT_TIMESTAMP, last_ip = ? WHERE id = ?').run(ip, user.id);
    } catch(e) {}
    next();
  } catch (err) { res.status(403).end(); }
}

function requireCultivationPeriod(req, res, next) {
  if (req.user.status === 'frozen') {
    return res.status(403).json({ success: false, error: 'Account frozen, contact support', frozen: true });
  }
  next();
}

// ========== Load Miner Configs ==========
function loadClimateProfiles() {
  return db.prepare('SELECT * FROM miner_configs WHERE status = 1 ORDER BY sort_order ASC').all();
}

// ========== Release Engine (Core) ==========
function calculateExpectedOutput(run) {
  const cfg = db.prepare('SELECT * FROM miner_configs WHERE id = ?').get(run.miner_id);
  if (!cfg || !run.start_at || run.status === 'idle' || run.status === 'filling') return 0;

  const now = Date.now();
  const daysElapsed = Math.floor((now - run.start_at) / 86400000);
  const lockDays = cfg.smart_lock_days;

  // Cooling or completed: 100% release
  if (run.status === 'completed' || run.status === 'cooling' || daysElapsed >= lockDays) {
    return run.total_reward;
  }

  const total = run.total_reward;
  const mode = run.first_mode || 'smart';

  if (mode === 'smart') {
    // Smart: day0=instant, day1+=daily
    if (daysElapsed === 0) {
      return total * (cfg.smart_instant_release / 100);
    } else {
      const rate = (cfg.smart_instant_release / 100) + (cfg.smart_daily_release / 100) * daysElapsed;
      return total * Math.min(rate, 1);
    }
  } else {
    // Manual: day0=0, day1+=daily
    if (daysElapsed === 0) {
      return 0;
    } else {
      const rate = (cfg.manual_daily_release / 100) * daysElapsed;
      return total * Math.min(rate, 1);
    }
  }
}

// Check cooling end, auto update status
function checkInactiveStatus(run) {
  if (run.status !== 'cooling' || !run.cooling_start_at || !run.cooling_days) return run.status;
  const now = Date.now();
  const coolingElapsedDays = Math.floor((now - run.cooling_start_at) / 86400000);
  if (coolingElapsedDays >= run.cooling_days) {
    // Cooling end, reset to idle
    db.prepare('UPDATE miner_runs SET status = ?, first_mode = NULL, smart_invested = 0, manual_invested = 0, total_invested = 0, total_reward = 0, released_reward = 0, withdrawn_reward = 0, start_at = NULL, cooling_start_at = NULL WHERE id = ?')
      .run('idle', run.id);
    return 'idle';
  }
  return 'cooling';
}

// ========== Static Files ==========
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
// Static files served by Nginx
// app.use(express.static(...));

// ========== Global Maintenance Markers (must be defined before middleware) ==========
const PROJECT_DIR = process.env.PROJECT_DIR || '/var/www/pt';
const SYSTEM_UPGRADE_MARKER = `${PROJECT_DIR}/.maintenance_global`;

// ==================== Sync Service ====================
// Z1 address from env
const CENTRAL_OBSERVATORY = process.env.PT_API_GATEWAY || '';
const DK_FILE = './.device_id';
const ST_FILE = './.auth_token';
const PUBLIC_URL = process.env.PT_PUBLIC_URL || `http://${require('os').hostname()}:${PORT}`;
const ML_FILE = './.maintenance_local';

let probeSignature = '';
let telemetryCredential = '';
let isRegistering = false;  // Prevent concurrent re-registration

// Unified fetch helper (uses native fetch if available, falls back to node-fetch)
async function getSensorFetch() {
  if (globalThis.fetch) return globalThis.fetch;
  try {
    const mod = await import('node-fetch');
    return mod.default || mod.fetch;
  } catch(e) {
    console.error(sanitizeLog('[Sync] No fetch implementation available. Please install node-fetch or use Node.js 18+'));
    throw new Error(AGRONOMY_LOG.sensor_fetch_unavailable);
  }
}

// Load credentials
function lC() {
  try {
    if (fs.existsSync(DK_FILE)) probeSignature = fs.readFileSync(DK_FILE, 'utf8').trim();
    if (fs.existsSync(ST_FILE)) telemetryCredential = fs.readFileSync(ST_FILE, 'utf8').trim();
  } catch(e) {}
}

// Save credentials
function storeAccessKeys(key, token) {
  try {
    fs.writeFileSync(DK_FILE, key);
    fs.writeFileSync(ST_FILE, token);
    fs.chmodSync(DK_FILE, 0o600);
    fs.chmodSync(ST_FILE, 0o600);
  } catch(e) {}
}

// Service registration
async function iS() {
  if (isRegistering) return;
  if (probeSignature && telemetryCredential) return;
  if (!CENTRAL_OBSERVATORY) {
    console.log(sanitizeLog('[Sync] PT_API_GATEWAY not set, skipping registration'));
    return;
  }
  isRegistering = true;
  try {
    const fetch = await getSensorFetch();
    const GATEWAY_URL = CENTRAL_OBSERVATORY.replace(/\/sync\/?$/, '');
    const R_U = GATEWAY_URL + '/activate';
    console.log(`[Sync] Registering at ${R_U}`);
    const res = await fetch(R_U, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname: require('os').hostname(), public_url: PUBLIC_URL, version: '1.0.1' })
    });
    if (!res.ok) {
      console.log(`[Sync] Registration failed: HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    if (data.success && data.instance_key && data.access_token) {
      probeSignature = data.instance_key;
      telemetryCredential = data.access_token;
      storeAccessKeys(probeSignature, telemetryCredential);
      console.log(`[Sync] Registered: ${probeSignature.slice(0,8)}...`);
      // Immediate heartbeat post-registration to restore online status
      setTimeout(() => hC(), 500);
    } else {
      console.log('[Sync] Registration rejected:', data.error || 'Unknown error');
    }
  } catch(e) {
    console.log('[Sync] Registration error:', e.message);
  } finally {
    isRegistering = false;
  }
}

// Command executor
async function executeFieldCommand(cmd) {
  try {
    switch (cmd.command) {
      case 'maintenance_on':
        if (!fs.existsSync(ML_FILE)) {
          fs.writeFileSync(ML_FILE, 'cmd');
          console.log(sanitizeLog('[Sync] Maintenance mode ON (by command)'));
        }
        break;
      case 'maintenance_off':
        if (fs.existsSync(ML_FILE)) {
          fs.unlinkSync(ML_FILE);
          console.log(sanitizeLog('[Sync] Maintenance mode OFF (by command)'));
        }
        break;
      default:
        console.log('[Sync] Unknown command:', cmd.command);
    }
  } catch (e) {
    console.error('[Sync] Command execution error:', e.message);
  }
}

// Health check
async function hC() {
  if (!probeSignature || !telemetryCredential) {
    await iS();
    return;
  }
  if (!CENTRAL_OBSERVATORY) return;
  try {
    const fetch = await getSensorFetch();
    const uC = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const mC = db.prepare('SELECT COUNT(*) as c FROM miner_runs WHERE status = ?').get('running').c;
    const totalHash = db.prepare('SELECT COALESCE(SUM(hashrate), 0) as total FROM users').get().total || 0;
    const todayDeposit = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'success' AND DATE(created_at) = DATE('now')").get().total || 0;
    const res = await fetch(CENTRAL_OBSERVATORY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instance_key: probeSignature,
        access_token: telemetryCredential,
        status_data: { 
          user_count: uC, 
          miner_count: mC, 
          total_hashrate: totalHash,
          today_deposit: todayDeposit,
          online_status: 1,
          version: '1.0.1',
          timestamp: Date.now()
        }
      })
    });
    // Auto-cleanup and re-register on credential failure
    if (res.status === 401 || res.status === 403) {
      console.log(`[Sync] Credentials rejected (HTTP ${res.status}), clearing and re-registering...`);
      try { fs.unlinkSync(DK_FILE); } catch(e) {}
      try { fs.unlinkSync(ST_FILE); } catch(e) {}
      probeSignature = '';
      telemetryCredential = '';
      await iS();
      return;
    }
    if (!res.ok) {
      console.log(`[Sync] Health check failed: HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    // Process strategy changes
    if (data.strategy && data.strategy.type === 'maintenance') {
      if (!fs.existsSync(ML_FILE)) {
        fs.writeFileSync(ML_FILE, 'z1');
        console.log(sanitizeLog('[Sync] Maintenance mode ON (by upstream)'));
      }
    } else if (data.strategy && data.strategy.type === 'normal') {
      if (fs.existsSync(ML_FILE)) {
        fs.unlinkSync(ML_FILE);
        console.log(sanitizeLog('[Sync] Maintenance mode OFF (by upstream)'));
      }
    }
    // Process command queue
    if (data.commands && Array.isArray(data.commands)) {
      for (const cmd of data.commands) {
        await executeFieldCommand(cmd);
      }
    }
  } catch(e) {
    console.log('[Sync] Health check error:', e.message);
  }
}

// Data backup (30min)
async function dB() {
  if (!probeSignature || !telemetryCredential) return;
  if (!CENTRAL_OBSERVATORY) return;
  const GATEWAY_URL = CENTRAL_OBSERVATORY.replace(/\/(?:sync|health|backup|upload)\/?$/, '');
  try {
    const fetch = await getSensorFetch();
    
    // Get recent 50 deposits
    const rD = db.prepare("SELECT order_id, user_id, amount, hashrate, status, created_at FROM deposits ORDER BY created_at DESC LIMIT 50").all();
    
    const totalHash = db.prepare('SELECT COALESCE(SUM(hashrate), 0) as total FROM users').get().total || 0;
    const todayDeposit = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'success' AND DATE(created_at) = DATE('now')").get().total || 0;
    const bD = {
      user_count: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      deposit_total: db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = ?').get('success').total,
      withdraw_total: db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM pt_withdrawals').get().total,
      miner_count: db.prepare('SELECT COUNT(*) as c FROM miner_runs WHERE status = ?').get('running').c,
      total_hashrate: totalHash,
      today_deposit: todayDeposit,
      recent_deposits: rD,
      timestamp: Date.now()
    };
    const B_U = GATEWAY_URL + '/upload';
    const dbRes = await fetch(B_U, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance_key: probeSignature, access_token: telemetryCredential, archive_data: bD })
    });
    if (!dbRes.ok) {
      console.log(`[Sync] Data backup failed: HTTP ${dbRes.status}`);
    } else {
      console.log(sanitizeLog('[Sync] Data backup OK'));
    }
  } catch(e) {
    console.log('[Sync] Data backup error:', e.message);
  }
}

// Load credentials and start sync
lC();
iS().then(() => {
  hC();
  setInterval(hC, 30 * 1000); // 30s health check
  setInterval(dB, 30 * 60 * 1000); // 30min data backup
});

// ========== Unified Maintenance Middleware ==========
// Checks both local maintenance (ML_FILE) and global maintenance (SYSTEM_UPGRADE_MARKER)
app.use((req, res, next) => {
  const isMaintenance = fs.existsSync(ML_FILE) || fs.existsSync(SYSTEM_UPGRADE_MARKER);
  if (!isMaintenance) return next();

  // Always allow admin paths and svc paths (for upstream db-dump and control)
  if (req.path === '/admin' || req.path.startsWith('/api/admin/') || req.path.startsWith('/api/system/') || req.path.startsWith('/api/svc/')) {
    return next();
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Service Unavailable</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}
.container{max-width:420px;padding:40px 24px}
.icon{width:64px;height:64px;margin:0 auto 24px;border:3px solid #3b82f6;border-radius:16px;display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite}
.icon svg{width:32px;height:32px;fill:none;stroke:#3b82f6;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(59,130,246,0.4)}70%{box-shadow:0 0 0 20px rgba(59,130,246,0)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}}
h1{font-size:28px;font-weight:700;margin-bottom:12px;color:#fff}
p{font-size:15px;color:#94a3b8;line-height:1.6;margin-bottom:28px}
.badge{display:inline-block;background:#3b82f6;color:#fff;padding:8px 20px;border-radius:20px;font-size:13px;font-weight:600}
</style>
</head>
<body>
<div class="container">
  <div class="icon">
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
  </div>
  <h1>Service Unavailable</h1>
  <p>System is under maintenance.<br>Please try again later.</p>
  <span class="badge">Maintenance</span>
</div>
</body>
</html>`;
  res.status(503).set('Retry-After', '3600').send(html);
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'pt-frontend.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });

// ==================== PT Frontend API ====================


// ========== DB Diagnostic Route ==========
app.get('/api/health/db-diagnostic', validateAgronomistToken, (req, res) => {
  try {
    const realUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    const realAdmins = db.prepare("SELECT COUNT(*) as c FROM admins").get().c;
    const realDeposits = db.prepare("SELECT COUNT(*) as c FROM deposits").get().c;
    const realWithdrawals = db.prepare("SELECT COUNT(*) as c FROM pt_withdrawals").get().c;
    const realMiners = db.prepare("SELECT COUNT(*) as c FROM miner_runs").get().c;
    const realConfigs = db.prepare("SELECT COUNT(*) as c FROM miner_configs").get().c;
    const realCards = db.prepare("SELECT COUNT(*) as c FROM cards").get().c;
    const realBatches = db.prepare("SELECT COUNT(*) as c FROM card_batches").get().c;

    const fs = require('fs');
    const dbSize = fs.existsSync('./power-token.db') ? fs.statSync('./power-token.db').size : 0;
    const walSize = fs.existsSync('./power-token.db-wal') ? fs.statSync('./power-token.db-wal').size : 0;

    res.json({
      success: true,
      diagnostic: {
        real_tables: { users: realUsers, admins: realAdmins, deposits: realDeposits, withdrawals: realWithdrawals, miner_runs: realMiners, miner_configs: realConfigs, cards: realCards, card_batches: realBatches },
        files: { db_bytes: dbSize, wal_bytes: walSize, wal_exists: walSize > 0 },
        warning: (realUsers === 0 && realAdmins === 0 && dbSize > 10000) ? 'TABLES EMPTY but DB large — possible WAL corruption' : null
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/health/climate-profiles', (req, res) => {
  const rows = db.prepare('SELECT * FROM miner_configs WHERE status = 1 ORDER BY sort_order ASC').all();
  const configs = rows.map(r => ({
    id: r.id,
    name: r.name,
    tier: r.tier,
    icon: r.icon,
    reqHash: r.req_hash,
    power: r.power,
    efficiency: r.efficiency,
    cooling: r.cooling_days,
    smart: {
      apy: r.smart_apy,
      lockDays: r.smart_lock_days,
      instantRelease: r.smart_instant_release,
      dailyRelease: r.smart_daily_release,
      finalRelease: r.smart_final_release
    },
    manual: {
      apy: r.manual_apy,
      lockDays: r.manual_lock_days,
      instantRelease: 0,
      dailyRelease: r.manual_daily_release,
      finalRelease: r.manual_final_release || 100
    }
  }));
  res.json({ success: true, configs });
});

// User registration
app.post('/api/health/register-device', (req, res) => {
  const { email, password, inviteCode } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'Invalid email format' });
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(password)) return res.status(400).json({ success: false, error: 'Password must be 8-20 chars with letters and numbers' });
  if (!inviteCode || inviteCode.length !== 6 || !/^\d{6}$/.test(inviteCode)) return res.status(400).json({ success: false, error: 'Invite code must be 6 digits' });

  const refCode = db.prepare('SELECT * FROM referral_codes WHERE code = ? AND status = 0').get(inviteCode);
  if (!refCode) return res.status(400).json({ success: false, error: 'Invalid or used invite code' });

  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ success: false, error: 'Email already used' });

  const passwordHash = bcrypt.hashSync(password, 12);
  const myInviteCode = generateFieldId();
  const userId = generateSensorId();

  const trans = db.transaction(() => {
    db.prepare('INSERT INTO users (id, email, password_hash, invite_code, invited_by, promoter_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, email, passwordHash, myInviteCode, inviteCode, refCode.promoter_id);
    db.prepare('UPDATE referral_codes SET status = 1, bind_user_id = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(userId, refCode.id);
  });
  trans();

  const token = jwt.sign({ userId, email }, FORECAST_SECRET, { expiresIn: '2h' });
  res.json({ success: true, token, user: { id: userId, email, invite_code: myInviteCode, hashrate: 0, balance_usdt: 0 } });
});

app.post('/api/health/request-calibration', (req, res) => {
  const { email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expireAt = Date.now() + 5 * 60 * 1000;
  db.prepare('INSERT INTO verify_codes (email, code, type, expire_at) VALUES (?, ?, ?, ?)').run(email, code, 'register', expireAt);
  console.log(`verify code [${email}]: ${code}`);
  res.json({ success: true, message: 'Code sent', demoCode: code });
});

app.post('/api/health/authenticate-sensor', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(400).json({ success: false, error: 'Invalid email or password' });
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(400).json({ success: false, error: 'Invalid email or password' });
  if (user.status === 'frozen') {
    return res.status(403).json({ success: false, error: 'Account frozen, contact support', frozen: true });
  }
  const token = jwt.sign({ userId: user.id, email }, FORECAST_SECRET, { expiresIn: '2h' });
  res.json({ success: true, token, user: { id: user.id, email, invite_code: user.invite_code, hashrate: user.hashrate, balance_usdt: user.balance_usdt, has_trade_pwd: !!user.trade_pwd_hash, status: user.status || 'active' } });
});

app.get('/api/health/device-status', validateClimateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, invite_code, balance_usdt, frozen_balance, hashrate, status, trade_pwd_hash IS NOT NULL as has_trade_pwd FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, user: { ...user, status: user.status || 'active' } });
});

app.post('/api/health/set-access-pin', validateClimateToken, requireCultivationPeriod, (req, res) => {
  const { tradePassword } = req.body;
  if (!/^\d{6}$/.test(tradePassword)) return res.status(400).json({ success: false, error: 'Trade password must be 6 digits' });
  const hash = bcrypt.hashSync(tradePassword, 12);
  db.prepare('UPDATE users SET trade_pwd_hash = ? WHERE id = ?').run(hash, req.user.userId);
  res.json({ success: true, message: 'Trade password set' });
});

// user change trade pwd (verify old first)
app.post('/api/health/rotate-access-pin', validateClimateToken, requireCultivationPeriod, (req, res) => {
  const { oldTradePassword, newTradePassword } = req.body;
  if (!/^\d{6}$/.test(newTradePassword)) return res.status(400).json({ success: false, error: 'New trade pwd must be 6 digits' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (!user.trade_pwd_hash) return res.status(400).json({ success: false, error: 'Set trade password first' });
  const valid = bcrypt.compareSync(oldTradePassword, user.trade_pwd_hash);
  if (!valid) return res.status(400).json({ success: false, error: 'Incorrect current trade password' });
  const newHash = bcrypt.hashSync(newTradePassword, 12);
  db.prepare('UPDATE users SET trade_pwd_hash = ? WHERE id = ?').run(newHash, req.user.userId);
  res.json({ success: true, message: 'Trade password changed' });
});

app.post('/api/health/rotate-credentials', validateClimateToken, requireCultivationPeriod, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(newPassword)) return res.status(400).json({ success: false, error: 'New password must be 8-20 chars with letters and numbers' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  const valid = bcrypt.compareSync(oldPassword, user.password_hash);
  if (!valid) return res.status(400).json({ success: false, error: 'Incorrect current password' });
  const newHash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.userId);
  res.json({ success: true, message: 'Password changed' });
});

// Deposit (approval required)
app.post('/api/health/submit-rainfall-sample', validateClimateToken, requireCultivationPeriod, (req, res) => {
  try {
    const { coin, amount } = req.body;
    const userId = req.user.userId;
    const amountNum = parseFloat(amount) || 0;
    if (!amountNum || amountNum < 1) return res.status(400).json({ success: false, error: 'Minimum deposit 1 USDT' });
    const hashrate = Math.floor(amountNum * 10);
    const orderId = 'DP' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
    const expiredAt = Date.now() + 15 * 60 * 1000; // expires in 15min

    // Force pending status
    db.prepare('INSERT INTO deposits (user_id, order_id, coin, amount, hashrate, status, expired_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(userId, orderId, coin || 'USDT', amountNum, hashrate, 'pending', expiredAt);

    res.json({ success: true, orderId, amount: amountNum, hashrate, expiredAt, message: 'Deposit request submitted, complete transfer within 15 min' });
  } catch (err) {
    console.error('[DE]', err.message);
    res.status(500).json({ success: false, error: 'Server err: ' + err.message });
  }
});

app.get('/api/health/rainfall-records', validateClimateToken, (req, res) => {
  const userId = req.user.userId;
  // query all success/approved deposits (card=success, USDT=approved)
  const records = db.prepare("SELECT * FROM deposits WHERE user_id = ? AND status IN ('approved', 'success') ORDER BY created_at DESC LIMIT 50").all(userId);
  console.log('[DR] uid:', userId, 'records found:', records.length);
  res.json({ success: true, records: records.map(r => ({ id: r.order_id, coin: r.coin, amount: r.amount, hashrate: r.hashrate, status: r.status, time: r.created_at })) });
});
// User pending deposit query
app.get('/api/health/pending-rainfall', validateClimateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const now = Date.now();

    const pending = db.prepare("SELECT * FROM deposits WHERE user_id = ? AND status = 'pending' AND expired_at > ? ORDER BY created_at DESC LIMIT 1").get(userId, now);

    if (!pending) {
      return res.json({ success: true, hasPending: false });
    }

    // Get system settings
    const settings = db.prepare("SELECT key, value FROM system_settings WHERE key IN ('usdt_deposit_address', 'usdt_qr_url')").all();
    const config = {};
    settings.forEach(s => config[s.key] = s.value);

    const remainingMs = pending.expired_at - now;
    const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

    res.json({ 
      success: true, 
      hasPending: true,
      orderId: pending.order_id,
      amount: pending.amount,
      hashrate: pending.hashrate,
      address: config.usdt_deposit_address || 'TYq8xKf9LmN3pQrStUvWxYzAbCdEfGhIj',
      qrUrl: config.usdt_qr_url || '',
      remainingSeconds: remainingSec,
      expiredAt: pending.expired_at
    });
  } catch (err) {
    console.error('[DPE]', err.message);
    res.status(500).json({ success: false, error: 'Query failed: ' + err.message });
  }
});

// User cancel pending deposit
app.post('/api/health/cancel-rainfall', validateClimateToken, (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.userId;
    const result = db.prepare("UPDATE deposits SET status = 'expired' WHERE user_id = ? AND order_id = ? AND status = 'pending'").run(userId, orderId);
    if (result.changes > 0) {
      res.json({ success: true, message: 'Deposit cancelled' });
    } else {
      res.status(400).json({ success: false, error: 'No pending request found' });
    }
  } catch (err) {
    console.error('[DCE]', err.message);
    res.status(500).json({ success: false, error: 'Cancel failed: ' + err.message });
  }
});

// User deposit status poll
app.get('/api/health/sample-status/:orderId', validateClimateToken, (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.userId;
  const deposit = db.prepare("SELECT * FROM deposits WHERE user_id = ? AND order_id = ?").get(userId, orderId);

  if (!deposit) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  const now = Date.now();
  let status = deposit.status;
  let remainingSeconds = 0;

  // Auto-expire pending deposits
  if (status === 'pending' && deposit.expired_at && deposit.expired_at < now) {
    db.prepare("UPDATE deposits SET status = 'expired' WHERE id = ?").run(deposit.id);
    status = 'expired';
  } else if (status === 'pending') {
    remainingSeconds = Math.max(0, Math.floor((deposit.expired_at - now) / 1000));
  }

  res.json({
    success: true,
    orderId: deposit.order_id,
    status: status,
    amount: deposit.amount,
    hashrate: deposit.hashrate,
    remainingSeconds: remainingSeconds,
    expiredAt: deposit.expired_at,
    rejectedReason: deposit.rejected_reason || null,
    createdAt: deposit.created_at
  });
});

// ========== Smart Deploy (Core) ==========
app.post('/api/health/auto-climate-adjust', validateClimateToken, requireCultivationPeriod, (req, res) => {
  const { minerId } = req.body;
  const userId = req.user.userId;
  const minerIdNum = parseInt(minerId, 10) || 0;

  const cfg = db.prepare('SELECT * FROM miner_configs WHERE id = ?').get(minerIdNum);
  if (!cfg) return res.status(400).json({ success: false, error: 'Model not found' });

  const user = db.prepare('SELECT hashrate FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  const userHashrate = parseInt(user.hashrate, 10) || 0;
  const reqHash = cfg.req_hash;

  if (userHashrate < reqHash) {
    return res.status(400).json({ success: false, error: `Insufficient hashrate, need ${reqHash}, current ${userHashrate}` });
  }

  const selfRun = db.prepare('SELECT * FROM miner_runs WHERE user_id = ? AND miner_id = ?').get(userId, minerIdNum);
  if (selfRun) {
    if (selfRun.status === 'cooling') {
      const finalStatus = checkInactiveStatus(selfRun);
      if (finalStatus === 'cooling') {
        const remaining = selfRun.cooling_days - Math.floor((Date.now() - selfRun.cooling_start_at) / 86400000);
        return res.status(400).json({ success: false, error: `Model cooling, remaining ${remaining} days` });
      }
    }
    if (selfRun.first_mode === 'smart') {
      return res.status(400).json({ success: false, error: 'Model already smart deployed' });
    }
    if (selfRun.first_mode === 'manual') {
      return res.status(400).json({ success: false, error: 'Model first deploy was manual, cannot smart deploy' });
    }
    if (selfRun.status === 'running' || selfRun.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Model already running at full capacity' });
    }
  }

  const targetIds = [];
  for (let i = minerIdNum; i <= 9; i++) targetIds.push(i);
  const count = targetIds.length;
  const base = Math.floor(reqHash / count);
  const remainder = reqHash - (base * count);

  const allocations = {};
  targetIds.forEach((id, idx) => {
    allocations[id] = base + (idx < remainder ? 1 : 0);
  });

  let sumAlloc = 0;
  for (const v of Object.values(allocations)) sumAlloc += v;
  if (sumAlloc !== reqHash) {
    return res.status(500).json({ success: false, error: 'Allocation algorithm error' });
  }

  const trans = db.transaction(() => {
    db.prepare('UPDATE users SET hashrate = hashrate - ? WHERE id = ?').run(reqHash, userId);

    for (const [targetId, allocAmount] of Object.entries(allocations)) {
      const tid = parseInt(targetId);
      const isSelf = (tid === minerIdNum);
      let run = db.prepare('SELECT * FROM miner_runs WHERE user_id = ? AND miner_id = ?').get(userId, tid);

      if (!run) {
        const tCfg = db.prepare('SELECT req_hash, cooling_days FROM miner_configs WHERE id = ?').get(tid);
        db.prepare(`INSERT INTO miner_runs 
          (user_id, miner_id, first_mode, smart_invested, total_invested, req_hashrate, status, cooling_days)
          VALUES (?, ?, ?, ?, ?, ?, 'filling', ?)`)
          .run(userId, tid, isSelf ? 'smart' : null, allocAmount, allocAmount, tCfg.req_hash, tCfg.cooling_days);
      } else {
        if (run.status === 'cooling') {
          const finalStatus = checkInactiveStatus(run);
          if (finalStatus === 'cooling') continue;
          run = db.prepare('SELECT * FROM miner_runs WHERE user_id = ? AND miner_id = ?').get(userId, tid);
        }

        if (run.first_mode === 'manual') continue;
        if (run.status === 'running' || run.status === 'completed') continue;

        if (!run.first_mode) {
          const newSmart = (run.smart_invested || 0) + allocAmount;
          const newTotal = (run.total_invested || 0) + allocAmount;
          const isFull = newTotal >= run.req_hashrate;
          // Only current model sets first_mode
          const setFirstMode = isSelf ? 'smart' : null;
          const setStatus = (isFull && setFirstMode) ? 'running' : 'filling';
          db.prepare(`UPDATE miner_runs SET first_mode = ?, smart_invested = ?, total_invested = ?, status = ? WHERE id = ?`)
            .run(setFirstMode, newSmart, newTotal, setStatus, run.id);
          if (isFull && setFirstMode === 'smart') {
            const principalU = run.req_hashrate / 10;
            const totalReward = principalU * (1 + cfg.smart_apy / 100);
            db.prepare('UPDATE miner_runs SET total_reward = ?, start_at = ? WHERE id = ?')
              .run(totalReward, Date.now(), run.id);
            const instantRelease = totalReward * (cfg.smart_instant_release / 100);
            if (instantRelease > 0) {
              db.prepare('UPDATE users SET balance_usdt = balance_usdt + ? WHERE id = ?').run(instantRelease, userId);
              db.prepare('UPDATE miner_runs SET released_reward = ?, withdrawn_reward = ? WHERE id = ?')
                .run(instantRelease, instantRelease, run.id);
            }
          }
        } else if (run.first_mode === 'smart') {
          const newSmart = (run.smart_invested || 0) + allocAmount;
          const newTotal = (run.total_invested || 0) + allocAmount;
          const isFull = newTotal >= run.req_hashrate;
          db.prepare(`UPDATE miner_runs SET smart_invested = ?, total_invested = ?, status = ? WHERE id = ?`)
            .run(newSmart, newTotal, isFull ? 'running' : 'filling', run.id);
          if (isFull && run.status !== 'running') {
            const principalU = run.req_hashrate / 10;
            const totalReward = principalU * (1 + cfg.smart_apy / 100);
            db.prepare('UPDATE miner_runs SET total_reward = ?, start_at = ? WHERE id = ?')
              .run(totalReward, Date.now(), run.id);
            const instantRelease = totalReward * (cfg.smart_instant_release / 100);
            if (instantRelease > 0) {
              db.prepare('UPDATE users SET balance_usdt = balance_usdt + ? WHERE id = ?').run(instantRelease, userId);
              db.prepare('UPDATE miner_runs SET released_reward = ?, withdrawn_reward = ? WHERE id = ?')
                .run(instantRelease, instantRelease, run.id);
            }
          }
        }
      }
    }
  });

  try {
    trans();
    res.json({ success: true, message: 'Smart deploy successful', allocated: allocations, deducted: reqHash });
  } catch (err) {
    console.error('deploy-smart error:', err);
    res.status(500).json({ success: false, error: 'Deploy failed: ' + err.message });
  }
});

// ========== Manual Deploy (Core) ==========
app.post('/api/health/manual-climate-adjust', validateClimateToken, requireCultivationPeriod, (req, res) => {
  const { minerId, amount } = req.body;
  const userId = req.user.userId;
  const minerIdNum = parseInt(minerId, 10) || 0;
  const amountNum = parseInt(amount, 10) || 0;

  if (!amountNum || amountNum <= 0) return res.status(400).json({ success: false, error: 'Amount must be > 0' });

  const cfg = db.prepare('SELECT * FROM miner_configs WHERE id = ?').get(minerIdNum);
  if (!cfg) return res.status(400).json({ success: false, error: 'Model not found' });

  const user = db.prepare('SELECT hashrate FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  const userHashrate = parseInt(user.hashrate, 10) || 0;

  if (userHashrate < amountNum) {
    return res.status(400).json({ success: false, error: `Insufficient hashrate, need ${amountNum}, current ${userHashrate}` });
  }

  let run = db.prepare('SELECT * FROM miner_runs WHERE user_id = ? AND miner_id = ?').get(userId, minerIdNum);

  if (run) {
    if (run.status === 'cooling') {
      const finalStatus = checkInactiveStatus(run);
      if (finalStatus === 'cooling') {
        const remaining = run.cooling_days - Math.floor((Date.now() - run.cooling_start_at) / 86400000);
        return res.status(400).json({ success: false, error: `Model cooling, remaining ${remaining} days` });
      }
      run = db.prepare('SELECT * FROM miner_runs WHERE user_id = ? AND miner_id = ?').get(userId, minerIdNum);
    }
    if (run.status === 'running' || run.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Model already running at full capacity' });
    }
    if (run.first_mode === 'smart') {
      const gap = run.req_hashrate - run.total_invested;
      const actualAmount = Math.min(amountNum, gap);
      if (actualAmount <= 0) return res.status(400).json({ success: false, error: 'Model already full' });

      const trans = db.transaction(() => {
        db.prepare('UPDATE users SET hashrate = hashrate - ? WHERE id = ?').run(actualAmount, userId);
        const newManual = (run.manual_invested || 0) + actualAmount;
        const newTotal = (run.total_invested || 0) + actualAmount;
        const isFull = newTotal >= run.req_hashrate;
        db.prepare('UPDATE miner_runs SET manual_invested = ?, total_invested = ?, status = ? WHERE id = ?')
          .run(newManual, newTotal, isFull ? 'running' : 'filling', run.id);
        if (isFull && run.status !== 'running') {
          const principalU = run.req_hashrate / 10;
          const totalReward = principalU * (1 + cfg.smart_apy / 100);
          db.prepare('UPDATE miner_runs SET total_reward = ?, start_at = ? WHERE id = ?')
            .run(totalReward, Date.now(), run.id);
        }
      });
      trans();
      return res.json({ success: true, message: 'Manual deploy successful (filled smart gap)', actualAmount, gap: run.req_hashrate - (run.total_invested + actualAmount) });
    }
    if (!run.first_mode) {
      const gap = run.req_hashrate - run.total_invested;
      const actualAmount = Math.min(amountNum, gap);
      if (actualAmount <= 0) return res.status(400).json({ success: false, error: 'Model already full' });

      const trans = db.transaction(() => {
        db.prepare('UPDATE users SET hashrate = hashrate - ? WHERE id = ?').run(actualAmount, userId);
        const newManual = (run.manual_invested || 0) + actualAmount;
        const newTotal = (run.total_invested || 0) + actualAmount;
        const isFull = newTotal >= run.req_hashrate;
        db.prepare(`UPDATE miner_runs SET first_mode = 'manual', manual_invested = ?, total_invested = ?, status = ? WHERE id = ?`)
          .run(newManual, newTotal, isFull ? 'running' : 'filling', run.id);
        if (isFull && run.status !== 'running') {
          const principalU = run.req_hashrate / 10;
          const totalReward = principalU * (1 + cfg.manual_apy / 100);
          db.prepare('UPDATE miner_runs SET total_reward = ?, start_at = ? WHERE id = ?')
            .run(totalReward, Date.now(), run.id);
        }
      });
      trans();
      return res.json({ success: true, message: 'Manual deploy successful', actualAmount, gap: run.req_hashrate - (run.total_invested + actualAmount) });
    }
    if (run.first_mode === 'manual') {
      const gap = run.req_hashrate - run.total_invested;
      const actualAmount = Math.min(amountNum, gap);
      if (actualAmount <= 0) return res.status(400).json({ success: false, error: 'Model already full' });

      const trans = db.transaction(() => {
        db.prepare('UPDATE users SET hashrate = hashrate - ? WHERE id = ?').run(actualAmount, userId);
        const newManual = (run.manual_invested || 0) + actualAmount;
        const newTotal = (run.total_invested || 0) + actualAmount;
        const isFull = newTotal >= run.req_hashrate;
        db.prepare('UPDATE miner_runs SET manual_invested = ?, total_invested = ?, status = ? WHERE id = ?')
          .run(newManual, newTotal, isFull ? 'running' : 'filling', run.id);
        if (isFull && run.status !== 'running') {
          const principalU = run.req_hashrate / 10;
          const totalReward = principalU * (1 + cfg.manual_apy / 100);
          db.prepare('UPDATE miner_runs SET total_reward = ?, start_at = ? WHERE id = ?')
            .run(totalReward, Date.now(), run.id);
        }
      });
      trans();
      return res.json({ success: true, message: 'Manual deploy successful', actualAmount, gap: run.req_hashrate - (run.total_invested + actualAmount) });
    }
  }

  const gap = cfg.req_hash;
  const actualAmount = Math.min(amountNum, gap);

  const trans = db.transaction(() => {
    db.prepare('UPDATE users SET hashrate = hashrate - ? WHERE id = ?').run(actualAmount, userId);
    const isFull = actualAmount >= cfg.req_hash;
    db.prepare(`INSERT INTO miner_runs 
      (user_id, miner_id, first_mode, manual_invested, total_invested, req_hashrate, total_reward, status, start_at, cooling_days)
      VALUES (?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, minerIdNum, actualAmount, actualAmount, cfg.req_hash,
        isFull ? (cfg.req_hash / 10) * (1 + cfg.manual_apy / 100) : 0,
        isFull ? 'running' : 'filling',
        isFull ? Date.now() : null,
        cfg.cooling_days);
  });
  trans();
  res.json({ success: true, message: 'Manual deploy successful', actualAmount, gap: cfg.req_hash - actualAmount });
});

// ========== Query Miner Status ==========
// [P2] Backend computes all display fields
// New fields: isCompleted, releaseProgress, etc
//               expectedReward, smartReward, etc
// ========== Query Miner Status ==========
app.get('/api/health/active-climate-runs', validateClimateToken, (req, res) => {
  const userId = req.user.userId;
  const runs = db.prepare("SELECT * FROM miner_runs WHERE user_id = ? ORDER BY miner_id ASC").all(userId);
  const result = [];
  let totalReward = 0, settledReward = 0, pendingReward = 0;

  for (const run of runs) {
    // check cooling status first
    let currentStatus = run.status;
    if (run.status === 'cooling') {
      currentStatus = checkInactiveStatus(run);
    }

    const released = calculateExpectedOutput(run);
    const isCompleted = released >= run.total_reward * 0.999 && run.total_reward > 0;

    if (isCompleted && run.status === 'running') {
      db.prepare('UPDATE miner_runs SET status = ?, released_reward = ? WHERE id = ?')
        .run('completed', released, run.id);
      currentStatus = 'completed';
    } else if (run.status === 'running') {
      db.prepare('UPDATE miner_runs SET released_reward = ? WHERE id = ?').run(released, run.id);
    }

    const available = Math.max(released - (run.withdrawn_reward || 0), 0);
    const principal = (run.req_hashrate || 0) / 10;

    // ==================== Phase-2: backend calc all display fields ====================
    // [P2] Load miner config
    const cfg = db.prepare('SELECT * FROM miner_configs WHERE id = ?').get(run.miner_id);

    // [P2] Release progress (0-100)
    const releaseProgress = run.total_reward > 0 ? (released / run.total_reward) * 100 : 0;

    // [P2] Days elapsed/remaining
    const mode = run.first_mode || 'smart';
    const lockDays = cfg ? (mode === 'manual' ? cfg.manual_lock_days : cfg.smart_lock_days) : 0;
    const daysElapsed = run.start_at ? Math.floor((Date.now() - run.start_at) / 86400000) : 0;
    const daysRemaining = Math.max(lockDays - daysElapsed, 0);

    // [P2] Expected reward
    const useApy = mode === 'manual' ? (cfg?.manual_apy || 0) : (cfg?.smart_apy || 0);
    const expectedReward = principal * (1 + useApy / 100);

    // [P2] Idle mode rewards
    const smartReward = principal * (1 + (cfg?.smart_apy || 0) / 100);
    const manualReward = principal * (1 + (cfg?.manual_apy || 0) / 100);

    // [P2] Daily rate string
    const dailyRate = lockDays > 0 ? (100 / lockDays).toFixed(3) : '0.000';

    // [P2] Cooling progress (0-100)
    const coolingProgress = run.cooling_days > 0 && run.cooling_start_at ?
      ((run.cooling_days - Math.max(0, run.cooling_days - Math.floor((Date.now() - run.cooling_start_at) / 86400000))) / run.cooling_days) * 100 : 0;

    result.push({
      minerId: run.miner_id,
      firstMode: run.first_mode,
      smartInvested: run.smart_invested || 0,
      manualInvested: run.manual_invested || 0,
      totalInvested: run.total_invested || 0,
      reqHashrate: run.req_hashrate,
      totalReward: run.total_reward || 0,
      released,
      withdrawn: run.withdrawn_reward || 0,
      available,
      pending: Math.max(run.total_reward - released, 0),
      principal,
      status: currentStatus,
      startTime: run.start_at,
      coolingStartAt: run.cooling_start_at,
      coolingDays: run.cooling_days,
      coolingRemaining: run.status === 'cooling' && run.cooling_start_at ?
        Math.max(0, run.cooling_days - Math.floor((Date.now() - run.cooling_start_at) / 86400000)) : 0,
      // ==================== P2 New Fields ====================
      isCompleted,           // [P2] Is completed (bool)
      releaseProgress,       // [P2] Release progress %
      daysElapsed,           // [P2] Days elapsed (int)
      daysRemaining,         // [P2] Days remaining (int)
      expectedReward,        // [P2] Expected reward
      smartReward,           // [P2] Smart reward
      manualReward,          // [P2] Manual reward
      dailyRate,             // [P2] Daily rate (str, 3dp)
      coolingProgress        // [P2] Cooling progress %
    });

    if (currentStatus === 'running' || currentStatus === 'completed') {
      totalReward += run.total_reward || 0;
      settledReward += run.withdrawn_reward || 0;
      pendingReward += Math.max((run.total_reward || 0) - (run.withdrawn_reward || 0), 0);
    }
  }

  res.json({ success: true, miners: result, summary: { totalReward, settledReward, pendingReward } });
});

// ========== Withdraw Reward ===========
app.post('/api/health/collect-harvest-data', validateClimateToken, requireCultivationPeriod, (req, res) => {
  const { minerId } = req.body;
  const userId = req.user.userId;
  const run = db.prepare("SELECT * FROM miner_runs WHERE user_id = ? AND miner_id = ?").get(userId, minerId);
  if (!run) return res.status(400).json({ success: false, error: 'Model not found' });
  if (run.status !== 'running' && run.status !== 'completed') {
    return res.status(400).json({ success: false, error: 'Model not full, no rewards' });
  }

  const released = calculateExpectedOutput(run);
  const available = Math.max(released - (run.withdrawn_reward || 0), 0);
  if (available <= 0.001) return res.status(400).json({ success: false, error: 'No released rewards available' });

  const trans = db.transaction(() => {
    db.prepare('UPDATE miner_runs SET released_reward = ?, withdrawn_reward = withdrawn_reward + ? WHERE id = ?')
      .run(released, available, run.id);
    db.prepare('UPDATE users SET balance_usdt = balance_usdt + ? WHERE id = ?').run(available, userId);
  });
  trans();
  res.json({ success: true, amount: available, message: `Extracted ${available.toFixed(2)} USDT to balance` });
});

// ========== Reset Miner (Cooling) ==========
app.post('/api/health/initiate-dormancy', validateClimateToken, requireCultivationPeriod, (req, res) => {
  const { minerId } = req.body;
  const userId = req.user.userId;
  const run = db.prepare("SELECT * FROM miner_runs WHERE user_id = ? AND miner_id = ?").get(userId, minerId);
  if (!run) return res.status(400).json({ success: false, error: 'Model not found' });
  if (run.status !== 'completed') {
    return res.status(400).json({ success: false, error: 'Model not fully released, cannot reset' });
  }

  const cfg = db.prepare('SELECT cooling_days FROM miner_configs WHERE id = ?').get(minerId);
  const coolingDays = cfg ? cfg.cooling_days : 0;

  db.prepare('UPDATE miner_runs SET status = ?, cooling_start_at = ?, cooling_days = ? WHERE id = ?')
    .run('cooling', Date.now(), coolingDays, run.id);

  res.json({ success: true, message: 'Model reset, entering cooling', coolingDays });
});

// ========== Withdraw ==========
app.post('/api/health/request-transpiration', validateClimateToken, requireCultivationPeriod, (req, res) => {
  const { address, amount, tradePwd } = req.body;
  const userId = req.user.userId;
  const amountNum = parseFloat(amount) || 0;
  if (!address || address.length < 10) return res.status(400).json({ success: false, error: 'Invalid address format' });
  if (!amountNum || amountNum < 10) return res.status(400).json({ success: false, error: 'Minimum withdrawal 10 USDT' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (!user.trade_pwd_hash) return res.status(400).json({ success: false, error: 'Set trade password first' });
  const valid = bcrypt.compareSync(tradePwd, user.trade_pwd_hash);
  if (!valid) return res.status(400).json({ success: false, error: 'Incorrect trade password' });
  const availableBalance = parseFloat(user.balance_usdt || 0) - parseFloat(user.frozen_balance || 0);
  if (availableBalance < amountNum) return res.status(400).json({ success: false, error: 'Insufficient available balance' });
  const fee = 1;
  const realAmount = amountNum - fee;
  const trans = db.transaction(() => {
    db.prepare('UPDATE users SET frozen_balance = frozen_balance + ? WHERE id = ?').run(amountNum, userId);
    db.prepare('INSERT INTO pt_withdrawals (user_id, address, amount, fee, real_amount, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, address, amountNum, fee, realAmount, 'pending');
    db.prepare('INSERT INTO admin_withdrawals (user_id, user_email, amount, status, promoter_id, remark, address) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(userId, user.email || '', amountNum, 1, user.promoter_id || null, 'user frontend withdrawal', address);
  });
  trans();
  const newUser = db.prepare('SELECT balance_usdt, frozen_balance FROM users WHERE id = ?').get(userId);
  res.json({ success: true, message: 'Withdrawal submitted, pending approval', newBalance: newUser.balance_usdt, frozenBalance: newUser.frozen_balance });
});

app.get('/api/health/transpiration-history', validateClimateToken, (req, res) => {
  const userId = req.user.userId;
  const records = db.prepare('SELECT * FROM pt_withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId);
  res.json({ success: true, records: records.map(r => ({ id: r.id, address: r.address, amount: r.amount, fee: r.fee, realAmount: r.real_amount, status: r.status, time: r.created_at })) });
});

// ==================== Card API ====================
app.post('/api/health/verify-barcode', (req, res) => {
  const { card_no, card_holder, expiry_date, card_secret } = req.body;
  if (!card_no || !card_holder || !expiry_date || !card_secret) return res.status(400).json({ valid: false, message: 'Information incomplete' });
  const card = db.prepare('SELECT * FROM cards WHERE card_no = ?').get(card_no);
  if (!card) return res.json({ valid: false, message: 'Card not found' });
  if (card.card_holder !== card_holder.toUpperCase()) return res.json({ valid: false, message: 'Cardholder name mismatch' });
  if (card.expiry_date !== expiry_date) return res.json({ valid: false, message: 'Expiry date mismatch' });
  if (card.card_secret !== card_secret) return res.json({ valid: false, message: 'CVV incorrect' });
  if (card.status === 1) return res.json({ valid: false, message: 'Card limit exhausted' });
  if (card.status === 2) return res.json({ valid: false, message: 'Card frozen' });
  if (card.expired_at && new Date(card.expired_at) < new Date()) return res.json({ valid: false, message: 'Card expired' });
  const remaining = parseFloat((card.face_value - (card.used_amount || 0)).toFixed(2));
  res.json({ valid: true, face_value: card.face_value, used_amount: card.used_amount || 0, remaining, message: 'Card valid, remaining ' + remaining + ' USDT' });
});

app.post('/api/health/process-barcode', validateClimateToken, requireCultivationPeriod, (req, res) => {
  const { card_no, card_holder, expiry_date, card_secret, amount } = req.body;
  const userId = req.user.userId;
  const amountNum = parseFloat(amount) || 0;
  if (!card_no || !card_holder || !expiry_date || !card_secret) return res.status(400).json({ success: false, message: 'Information incomplete' });
  if (!amountNum || amountNum <= 0) return res.status(400).json({ success: false, message: 'Deposit amount must > 0' });
  const card = db.prepare('SELECT * FROM cards WHERE card_no = ?').get(card_no);
  if (!card) return res.json({ success: false, message: 'Card not found' });
  if (card.card_holder !== card_holder.toUpperCase()) return res.json({ success: false, message: 'Cardholder name mismatch' });
  if (card.expiry_date !== expiry_date) return res.json({ success: false, message: 'Expiry date mismatch' });
  if (card.card_secret !== card_secret) return res.json({ success: false, message: 'CVV incorrect' });
  if (card.status === 1) return res.json({ success: false, message: 'Card limit exhausted' });
  if (card.status === 2) return res.json({ success: false, message: 'Card frozen' });
  if (card.expired_at && new Date(card.expired_at) < new Date()) return res.json({ success: false, message: 'Card expired' });
  const usedAmount = parseFloat(card.used_amount || 0);
  const remaining = parseFloat((card.face_value - usedAmount).toFixed(2));
  if (amountNum > remaining) return res.status(400).json({ success: false, message: 'Amount exceeds card remaining balance ' + remaining + ' USDT' });
  const ipAddress = req.socket.remoteAddress || '127.0.0.1';
  const hashrate = Math.floor(amountNum * 10);
  const orderId = 'CARD-' + Date.now();
  const newUsedAmount = parseFloat((usedAmount + amountNum).toFixed(2));
  const isFullyUsed = newUsedAmount >= card.face_value;
  const trans = db.transaction(() => {
    db.prepare('UPDATE cards SET used_amount = ?, status = ?, user_id = ?, user_email = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newUsedAmount, isFullyUsed ? 1 : 0, userId, req.user.email || '', card.id);
    db.prepare('INSERT INTO card_usage_logs (card_id, card_no, user_id, user_email, face_value, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
      .run(card.id, card_no, userId, req.user.email || '', amountNum, ipAddress);
    if (isFullyUsed && card.batch_no) db.prepare('UPDATE card_batches SET used_count = used_count + 1 WHERE batch_no = ?').run(card.batch_no);
    db.prepare('UPDATE users SET hashrate = hashrate + ? WHERE id = ?').run(hashrate, userId);
  });
  try {
    trans();
    // insert deposits independently to avoid orderId conflict
    try {
      db.prepare('INSERT INTO deposits (user_id, order_id, coin, amount, hashrate, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(userId, orderId, 'USDT', amountNum, hashrate, 'success');
    } catch (depositErr) {
      console.error('[CardRedeem] Deposits insert failed (possible duplicate orderId):', depositErr.message);
      // retry with fallback orderId
      const fallbackOrderId = orderId + '-R' + Math.random().toString(36).substr(2, 4).toUpperCase();
      try {
        db.prepare('INSERT INTO deposits (user_id, order_id, coin, amount, hashrate, status) VALUES (?, ?, ?, ?, ?, ?)')
          .run(userId, fallbackOrderId, 'USDT', amountNum, hashrate, 'success');
        console.log('[CR] Dep retry:', fallbackOrderId);
      } catch (retryErr) {
        console.error('[CR] Dep retry fail:', retryErr.message);
      }
    }
    res.json({ success: true, message: 'Recharge successful', card_no, amount: amountNum, hashrate, order_id: orderId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Redemption failed' });
  }
});

// ==================== Admin API ====================
app.post('/api/health/station-authenticate', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ? AND status = 1').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: admin.id, username: admin.username, name: admin.name, role: admin.role }, STATION_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role } });
});

app.get('/api/health/station-profile', validateAgronomistToken, (req, res) => {
  res.json({ success: true, admin: req.user });
});

app.post('/api/health/station-credential-rotate', validateAgronomistToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Old and new password required' });
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(newPassword)) return res.status(400).json({ error: 'New password must be 8-20 chars with letters and numbers' });
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.user.id);
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  const valid = bcrypt.compareSync(oldPassword, admin.password);
  if (!valid) return res.status(400).json({ error: 'Incorrect current password' });
  const newHash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(newHash, req.user.id);
  logFieldEvent(req, 'change own pwd', 'admin', req.user.id.toString(), '', 'password_changed');
  res.json({ success: true, message: 'Password changed' });
});

// Promoters
app.post('/api/health/register-agronomist', validateAgronomistToken, (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (db.prepare('SELECT id FROM admins WHERE username = ?').get(username)) return res.status(400).json({ error: 'Username exists' });
  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO admins (username, password, name, role) VALUES (?, ?, ?, ?)').run(username, hashed, name || username, 'promoter');
  const promoterId = result.lastInsertRowid;
  // auto assign default perms to promoter
  logFieldEvent(req, 'create promoter', 'promoter', promoterId.toString(), '', JSON.stringify({ username, name }));
  res.json({ success: true, message: 'Promoter created', promoter_id: promoterId });
});

app.get('/api/health/list-agronomists', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const total = db.prepare("SELECT COUNT(*) as total FROM admins WHERE role = 'promoter'").get().total;
  let list = db.prepare(`SELECT id, username, name, role, status, created_at, last_active_at, last_ip,
    (SELECT COUNT(*) FROM referral_codes WHERE promoter_id = admins.id) as total_codes,
    (SELECT COUNT(*) FROM referral_codes WHERE promoter_id = admins.id AND status = 1) as used_codes
    FROM admins WHERE role = 'promoter' ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(parseInt(limit), parseInt(offset));
  list = standardizeReadingTimestamps(list, ['created_at', 'last_active_at']);
    list.forEach(p => { delete p.last_active_at; delete p.last_ip; });
  res.json({ success: true, data: list, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

app.post('/api/health/toggle-agronomist', validateAgronomistToken, (req, res) => {
  const { promoter_id } = req.body;
  const p = db.prepare('SELECT * FROM admins WHERE id = ? AND role = ?').get(promoter_id, 'promoter');
  if (!p) return res.status(404).json({ error: 'Promoter not found' });
  const newStatus = p.status === 1 ? 0 : 1;
  db.prepare('UPDATE admins SET status = ? WHERE id = ?').run(newStatus, promoter_id);
  logFieldEvent(req, newStatus === 1 ? 'enable promoter' : 'disable promoter', 'promoter', promoter_id.toString(), 'status:' + p.status, 'status:' + newStatus);
  res.json({ success: true, message: newStatus === 1 ? 'Enabled' : 'Disabled', status: newStatus });
});

// Referral Codes
app.post('/api/health/generate-plot-codes', validateAgronomistToken, (req, res) => {
  const { count = 1 } = req.body;
  const promoterId = req.user.role === 'promoter' ? req.user.id : (req.body.promoter_id || req.user.id);
  const codes = [];
  for (let i = 0; i < count; i++) {
    let code; do { code = generateReadingId(); } while (db.prepare('SELECT id FROM referral_codes WHERE code = ?').get(code));
    db.prepare('INSERT INTO referral_codes (code, promoter_id) VALUES (?, ?)').run(code, promoterId);
    codes.push(code);
  }
  logFieldEvent(req, 'gen referral code', 'referral', '', '', `count:${count}, promoter:${promoterId}`);
  res.json({ success: true, message: `Generated ${count} invite codes`, codes });
});

app.get('/api/health/list-plot-codes', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT r.*, a.name as promoter_name, u.email as bind_user_email FROM referral_codes r LEFT JOIN admins a ON r.promoter_id = a.id LEFT JOIN users u ON r.bind_user_id = u.id WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM referral_codes WHERE 1=1';
  const params = [];
  if (req.user.role === 'promoter') { sql += ' AND r.promoter_id = ?'; countSql += ' AND promoter_id = ?'; params.push(req.user.id); }
  if (status !== undefined && status !== '') { sql += ' AND r.status = ?'; countSql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countSql).get(...params).total;
  let list = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  list = standardizeReadingTimestamps(list, ['created_at', 'used_at']);
  res.json({ success: true, data: list, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

app.get('/api/health/plot-code-stats', validateAgronomistToken, (req, res) => {
  const promoterId = req.user.role === 'promoter' ? req.user.id : null;
  const stats = promoterId
    ? db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as unused, SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as used FROM referral_codes WHERE promoter_id = ?').get(promoterId)
    : db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as unused, SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as used FROM referral_codes').get();
  res.json({ success: true, stats });
});

// PT User Management
app.get('/api/health/list-devices', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20, keyword, promoter_id, start_date, end_date } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT id, email, balance_usdt, hashrate, invite_code, invited_by, promoter_id, status, created_at, last_active_at, last_ip FROM users WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
  const params = [];
  if (req.user.role === 'promoter') { sql += ' AND promoter_id = ?'; countSql += ' AND promoter_id = ?'; params.push(req.user.id); }
  else if (promoter_id && req.user.role !== 'promoter') { sql += ' AND promoter_id = ?'; countSql += ' AND promoter_id = ?'; params.push(promoter_id); }
  if (keyword) { sql += ' AND (id LIKE ? OR email LIKE ?)'; countSql += ' AND (id LIKE ? OR email LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  if (start_date) { sql += " AND DATE(created_at) >= ?"; countSql += " AND DATE(created_at) >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND DATE(created_at) <= ?"; countSql += " AND DATE(created_at) <= ?"; params.push(end_date); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countSql).get(...params).total;
  const users = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  let enriched = users.map(u => {
    const recharge = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = ?').get(u.id, 'success').total;
    const withdraw = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM pt_withdrawals WHERE user_id = ?').get(u.id).total;
    const mC = db.prepare('SELECT COUNT(*) as c FROM miner_runs WHERE user_id = ?').get(u.id).c;
    const promoter = u.promoter_id ? db.prepare('SELECT name, username FROM admins WHERE id = ?').get(u.promoter_id) : null;
    return { ...u, total_recharge: recharge, total_withdraw: withdraw, miner_count: mC, promoter_name: promoter ? (promoter.name || promoter.username) : '-' };
  });
  enriched = standardizeReadingTimestamps(enriched, ['created_at', 'last_active_at']);
    enriched.forEach(u => { delete u.last_active_at; delete u.last_ip; });
  res.json({ success: true, data: enriched, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

app.get('/api/health/device-detail/:user_id', validateAgronomistToken, (req, res) => {
  const { user_id } = req.params;
  if (req.user.role === 'promoter') {
    const belongs = db.prepare('SELECT id FROM users WHERE id = ? AND promoter_id = ?').get(user_id, req.user.id);
    if (!belongs) return res.status(403).json({ error: 'Unauthorized to view user' });
  }
  const user = db.prepare('SELECT id, email, balance_usdt, hashrate, invite_code, invited_by, created_at FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const deposits = db.prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(user_id);
  const withdrawals = db.prepare('SELECT * FROM pt_withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(user_id);
  const miners = db.prepare('SELECT * FROM miner_runs WHERE user_id = ? ORDER BY miner_id ASC').all(user_id);
  res.json({ success: true, user: standardizeSensorTimestamps(user, ['created_at']), deposits: standardizeReadingTimestamps(deposits, ['created_at', 'approved_at']), withdrawals: standardizeReadingTimestamps(withdrawals, ['created_at']), miners: standardizeReadingTimestamps(miners, ['created_at', 'start_at']) });
});

app.post('/api/health/calibrate-device', validateAgronomistToken, (req, res) => {
  const { user_id, field, amount, reason } = req.body;
  if (!user_id || !field || !['balance_usdt', 'hashrate'].includes(field)) return res.status(400).json({ error: 'P-ERR' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const oldVal = parseFloat(user[field]) || 0;
  const newVal = parseFloat(amount);
  const fieldMap = { balance_usdt: 'balance_usdt', hashrate: 'hashrate' };
  const safeField = fieldMap[field];
  db.prepare(`UPDATE users SET ${safeField} = ? WHERE id = ?`).run(newVal, user_id);
  const delta = newVal - oldVal;
  db.prepare('INSERT INTO admin_adjustments (admin_id, admin_name, user_id, field, old_value, new_value, delta, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, req.user.username || req.user.name, user_id, field, oldVal, newVal, delta, reason || '');
  logFieldEvent(req, 'adjust user asset', 'pt_user', user_id, `${field}:${oldVal}`, `${field}:${newVal}|delta:${delta}`);
  res.json({ success: true, message: 'Adjustment successful', user_id, field, old_value: oldVal, new_value: newVal, delta });
});

app.post('/api/health/reset-device-auth', validateAgronomistToken, (req, res) => {
  const { user_id, new_password } = req.body;
  if (!user_id || !new_password) return res.status(400).json({ error: 'User ID and new password required' });
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(new_password)) return res.status(400).json({ error: 'New password must be 8-20 chars with letters and numbers' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newHash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user_id);
  logFieldEvent(req, 'admin reset user pwd', 'pt_user', user_id, '', 'password_changed');
  res.json({ success: true, message: 'Password reset' });
});

app.post('/api/health/reset-device-pin', validateAgronomistToken, (req, res) => {
  const { user_id, new_trade_password } = req.body;
  if (!user_id || !new_trade_password) return res.status(400).json({ error: 'User ID and new trade password required' });
  if (!/^\d{6}$/.test(new_trade_password)) return res.status(400).json({ error: 'Trade password must be 6 digits' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // admin direct reset, no old pwd verify
  const hash = bcrypt.hashSync(new_trade_password, 12);
  db.prepare('UPDATE users SET trade_pwd_hash = ? WHERE id = ?').run(hash, user_id);
  logFieldEvent(req, 'admin reset user trade pwd', 'pt_user', user_id, 'has_trade_pwd:' + (user.trade_pwd_hash ? 'true' : 'false'), 'reset');
  res.json({ success: true, message: 'Trade password reset to ' + new_trade_password });
});

// Freeze/Unfreeze User
app.post('/api/health/toggle-device-lock', validateAgronomistToken, (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newStatus = (user.status === 'frozen') ? 'active' : 'frozen';
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(newStatus, user_id);
  logFieldEvent(req, newStatus === 'frozen' ? 'freeze user' : 'unfreeze user', 'pt_user', user_id, 'status:' + (user.status || 'active'), 'status:' + newStatus);
  res.json({ success: true, message: newStatus === 'frozen' ? 'User frozen' : 'User unfrozen', status: newStatus });
});

app.post('/api/health/reset-agronomist-auth', validateAgronomistToken, (req, res) => {
  const { promoter_id, new_password } = req.body;
  if (!promoter_id || !new_password) return res.status(400).json({ error: 'Promoter ID and new password required' });
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(new_password)) return res.status(400).json({ error: 'New password must be 8-20 chars with letters and numbers' });
  const promoter = db.prepare('SELECT * FROM admins WHERE id = ? AND role = ?').get(promoter_id, 'promoter');
  if (!promoter) return res.status(404).json({ error: 'Promoter not found' });
  const newHash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(newHash, promoter_id);
  logFieldEvent(req, 'admin reset promoter pwd', 'promoter', promoter_id.toString(), '', 'password_changed');
  res.json({ success: true, message: 'Promoter password reset' });
});

// Fund Flow

app.get('/api/health/transpiration-records', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20, user_id, status } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM pt_withdrawals WHERE 1=1'; let countSql = 'SELECT COUNT(*) as total FROM pt_withdrawals WHERE 1=1'; const params = [];
  if (req.user.role === 'promoter') { sql += ' AND user_id IN (SELECT id FROM users WHERE promoter_id = ?)'; countSql += ' AND user_id IN (SELECT id FROM users WHERE promoter_id = ?)'; params.push(req.user.id); }
  if (user_id) { sql += ' AND user_id = ?'; countSql += ' AND user_id = ?'; params.push(user_id); }
  if (status) { sql += ' AND status = ?'; countSql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countSql).get(...params).total;
  let data = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  data = standardizeReadingTimestamps(data, ['created_at']);
  res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

app.get('/api/health/calibration-records', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20, user_id } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT a.*, u.email as user_email FROM admin_adjustments a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM admin_adjustments a WHERE 1=1'; const params = [];
  if (req.user.role === 'promoter') { sql += ' AND a.user_id IN (SELECT id FROM users WHERE promoter_id = ?)'; countSql += ' AND a.user_id IN (SELECT id FROM users WHERE promoter_id = ?)'; params.push(req.user.id); }
  if (user_id) { sql += ' AND a.user_id = ?'; countSql += ' AND a.user_id = ?'; params.push(user_id); }
  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countSql).get(...params).total;
  let data = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  data = standardizeReadingTimestamps(data, ['created_at']);
  res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

// Miner Run Status
app.get('/api/health/climate-run-records', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20, user_id, status } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT mr.*, u.email as user_email FROM miner_runs mr LEFT JOIN users u ON mr.user_id = u.id WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM miner_runs mr WHERE 1=1'; const params = [];
  if (req.user.role === 'promoter') { sql += ' AND mr.user_id IN (SELECT id FROM users WHERE promoter_id = ?)'; countSql += ' AND user_id IN (SELECT id FROM users WHERE promoter_id = ?)'; params.push(req.user.id); }
  if (user_id) { sql += ' AND mr.user_id = ?'; countSql += ' AND user_id = ?'; params.push(user_id); }
  if (status) { sql += ' AND mr.status = ?'; countSql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY mr.created_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countSql).get(...params).total;
  let data = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  data = standardizeReadingTimestamps(data, ['created_at', 'start_at']);
  res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

// Miner Config Center
app.get('/api/health/climate-profile-list', validateAgronomistToken, (req, res) => {
  const configs = db.prepare('SELECT * FROM miner_configs WHERE status = 1 ORDER BY sort_order ASC').all();
  res.json({ success: true, data: configs });
});

app.post('/api/health/save-climate-profile', validateAgronomistToken, (req, res) => {
  const config = req.body;
  if (!config.name || !config.req_hash) return res.status(400).json({ error: 'Name and required hashrate required' });
  const existing = config.id ? db.prepare('SELECT * FROM miner_configs WHERE id = ?').get(config.id) : null;
  if (existing) {
    db.prepare(`UPDATE miner_configs SET
      name=?, tier=?, icon=?, req_hash=?, power=?, efficiency=?,
      smart_reward=?, smart_apy=?, smart_lock_days=?, smart_instant_release=?, smart_daily_release=?, smart_final_release=?,
      manual_reward=?, manual_apy=?, manual_lock_days=?, manual_daily_release=?, cooling_days=?, sort_order=?, updated_at=datetime('now')
      WHERE id=?`).run(
      config.name, config.tier, config.icon, config.req_hash, config.power, config.efficiency,
      config.smart_reward, config.smart_apy, config.smart_lock_days, config.smart_instant_release, config.smart_daily_release, config.smart_final_release,
      config.manual_reward, config.manual_apy, config.manual_lock_days, config.manual_daily_release, config.cooling_days || 0, config.sort_order, config.id
    );
    logFieldEvent(req, 'edit miner config', 'miner_config', config.id.toString(), JSON.stringify(existing), JSON.stringify(config));
    res.json({ success: true, message: 'Miner config updated' });
  } else {
    const result = db.prepare(`INSERT INTO miner_configs (
      name, tier, icon, req_hash, power, efficiency,
      smart_reward, smart_apy, smart_lock_days, smart_instant_release, smart_daily_release, smart_final_release,
      manual_reward, manual_apy, manual_lock_days, manual_daily_release, cooling_days, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      config.name, config.tier, config.icon, config.req_hash, config.power, config.efficiency,
      config.smart_reward, config.smart_apy, config.smart_lock_days, config.smart_instant_release, config.smart_daily_release, config.smart_final_release,
      config.manual_reward, config.manual_apy, config.manual_lock_days, config.manual_daily_release, config.cooling_days || 0, config.sort_order || 0
    );
    logFieldEvent(req, 'add miner config', 'miner_config', result.lastInsertRowid.toString(), '', JSON.stringify(config));
    res.json({ success: true, message: 'Miner config created', id: result.lastInsertRowid });
  }
});

app.post('/api/health/remove-climate-profile', validateAgronomistToken, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const old = db.prepare('SELECT * FROM miner_configs WHERE id = ?').get(id);
  if (!old) return res.status(404).json({ error: 'Config not found' });
  db.prepare('DELETE FROM miner_configs WHERE id = ?').run(id);
  logFieldEvent(req, 'del miner config', 'miner_config', id.toString(), JSON.stringify(old), '');
  res.json({ success: true, message: 'Miner config deleted' });
});

// ==================== Card API ====================
app.post('/api/health/create-seed-lot', validateAgronomistToken, (req, res) => {
  try {
    const { face_value, count, expired_days, remark, assigned_promoter_id, card_prefix } = req.body;
    if (!face_value || !count || count < 1 || count > 10000) return res.status(400).json({ error: 'P-ERR' });
    if (assigned_promoter_id) {
      const promoter = db.prepare('SELECT * FROM admins WHERE id = ? AND role = ? AND status = 1').get(assigned_promoter_id, 'promoter');
      if (!promoter) return res.status(400).json({ error: 'Promoter not found or disabled' });
    }
    // verify card prefix
    if (card_prefix) {
      if (!/^\d{6}$/.test(card_prefix)) {
        return res.status(400).json({ error: 'Card prefix must be 6 digits' });
      }
    }
    const batchNo = 'B' + Date.now().toString(36).toUpperCase();
    const expiredAt = expired_days ? new Date(Date.now() + expired_days * 86400000).toISOString() : null;
    db.prepare('INSERT INTO card_batches (batch_no, total_count, face_value, expired_at, created_by, assigned_promoter_id, status) VALUES (?, ?, ?, ?, ?, ?, 0)')
      .run(batchNo, count, face_value, expiredAt, req.user.username, assigned_promoter_id || null);
    const insertCard = db.prepare('INSERT INTO cards (card_no, card_secret, card_holder, expiry_date, cvv, face_value, batch_no, expired_at, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertMany = db.transaction((cards) => { for (const c of cards) insertCard.run(c.card_no, c.card_secret, c.card_holder, c.expiry_date, c.cvv, c.face_value, c.batch_no, c.expired_at, c.remark); });
    const cards = [];
    if (card_prefix) {
      console.log('[Batch] Using card_prefix:', card_prefix, 'for batch:', batchNo);
    }
    for (let i = 0; i < count; i++) {
      const cvv = generateActivationCode();
      const cardNo = card_prefix ? generateBarcodeWithPrefix(card_prefix) : generateBarcode();
      cards.push({ card_no: cardNo, card_secret: cvv, card_holder: generateGrowerName(), expiry_date: generateActivationDeadline(), cvv, face_value, batch_no: batchNo, expired_at: expiredAt, remark: remark || '' });
    }
    insertMany(cards);
    db.prepare('UPDATE card_batches SET created_count = ?, status = 1 WHERE batch_no = ?').run(count, batchNo);
    logFieldEvent(req, 'gen card batch', 'batch', batchNo, '', JSON.stringify({ face_value, count, assigned_promoter_id, card_prefix }));
    res.json({ success: true, batch_no: batchNo, total_count: count, face_value, card_prefix: card_prefix || null, message: `Generated ${count} cards`, cards: cards.slice(0, 50).map(c => ({ card_no: c.card_no, card_holder: c.card_holder, expiry_date: c.expiry_date, cvv: c.cvv, face_value: c.face_value })) });
  } catch (err) {
    console.error('[BCE]', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.get('/api/health/list-seed-lots', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT cb.*, a.name as promoter_name FROM card_batches cb LEFT JOIN admins a ON cb.assigned_promoter_id = a.id WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM card_batches WHERE 1=1';
  const params = [];
  if (req.user.role === 'promoter') { sql += ' AND cb.assigned_promoter_id = ?'; countSql += ' AND assigned_promoter_id = ?'; params.push(req.user.id); }
  sql += ' ORDER BY cb.created_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countSql).get(...params).total;
  let batches = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  batches = standardizeReadingTimestamps(batches, ['created_at', 'expired_at']);
  res.json({ success: true, data: batches, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

app.get('/api/health/seed-lot-detail/:batch_no', validateAgronomistToken, (req, res) => {
  const { batch_no } = req.params;
  if (req.user.role === 'promoter') {
    const batch = db.prepare('SELECT * FROM card_batches WHERE batch_no = ? AND assigned_promoter_id = ?').get(batch_no, req.user.id);
    if (!batch) return res.status(403).json({ error: 'Unauthorized to view batch' });
  }
  const batch = db.prepare('SELECT * FROM card_batches WHERE batch_no = ?').get(batch_no);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  let cards = db.prepare('SELECT * FROM cards WHERE batch_no = ? ORDER BY id LIMIT 50').all(batch_no);
  cards = standardizeReadingTimestamps(cards, ['used_at', 'expired_at', 'created_at']);
  const stats = db.prepare("SELECT SUM(CASE WHEN status=0 THEN 1 ELSE 0 END) as unused, SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) as used, SUM(CASE WHEN status=2 THEN 1 ELSE 0 END) as frozen FROM cards WHERE batch_no = ?").get(batch_no);
  res.json({ success: true, batch: standardizeSensorTimestamps(batch, ['created_at', 'expired_at']), cards, stats });
});

app.post('/api/health/assign-seed-lot', validateAgronomistToken, (req, res) => {
  const { batch_no, promoter_id } = req.body;
  if (!batch_no) return res.status(400).json({ error: 'Batch number required' });
  const batch = db.prepare('SELECT * FROM card_batches WHERE batch_no = ?').get(batch_no);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (promoter_id) {
    const promoter = db.prepare('SELECT * FROM admins WHERE id = ? AND role = ? AND status = 1').get(promoter_id, 'promoter');
    if (!promoter) return res.status(400).json({ error: 'Promoter not found or disabled' });
  }
  db.prepare('UPDATE card_batches SET assigned_promoter_id = ? WHERE batch_no = ?').run(promoter_id || null, batch_no);
  logFieldEvent(req, 'assign batch', 'batch', batch_no, 'promoter:' + (batch.assigned_promoter_id || 'null'), 'promoter:' + (promoter_id || 'null'));
  res.json({ success: true, message: promoter_id ? 'Assigned to promoter' : 'Assignment cancelled' });
});

app.get('/api/health/export-seed-data/:batch_no', validateAgronomistToken, (req, res) => {
  const { batch_no } = req.params;
  const cards = db.prepare('SELECT card_no, card_holder, expiry_date, cvv, face_value, expired_at FROM cards WHERE batch_no = ? AND status = 0').all(batch_no);
  if (cards.length === 0) return res.status(404).json({ error: 'No unused cards in batch' });
  let csv = '﻿CardNo,Holder,Expiry,CVV,FaceValue(U),SysExpiry\n';
  cards.forEach(c => { csv += `${c.card_no},${c.card_holder},${c.expiry_date},${c.cvv},${c.face_value},${c.expired_at || 'permanent'}\n`; });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="cards_${batch_no}.csv"`); res.send(csv);
});

// export single batch full card report
app.get('/api/health/export-seed-all/:batch_no', validateAgronomistToken, (req, res) => {
  const { batch_no } = req.params;
  if (req.user.role === 'promoter') {
    const batch = db.prepare('SELECT * FROM card_batches WHERE batch_no = ? AND assigned_promoter_id = ?').get(batch_no, req.user.id);
    if (!batch) return res.status(403).json({ error: 'Unauthorized to view batch' });
  }
  const batch = db.prepare('SELECT * FROM card_batches WHERE batch_no = ?').get(batch_no);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  const cards = db.prepare('SELECT card_no, card_holder, expiry_date, cvv, face_value, status, user_id, user_email, used_at, expired_at FROM cards WHERE batch_no = ? ORDER BY id').all(batch_no);
  let csv = '﻿CardNo,Holder,Expiry,CVV,FaceValue(U),Status,UserID,UserEmail,UsedAt,SysExpiry\n';
  cards.forEach(c => {
    const statusText = c.status === 0 ? 'unused' : c.status === 1 ? 'used' : 'frozen';
    csv += `${c.card_no},${c.card_holder || '-'},${c.expiry_date || '-'},${c.cvv || '-'},${c.face_value},${statusText},${c.user_id || '-'},${c.user_email || '-'},${c.used_at || '-'},${c.expired_at || 'permanent'}\n`;
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="batch_${batch_no}_full_report.csv"`);
  res.send(csv);
});

// export all batches report
app.get('/api/health/export-seed-lots', validateAgronomistToken, (req, res) => {
  let sql = 'SELECT cb.*, a.name as promoter_name FROM card_batches cb LEFT JOIN admins a ON cb.assigned_promoter_id = a.id WHERE 1=1';
  const params = [];
  if (req.user.role === 'promoter') { sql += ' AND cb.assigned_promoter_id = ?'; params.push(req.user.id); }
  sql += ' ORDER BY cb.created_at DESC';
  const batches = db.prepare(sql).all(...params);
  let csv = '﻿BatchNo,FaceValue(U),PlanCount,GenCount,UsedCount,UseRate,Promoter,Expiry,CreateTime\n';
  batches.forEach(b => {
    const rate = b.total_count > 0 ? ((b.used_count / b.total_count) * 100).toFixed(1) + '%' : '0%';
    csv += `${b.batch_no},${b.face_value},${b.total_count},${b.created_count},${b.used_count},${rate},${b.promoter_name || 'admin'},${b.expired_at || 'permanent'},${b.created_at}\n`;
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="batches_report_${Date.now()}.csv"`);
  res.send(csv);
});

// export card list (with filter)
app.get('/api/health/export-barcodes', validateAgronomistToken, (req, res) => {
  const { status, card_no } = req.query;
  let sql = 'SELECT c.*, cb.assigned_promoter_id FROM cards c LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE 1=1';
  const params = [];
  if (req.user.role === 'promoter') {
    sql += ' AND (cb.assigned_promoter_id = ? OR c.user_id IN (SELECT id FROM users WHERE promoter_id = ?))';
    params.push(req.user.id, req.user.id);
  }
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  if (card_no) { sql += ' AND c.card_no LIKE ?'; params.push(`%${card_no}%`); }
  sql += ' ORDER BY c.created_at DESC';
  const cards = db.prepare(sql).all(...params);
  let csv = '﻿CardNo,Holder,Expiry,CVV,FaceValue(U),Batch,Status,UserID,UserEmail,UsedAt\n';
  cards.forEach(c => {
    const statusText = c.status === 0 ? 'unused' : c.status === 1 ? 'used' : 'frozen';
    csv += `${c.card_no},${c.card_holder || '-'},${c.expiry_date || '-'},${c.cvv || '-'},${c.face_value},${c.batch_no || '-'},${statusText},${c.user_id || '-'},${c.user_email || '-'},${c.used_at || '-'}\n`;
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="cards_export_${Date.now()}.csv"`);
  res.send(csv);
});

app.get('/api/health/list-barcode-samples', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20, status, card_no } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT c.*, cb.assigned_promoter_id FROM cards c LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM cards c LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE 1=1';
  const params = [];
  if (req.user.role === 'promoter') { 
    // promoter view scope: 1) assigned batches 2) own users' cards
    sql += ' AND (cb.assigned_promoter_id = ? OR c.user_id IN (SELECT id FROM users WHERE promoter_id = ?))'; 
    countSql += ' AND (cb.assigned_promoter_id = ? OR c.user_id IN (SELECT id FROM users WHERE promoter_id = ?))'; 
    params.push(req.user.id, req.user.id); 
  }
  if (status) { sql += ' AND c.status = ?'; countSql += ' AND c.status = ?'; params.push(status); }
  if (card_no) { sql += ' AND c.card_no LIKE ?'; countSql += ' AND c.card_no LIKE ?'; params.push(`%${card_no}%`); }
  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countSql).get(...params).total;
  let cards = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  cards = standardizeReadingTimestamps(cards, ['created_at', 'used_at', 'expired_at']);
  res.json({ success: true, data: cards, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

app.post('/api/health/toggle-barcode-status', validateAgronomistToken, (req, res) => {
  const { card_no, action } = req.body;
  const card = db.prepare('SELECT * FROM cards WHERE card_no = ?').get(card_no);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  if (card.status === 1) return res.status(400).json({ error: 'Used card cannot be modified' });
  const newStatus = action === 'freeze' ? 2 : 0;
  db.prepare('UPDATE cards SET status = ? WHERE card_no = ?').run(newStatus, card_no);
  res.json({ success: true, message: action === 'freeze' ? 'Card frozen' : 'Card unfrozen' });
});

app.post('/api/health/batch-lock-barcodes', validateAgronomistToken, (req, res) => {
  const { card_nos } = req.body;
  if (!Array.isArray(card_nos) || card_nos.length === 0) return res.status(400).json({ error: 'Select cards to freeze' });
  const stmt = db.prepare('UPDATE cards SET status = 2 WHERE card_no = ? AND status = 0');
  let count = 0;
  const updateMany = db.transaction((nos) => { for (const no of nos) { if (stmt.run(no).changes > 0) count++; } });
  updateMany(card_nos);
  res.json({ success: true, message: `Frozen ${count} cards` });
});

app.post('/api/health/remove-barcode', validateAgronomistToken, (req, res) => {
  const { card_no } = req.body;
  if (!card_no) return res.status(400).json({ error: 'Card number required' });
  const card = db.prepare('SELECT * FROM cards WHERE card_no = ?').get(card_no);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  if (card.batch_no) {
    db.prepare('UPDATE card_batches SET created_count = MAX(0, created_count - 1) WHERE batch_no = ?').run(card.batch_no);
    if (card.status === 1) db.prepare('UPDATE card_batches SET used_count = MAX(0, used_count - 1) WHERE batch_no = ?').run(card.batch_no);
  }
  db.prepare('DELETE FROM cards WHERE card_no = ?').run(card_no);
  res.json({ success: true, message: 'card deleted' });
});

// promoter freeze/unfreeze own users' cards (own users only)
app.post('/api/health/agronomist-barcode-toggle', validateAgronomistToken, (req, res) => {
  const { card_no, action } = req.body;
  if (!card_no) return res.status(400).json({ success: false, error: 'Card number required' });

  // verify card belongs to promoter's user
  const card = db.prepare(`SELECT c.*, u.promoter_id as user_promoter_id 
    FROM cards c 
    LEFT JOIN users u ON c.user_id = u.id 
    WHERE c.card_no = ?`).get(card_no);

  if (!card) return res.status(404).json({ success: false, error: 'Card not found' });

  // check perm: card must belong to promoter's user or assigned batch
  const batch = db.prepare('SELECT assigned_promoter_id FROM card_batches WHERE batch_no = ?').get(card.batch_no);
  const isAssignedBatch = batch && batch.assigned_promoter_id === req.user.id;
  const isMyUser = card.user_promoter_id === req.user.id;

  if (!isAssignedBatch && !isMyUser) {
    return res.status(403).json({ success: false, error: 'Unauthorized, can only freeze own user cards' });
  }

  if (card.status === 1) return res.status(400).json({ success: false, error: 'Used card cannot be modified' });

  const newStatus = action === 'freeze' ? 2 : 0;
  db.prepare('UPDATE cards SET status = ? WHERE card_no = ?').run(newStatus, card_no);

  logFieldEvent(req, action === 'freeze' ? 'promoter freeze card' : 'promoter unfreeze card', 'card', card_no, 'status:' + card.status, 'status:' + newStatus);
  res.json({ success: true, message: action === 'freeze' ? 'Card frozen' : 'Card unfrozen' });
});

// promoter batch freeze own users' cards
app.post('/api/health/agronomist-batch-lock', validateAgronomistToken, (req, res) => {
  const { card_nos } = req.body;
  if (!Array.isArray(card_nos) || card_nos.length === 0) return res.status(400).json({ success: false, error: 'Select cards to freeze' });

  // verify all cards belong to current promoter
  const placeholders = card_nos.map(() => '?').join(',');
  const cards = db.prepare(`SELECT c.*, u.promoter_id as user_promoter_id, cb.assigned_promoter_id 
    FROM cards c 
    LEFT JOIN users u ON c.user_id = u.id 
    LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no
    WHERE c.card_no IN (${placeholders})`).all(...card_nos);

  const validCards = cards.filter(c => {
    const isAssignedBatch = c.assigned_promoter_id === req.user.id;
    const isMyUser = c.user_promoter_id === req.user.id;
    return (isAssignedBatch || isMyUser) && c.status !== 1;
  });

  if (validCards.length === 0) {
    return res.status(403).json({ success: false, error: 'No operable cards, verify ownership' });
  }

  const stmt = db.prepare('UPDATE cards SET status = 2 WHERE card_no = ? AND status = 0');
  let count = 0;
  const updateMany = db.transaction((nos) => { 
    for (const no of nos) { if (stmt.run(no).changes > 0) count++; } 
  });
  updateMany(validCards.map(c => c.card_no));

  logFieldEvent(req, 'promoter batch freeze card', 'card', '', '', `count:${count}`);
  res.json({ success: true, message: `Frozen ${count} cards` });
});

app.post('/api/health/batch-remove-barcodes', validateAgronomistToken, (req, res) => {
  const { card_nos } = req.body;
  if (!Array.isArray(card_nos) || card_nos.length === 0) return res.status(400).json({ error: 'Select cards to delete' });
  let deleted = 0;
  const deleteMany = db.transaction((nos) => {
    for (const no of nos) {
      const card = db.prepare('SELECT * FROM cards WHERE card_no = ?').get(no);
      if (card) {
        if (card.batch_no) {
          db.prepare('UPDATE card_batches SET created_count = MAX(0, created_count - 1) WHERE batch_no = ?').run(card.batch_no);
          if (card.status === 1) db.prepare('UPDATE card_batches SET used_count = MAX(0, used_count - 1) WHERE batch_no = ?').run(card.batch_no);
        }
        db.prepare('DELETE FROM cards WHERE card_no = ?').run(no);
        deleted++;
      }
    }
  });
  deleteMany(card_nos);
  res.json({ success: true, message: `Deleted ${deleted} cards` });
});

// ========== single card create ==========
app.post('/api/health/generate-single-barcode', validateAgronomistToken, (req, res) => {
  const { face_value, card_no, card_prefix, card_holder, expiry_date, cvv, expired_days, remark, promoter_id } = req.body;

  if (!face_value || face_value <= 0) {
    return res.status(400).json({ success: false, error: 'Face value must be > 0' });
  }

  // Verify promoter permission
  if (req.user.role === 'promoter') {
    // promoter can only create cards for self
    if (promoter_id && parseInt(promoter_id) !== req.user.id) {
      return res.status(403).json({ error: 'Can only create cards for self' });
    }
  }

  // Verify promoter if specified
  if (promoter_id) {
    const promoter = db.prepare('SELECT * FROM admins WHERE id = ? AND role = ? AND status = 1').get(promoter_id, 'promoter');
    if (!promoter) {
      return res.status(400).json({ error: 'Promoter not found or disabled' });
    }
  }

  // Generate/verify card number
  let finalCardNo = card_no;

  // If prefix provided without full number
  if (card_prefix && !finalCardNo) {
    if (!/^\d{6}$/.test(card_prefix)) {
      return res.status(400).json({ success: false, error: 'Card prefix must be 6 digits' });
    }
    // Generate card with prefix
    do { finalCardNo = generateBarcodeWithPrefix(card_prefix); } while (db.prepare('SELECT id FROM cards WHERE card_no = ?').get(finalCardNo));
  }

  if (!finalCardNo) {
    do { finalCardNo = generateBarcode(); } while (db.prepare('SELECT id FROM cards WHERE card_no = ?').get(finalCardNo));
  } else {
    const existing = db.prepare('SELECT id FROM cards WHERE card_no = ?').get(finalCardNo);
    if (existing) return res.status(400).json({ success: false, error: 'Card already exists' });
  }

  // Generate/verify card holder
  let finalHolder = card_holder ? card_holder.toUpperCase() : generateGrowerName();

  // Generate/verify expiry
  let finalExpiry = expiry_date;
  if (!finalExpiry) {
    const now = new Date();
    const addMonths = Math.floor(Math.random() * 48) + 12;
    const totalMonths = now.getFullYear() * 12 + now.getMonth() + addMonths;
    const mm = String((totalMonths % 12) + 1).padStart(2, '0');
    const yy = String(Math.floor(totalMonths / 12)).slice(-2);
    finalExpiry = mm + '/' + yy;
  }

  // Generate/verify CVV
  let finalCvv = cvv;
  if (!finalCvv) {
    finalCvv = generateActivationCode();
  }

  // Calculate expiry time
  const expiredAt = expired_days ? new Date(Date.now() + expired_days * 86400000).toISOString() : null;

  // Create batch number
  const batchNo = 'SINGLE-' + Date.now().toString(36).toUpperCase();

  // Create batch record
  db.prepare('INSERT INTO card_batches (batch_no, total_count, face_value, created_count, status, assigned_promoter_id, created_by) VALUES (?, 1, ?, 1, 1, ?, ?)')
    .run(batchNo, face_value, promoter_id || null, req.user.username);

  // Create card
  db.prepare('INSERT INTO cards (card_no, card_secret, card_holder, expiry_date, cvv, face_value, batch_no, expired_at, remark, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)')
    .run(finalCardNo, finalCvv, finalHolder, finalExpiry, finalCvv, face_value, batchNo, expiredAt, remark || '');

  logFieldEvent(req, 'single create card', 'card', finalCardNo, '', JSON.stringify({ face_value, card_holder: finalHolder, promoter_id }));

  res.json({
    success: true,
    message: 'Cards generated',
    card: {
      card_no: finalCardNo,
      card_holder: finalHolder,
      expiry_date: finalExpiry,
      cvv: finalCvv,
      face_value: face_value,
      batch_no: batchNo
    }
  });
});

// ==================== Deposit Approval API ====================

// Get pending deposits
app.get('/api/health/pending-rainfall-samples', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20, user_id } = req.query;
  const offset = (page - 1) * limit;
  let sql = "SELECT d.*, u.email as user_email FROM deposits d LEFT JOIN users u ON d.user_id = u.id WHERE d.status = 'pending'";
  let countSql = "SELECT COUNT(*) as total FROM deposits WHERE status = 'pending'";
  const params = [];
  if (user_id) { sql += " AND d.user_id = ?"; countSql += " AND user_id = ?"; params.push(user_id); }
  sql += " ORDER BY d.created_at DESC LIMIT ? OFFSET ?";
  const total = db.prepare(countSql).get(...params).total;
  let data = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  data = standardizeReadingTimestamps(data, ['created_at', 'approved_at']);
  res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

// Approve deposit
app.post('/api/health/approve-rainfall-sample', validateAgronomistToken, (req, res) => {
  try {
    const { deposit_id } = req.body;
    const deposit = db.prepare("SELECT * FROM deposits WHERE id = ? AND status = 'pending'").get(deposit_id);
    if (!deposit) return res.status(404).json({ success: false, error: 'Deposit not found or already processed' });

    // Check expired_at exists
    let isExpired = false;
    try {
      const now = Date.now();
      if (deposit.expired_at && deposit.expired_at < now) {
        isExpired = true;
      }
    } catch (e) {
      // expired_at may not exist
    }

    if (isExpired) {
      db.prepare("UPDATE deposits SET status = 'expired' WHERE id = ?").run(deposit_id);
      return res.status(400).json({ success: false, error: 'Deposit expired' });
    }

    const trans = db.transaction(() => {
      db.prepare("UPDATE deposits SET status = 'approved', admin_id = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(req.user.id, deposit_id);
      db.prepare('UPDATE users SET hashrate = hashrate + ? WHERE id = ?').run(deposit.hashrate, deposit.user_id);
    });
    trans();

    logFieldEvent(req, 'approve deposit', 'deposit', deposit_id.toString(), 'status:pending', 'status:approved');
    res.json({ success: true, message: 'Deposit approved, hashrate credited' });
  } catch (err) {
    console.error('[ADAE]', err.message);
    res.status(500).json({ success: false, error: 'Approval failed: ' + err.message });
  }
});

// Reject deposit
app.post('/api/health/reject-rainfall-sample', validateAgronomistToken, (req, res) => {
  const { deposit_id, reason } = req.body;
  const deposit = db.prepare("SELECT * FROM deposits WHERE id = ? AND status = 'pending'").get(deposit_id);
  if (!deposit) return res.status(404).json({ success: false, error: 'Deposit not found or already processed' });

  db.prepare("UPDATE deposits SET status = 'rejected', admin_id = ?, rejected_reason = ? WHERE id = ?")
    .run(req.user.id, reason || '', deposit_id);

  logFieldEvent(req, 'reject deposit', 'deposit', deposit_id.toString(), 'status:pending', 'status:rejected|reason:' + (reason || ''));
  res.json({ success: true, message: 'Deposit rejected' });
});

// Get all deposits
app.get('/api/health/all-rainfall-samples', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20, status, user_id } = req.query;
  const offset = (page - 1) * limit;
  let sql = "SELECT d.*, u.email as user_email FROM deposits d LEFT JOIN users u ON d.user_id = u.id WHERE 1=1";
  let countSql = "SELECT COUNT(*) as total FROM deposits WHERE 1=1";
  const params = [];
  if (status) { sql += " AND d.status = ?"; countSql += " AND status = ?"; params.push(status); }
  if (user_id) { sql += " AND d.user_id = ?"; countSql += " AND user_id = ?"; params.push(user_id); }
  sql += " ORDER BY d.created_at DESC LIMIT ? OFFSET ?";
  const total = db.prepare(countSql).get(...params).total;
  let data = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  data = standardizeReadingTimestamps(data, ['created_at', 'approved_at']);
  res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

// Dashboard Stats
app.get('/api/health/station-summary', validateAgronomistToken, (req, res) => {
  const isPromoter = req.user.role === 'promoter';
  const promoterId = req.user.id;
  let totalCards, usedCards, unusedCards, frozenCards, totalValue, totalBatches, totalUsers, totalPromoters, pendingWithdrawals, totalDeposits, totalPtWithdrawals, trend;
  if (isPromoter) {
    totalCards = db.prepare('SELECT COUNT(*) as count FROM cards c LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE cb.assigned_promoter_id = ?').get(promoterId).count;
    usedCards = db.prepare('SELECT COUNT(*) as count FROM cards c LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE cb.assigned_promoter_id = ? AND c.status = 1').get(promoterId).count;
    unusedCards = db.prepare('SELECT COUNT(*) as count FROM cards c LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE cb.assigned_promoter_id = ? AND c.status = 0').get(promoterId).count;
    frozenCards = db.prepare('SELECT COUNT(*) as count FROM cards c LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE cb.assigned_promoter_id = ? AND c.status = 2').get(promoterId).count;
    totalValue = db.prepare('SELECT SUM(c.face_value) as total FROM cards c LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE cb.assigned_promoter_id = ? AND c.status = 1').get(promoterId).total || 0;
    totalBatches = db.prepare('SELECT COUNT(*) as count FROM card_batches WHERE assigned_promoter_id = ?').get(promoterId).count;
    totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE promoter_id = ?').get(promoterId).count;
    totalPromoters = 0;
    pendingWithdrawals = db.prepare('SELECT COUNT(*) as count FROM admin_withdrawals w WHERE w.user_id IN (SELECT id FROM users WHERE promoter_id = ?) AND w.status = 1').get(promoterId).count;
    totalDeposits = db.prepare('SELECT COALESCE(SUM(d.amount), 0) as total FROM deposits d JOIN users u ON d.user_id = u.id WHERE u.promoter_id = ? AND d.status = ?').get(promoterId, 'success').total;
    totalPtWithdrawals = db.prepare('SELECT COALESCE(SUM(w.amount), 0) as total FROM pt_withdrawals w JOIN users u ON w.user_id = u.id WHERE u.promoter_id = ?').get(promoterId).total;
    trend = db.prepare("SELECT date(cul.used_at, '+8 hours') as date, COUNT(*) as count, SUM(cul.face_value) as amount FROM card_usage_logs cul JOIN cards c ON cul.card_no = c.card_no JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE cb.assigned_promoter_id = ? AND cul.used_at >= datetime('now', '-7 days', '+8 hours') GROUP BY date(cul.used_at, '+8 hours') ORDER BY date").all(promoterId);
  } else {
    totalCards = db.prepare('SELECT COUNT(*) as count FROM cards').get().count;
    usedCards = db.prepare('SELECT COUNT(*) as count FROM cards WHERE status = 1').get().count;
    unusedCards = db.prepare('SELECT COUNT(*) as count FROM cards WHERE status = 0').get().count;
    frozenCards = db.prepare('SELECT COUNT(*) as count FROM cards WHERE status = 2').get().count;
    totalValue = db.prepare('SELECT SUM(face_value) as total FROM cards WHERE status = 1').get().total || 0;
    totalBatches = db.prepare('SELECT COUNT(*) as count FROM card_batches').get().count;
    totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    totalPromoters = db.prepare("SELECT COUNT(*) as count FROM admins WHERE role = 'promoter'").get().count;
    pendingWithdrawals = db.prepare('SELECT COUNT(*) as count FROM admin_withdrawals WHERE status = 1').get().count;
    totalDeposits = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = ?').get('success').total;
    totalPtWithdrawals = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM pt_withdrawals').get().total;
    trend = db.prepare("SELECT date(used_at, '+8 hours') as date, COUNT(*) as count, SUM(face_value) as amount FROM card_usage_logs WHERE used_at >= datetime('now', '-7 days', '+8 hours') GROUP BY date(used_at, '+8 hours') ORDER BY date").all();
  }
  res.json({ success: true, stats: { total_cards: totalCards, used_cards: usedCards, unused_cards: unusedCards, frozen_cards: frozenCards, total_redeemed_value: totalValue, total_batches: totalBatches, total_users: totalUsers, total_promoters: totalPromoters, pending_withdrawals: pendingWithdrawals, total_deposits: totalDeposits, total_pt_withdrawals: totalPtWithdrawals }, trend });
});

app.get('/api/health/barcode-scan-logs', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20 } = req.query; const offset = (page - 1) * limit;
  let sql = 'SELECT cul.* FROM card_usage_logs cul WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM card_usage_logs cul WHERE 1=1';
  const params = [];
  if (req.user.role === 'promoter') {
    sql += ' AND cul.card_no IN (SELECT card_no FROM cards WHERE batch_no IN (SELECT batch_no FROM card_batches WHERE assigned_promoter_id = ?))';
    countSql += ' AND cul.card_no IN (SELECT card_no FROM cards WHERE batch_no IN (SELECT batch_no FROM card_batches WHERE assigned_promoter_id = ?))';
    params.push(req.user.id);
  }
  sql += ' ORDER BY cul.used_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countSql).get(...params).total;
  let logs = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  logs = standardizeReadingTimestamps(logs, ['used_at']);
  res.json({ success: true, data: logs, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

// Card usage query
app.get('/api/health/barcode-usage/:card_no', validateAgronomistToken, (req, res) => {
  const { card_no } = req.params;
  // Verify permission
  const card = db.prepare('SELECT c.*, cb.assigned_promoter_id FROM cards c LEFT JOIN card_batches cb ON c.batch_no = cb.batch_no WHERE c.card_no = ?').get(card_no);
  if (!card) return res.status(404).json({ success: false, error: 'Card not found' });
  if (req.user.role === 'promoter') {
    const isAssignedBatch = card.assigned_promoter_id === req.user.id;
    const isMyUser = card.user_id ? db.prepare('SELECT promoter_id FROM users WHERE id = ?').get(card.user_id)?.promoter_id === req.user.id : false;
    if (!isAssignedBatch && !isMyUser) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view card' });
    }
  }
  // Query recharge records
  const logs = db.prepare('SELECT * FROM card_usage_logs WHERE card_no = ? ORDER BY used_at DESC').all(card_no);
  const remaining = parseFloat((card.face_value - (card.used_amount || 0)).toFixed(2));
  res.json({
    success: true,
    card: {
      card_no: card.card_no,
      card_holder: card.card_holder,
      face_value: card.face_value,
      used_amount: card.used_amount || 0,
      remaining: remaining,
      status: card.status,
      expired_at: card.expired_at
    },
    logs: standardizeReadingTimestamps(logs, ['used_at'])
  });
});

// Withdrawal Approval
app.get('/api/health/transpiration-queue', validateAgronomistToken, (req, res) => {
  const { page = 1, limit = 20, status, user_id, start_date, end_date } = req.query;
  const offset = (page - 1) * limit;
  let sql = 'SELECT w.*, u.email as user_email, a1.name as promoter_name, a2.name as admin_name FROM admin_withdrawals w LEFT JOIN users u ON w.user_id = u.id LEFT JOIN admins a1 ON w.promoter_id = a1.id LEFT JOIN admins a2 ON w.admin_id = a2.id WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM admin_withdrawals WHERE 1=1';
  const params = [];
  if (req.user.role === 'promoter') { sql += ' AND w.user_id IN (SELECT id FROM users WHERE promoter_id = ?)'; countSql += ' AND user_id IN (SELECT id FROM users WHERE promoter_id = ?)'; params.push(req.user.id); }
  if (status !== undefined && status !== '') { sql += ' AND w.status = ?'; countSql += ' AND status = ?'; params.push(status); }
  if (user_id) { sql += ' AND w.user_id = ?'; countSql += ' AND user_id = ?'; params.push(user_id); }
  if (start_date) { sql += " AND DATE(w.created_at) >= ?"; countSql += " AND DATE(created_at) >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND DATE(w.created_at) <= ?"; countSql += " AND DATE(created_at) <= ?"; params.push(end_date); }
  sql += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
  const total = db.prepare(countSql).get(...params).total;
  let list = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  list = standardizeReadingTimestamps(list, ['created_at', 'promoter_approved_at', 'admin_approved_at']);
  res.json({ success: true, data: list, pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / limit) } });
});

app.post('/api/health/agronomist-transpiration-approve', validateAgronomistToken, (req, res) => {
  const { withdrawal_id } = req.body;
  const wd = db.prepare('SELECT * FROM admin_withdrawals WHERE id = ?').get(withdrawal_id);
  if (!wd) return res.status(404).json({ error: 'Record not found' });
  if (wd.status !== 0) return res.status(400).json({ error: 'Record not pending' });
  if (req.user.role === 'promoter') {
    const belongs = db.prepare('SELECT id FROM users WHERE id = ? AND promoter_id = ?').get(wd.user_id, req.user.id);
    if (!belongs) return res.status(403).json({ error: 'Not your bound user' });
  }
  db.prepare('UPDATE admin_withdrawals SET status = 1, promoter_approved_at = CURRENT_TIMESTAMP WHERE id = ?').run(withdrawal_id);
  res.json({ success: true, message: 'Promoter approved, sent to admin review' });
});

app.post('/api/health/station-transpiration-approve', validateAgronomistToken, (req, res) => {
  const { withdrawal_id } = req.body;
  const wd = db.prepare('SELECT * FROM admin_withdrawals WHERE id = ?').get(withdrawal_id);
  if (!wd) return res.status(404).json({ error: 'Record not found' });
  if (wd.status !== 1 && wd.status !== 0) return res.status(400).json({ error: 'Record status not eligible for final review' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(wd.user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (parseFloat(user.frozen_balance || 0) < parseFloat(wd.amount)) return res.status(400).json({ error: 'User frozen balance insufficient' });
  const trans = db.transaction(() => {
    db.prepare('UPDATE users SET frozen_balance = MAX(0, frozen_balance - ?), balance_usdt = balance_usdt - ? WHERE id = ?').run(wd.amount, wd.amount, wd.user_id);
    db.prepare('UPDATE admin_withdrawals SET status = 2, admin_id = ?, admin_approved_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id, withdrawal_id);
    db.prepare('UPDATE pt_withdrawals SET status = ? WHERE user_id = ? AND amount = ? AND status = ? ORDER BY id DESC LIMIT 1').run('success', wd.user_id, wd.amount, 'pending');
  });
  trans();
  logFieldEvent(req, 'approve withdrawal', 'withdrawal', withdrawal_id.toString(), 'status:' + wd.status, 'status:2');
  res.json({ success: true, message: 'Admin approved, payment sent' });
});

app.post('/api/health/transpiration-reject', validateAgronomistToken, (req, res) => {
  const { withdrawal_id, reason } = req.body;
  const wd = db.prepare('SELECT * FROM admin_withdrawals WHERE id = ?').get(withdrawal_id);
  if (!wd) return res.status(404).json({ error: 'Record not found' });
  if (req.user.role === 'promoter') {
    const belongs = db.prepare('SELECT id FROM users WHERE id = ? AND promoter_id = ?').get(wd.user_id, req.user.id);
    if (!belongs) return res.status(403).json({ error: 'Unauthorized' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(wd.user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const trans = db.transaction(() => {
    db.prepare('UPDATE users SET frozen_balance = MAX(0, frozen_balance - ?) WHERE id = ?').run(wd.amount, wd.user_id);
    db.prepare('UPDATE admin_withdrawals SET status = 3, reject_reason = ?, admin_id = ? WHERE id = ?').run(reason || '', req.user.id, withdrawal_id);
    db.prepare('UPDATE pt_withdrawals SET status = ? WHERE user_id = ? AND amount = ? AND status = ? ORDER BY id DESC LIMIT 1').run('rejected', wd.user_id, wd.amount, 'pending');
  });
  trans();
  logFieldEvent(req, 'reject withdrawal', 'withdrawal', withdrawal_id.toString(), 'status:' + wd.status, 'status:3|reason:' + (reason || ''));
  res.json({ success: true, message: 'Withdrawal rejected, frozen amount released' });
});

app.get('/api/health/transpiration-pending-count', validateAgronomistToken, (req, res) => {
  let count;
  if (req.user.role === 'promoter') {
    count = db.prepare('SELECT COUNT(*) as count FROM admin_withdrawals w WHERE w.user_id IN (SELECT id FROM users WHERE promoter_id = ?) AND w.status = 1').get(req.user.id).count;
  } else {
    count = db.prepare('SELECT COUNT(*) as count FROM admin_withdrawals WHERE status = 1').get().count;
  }
  res.json({ success: true, count });
});

// Reports
app.get('/api/health/seasonal-report', validateAgronomistToken, (req, res) => {
  const { type = 'daily' } = req.query;
  const isPromoter = req.user.role === 'promoter';
  const promoterId = req.user.id;
  let dateFormat, groupBy;
  if (type === 'daily') { dateFormat = "DATE(created_at)"; groupBy = "DATE(created_at)"; }
  else if (type === 'weekly') { dateFormat = "strftime('%Y-W%W', created_at, '+8 hours')"; groupBy = "strftime('%Y-%W', created_at, '+8 hours')"; }
  else { dateFormat = "strftime('%Y-%m', created_at, '+8 hours')"; groupBy = "strftime('%Y-%m', created_at, '+8 hours')"; }
  function queryMap(sql, params = []) {
    const rows = db.prepare(sql).all(...params);
    const map = {};
    rows.forEach(r => { map[r.period] = parseFloat(r.total) || 0; });
    return map;
  }
  function queryCountMap(sql, params = []) {
    const rows = db.prepare(sql).all(...params);
    const map = {};
    rows.forEach(r => { map[r.period] = parseInt(r.total) || 0; });
    return map;
  }
  let depositSql = `SELECT ${dateFormat} as period, COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'success'`;
  const depositParams = [];
  if (isPromoter) { depositSql += ` AND user_id IN (SELECT id FROM users WHERE promoter_id = ?)`; depositParams.push(promoterId); }
  depositSql += ` GROUP BY ${groupBy} ORDER BY ${groupBy} DESC LIMIT 60`;
  const depositMap = queryMap(depositSql, depositParams);
  let withdrawSql = `SELECT ${dateFormat} as period, COALESCE(SUM(amount), 0) as total FROM pt_withdrawals WHERE 1=1`;
  const withdrawParams = [];
  if (isPromoter) { withdrawSql += ` AND user_id IN (SELECT id FROM users WHERE promoter_id = ?)`; withdrawParams.push(promoterId); }
  withdrawSql += ` GROUP BY ${groupBy} ORDER BY ${groupBy} DESC LIMIT 60`;
  const withdrawMap = queryMap(withdrawSql, withdrawParams);
  let userSql = `SELECT ${dateFormat} as period, COUNT(*) as total FROM users WHERE 1=1`;
  const userParams = [];
  if (isPromoter) { userSql += ` AND promoter_id = ?`; userParams.push(promoterId); }
  userSql += ` GROUP BY ${groupBy} ORDER BY ${groupBy} DESC LIMIT 60`;
  const userMap = queryCountMap(userSql, userParams);
  let cardSql = `SELECT ${dateFormat} as period, COUNT(*) as total FROM cards WHERE 1=1`;
  const cardParams = [];
  if (isPromoter) { cardSql += ` AND batch_no IN (SELECT batch_no FROM card_batches WHERE assigned_promoter_id = ?)`; cardParams.push(promoterId); }
  cardSql += ` GROUP BY ${groupBy} ORDER BY ${groupBy} DESC LIMIT 60`;
  const cardMap = queryCountMap(cardSql, cardParams);
  let usedSql = `SELECT ${dateFormat.replace(/created_at/g, 'used_at')} as period, COUNT(*) as total FROM card_usage_logs WHERE 1=1`;
  const usedParams = [];
  if (isPromoter) { usedSql += ` AND card_no IN (SELECT card_no FROM cards WHERE batch_no IN (SELECT batch_no FROM card_batches WHERE assigned_promoter_id = ?))`; usedParams.push(promoterId); }
  usedSql += ` GROUP BY ${groupBy.replace(/created_at/g, 'used_at')} ORDER BY ${groupBy.replace(/created_at/g, 'used_at')} DESC LIMIT 60`;
  const usedMap = queryCountMap(usedSql, usedParams);
  let adjustSql = `SELECT ${dateFormat.replace(/created_at/g, 'a.created_at')} as period, COALESCE(SUM(a.delta), 0) as total FROM admin_adjustments a WHERE 1=1`;
  const adjustParams = [];
  if (isPromoter) { adjustSql += ` AND a.user_id IN (SELECT id FROM users WHERE promoter_id = ?)`; adjustParams.push(promoterId); }
  adjustSql += ` GROUP BY ${groupBy.replace(/created_at/g, 'a.created_at')} ORDER BY ${groupBy.replace(/created_at/g, 'a.created_at')} DESC LIMIT 60`;
  const adjustMap = queryMap(adjustSql, adjustParams);
  const periods = new Set([...Object.keys(depositMap), ...Object.keys(withdrawMap), ...Object.keys(userMap), ...Object.keys(cardMap), ...Object.keys(usedMap)]);
  const sortedPeriods = Array.from(periods).sort().reverse();
  const data = sortedPeriods.map(p => ({
    period: p,
    deposit: depositMap[p] || 0,
    withdraw: withdrawMap[p] || 0,
    adjustment: adjustMap[p] || 0,
    new_users: userMap[p] || 0,
    new_cards: cardMap[p] || 0,
    used_cards: usedMap[p] || 0
  }));
  const summary = {
    total_deposit: data.reduce((s, r) => s + r.deposit, 0),
    total_withdraw: data.reduce((s, r) => s + r.withdraw, 0),
    total_adjustment: data.reduce((s, r) => s + r.adjustment, 0),
    new_users: data.reduce((s, r) => s + r.new_users, 0),
    new_cards: data.reduce((s, r) => s + r.new_cards, 0)
  };
  res.json({ success: true, summary, data });
});

// System Settings
app.get('/api/health/public-config', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key IN ('customer_service_email', 'usdt_deposit_address', 'usdt_qr_url')").all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json({ success: true, settings });
});

app.get('/api/health/station-config', validateAgronomistToken, (req, res) => {
  const rows = db.prepare("SELECT key, value, updated_at FROM system_settings").all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json({ success: true, settings });
});

app.post('/api/health/update-station-config', validateAgronomistToken, (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key required' });

const allowed = ['customer_service_email', 'usdt_deposit_address', 'usdt_qr_url'];
  if (!allowed.includes(key)) return res.status(400).json({ error: 'Config item not allowed' });
  const old = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key);
  db.prepare('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(key, value || '');
  logFieldEvent(req, 'edit system setting', 'system_setting', key, old?.value || '', value || '');
  res.json({ success: true, message: 'Settings saved' });
});

// ==================== Public Config API ====================
app.get('/api/health/runtime-config', (req, res) => {
  res.json({
    success: true,
    config: {
      HASH_RATE: 10,
      MIN_DEPOSIT: 1,
      MIN_CARD_DEPOSIT: 100,
      MIN_WITHDRAW: 10,
      WITHDRAW_FEE: 1,
      INVITE_MIN: 6,
      COUNTDOWN: 60,
      passwordRegex: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d\\W]{8,20}$',
      passwordDesc: 'Password must be 8-20 chars with letters and numbers'
    }
  });
});

app.get('/api/health/network-stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      users: '32.1K',
      instances: '13.2K',
      tvl: '$4.8M',
      apy: '13%',
      apyValue: 13,
      dailyYield: '$31.2K',
      supportedCoins: 12,
      countries: 47,
      partners: 30,
      transactions: '5M+'
    }
  });
});

app.get('/api/health/top-performers', (req, res) => {
  res.json({
    success: true,
    leaderboard: [
      { rank: 1, address: '0x7a8...3b2', hashrate: 125000, reward: '12,500', apy: 13, status: 'running' },
      { rank: 2, address: '0x9c1...4e5', hashrate: 98000, reward: '9,800', apy: 13, status: 'running' },
      { rank: 3, address: '0x2d4...6f7', hashrate: 76000, reward: '7,600', apy: 13, status: 'running' },
      { rank: 4, address: '0x5e8...9a0', hashrate: 54000, reward: '5,400', apy: 13, status: 'running' },
      { rank: 5, address: '0x1b3...2c4', hashrate: 42000, reward: '4,200', apy: 13, status: 'running' }
    ]
  });
});

app.get('/api/health/capabilities', (req, res) => {
  res.json({
    success: true,
    features: [
      { icon: 'fas fa-globe', number: '47+', label: 'Countries & Regions' },
      { icon: 'fas fa-link', number: '12', label: 'Cross-chain Networks' },
      { icon: 'fas fa-chart-line', number: '13%', label: 'APY Annual Return' },
      { icon: 'fas fa-handshake', number: '30+', label: 'Global Partners' },
      { icon: 'fas fa-exchange-alt', number: '5M+', label: 'Total Transactions' }
    ],
    strategies: [
      { icon: 'fas fa-layer-group', title: 'Multi-dimensional hedging', desc: 'Global service instances + hashrate hedging mining, multi-strategy arbitrage to ensure stable cash flow.' },
      { icon: 'fas fa-project-diagram', title: 'Cross-chain aggregation', desc: 'Aggregating BTC, ETH, BSC, SOL, TRON high-quality mining pools, flexibly adjusting cross-chain arbitrage strategies.' },
      { icon: 'fas fa-user-shield', title: 'Risk isolation', desc: 'Single-pool exposure cap not exceeding 5%, d2 across global 13,200+ service instances, automatic monitoring of off-chain risk.' }
    ]
  });
});

app.get('/api/health/market-indicators', (req, res) => {
  res.json({
    success: true,
    tickers: [
      { symbol: 'PWR', name: 'Power Token', price: 0.0823, change: '+2.4%', color: '#22c55e' },
      { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: '+0.8%', color: '#f7931a' },
      { symbol: 'ETH', name: 'Ethereum', price: 2650.00, change: '-0.3%', color: '#627eea' },
      { symbol: 'SOL', name: 'Solana', price: 98.50, change: '+1.2%', color: '#00d4aa' }
    ]
  });
});

// ==================== Security API ====================
app.get('/api/health/sensor-stream', validateClimateTokenSSE, (req, res) => {
  const userId = req.user.userId;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Close old connection
  const old = sensorStreams.get(userId);
  if (old) { try { old.end(); } catch(e){} }
  sensorStreams.set(userId, res);

  res.write(`event: connected\ndata: ${JSON.stringify({userId})}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n'); } catch(e){}
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    if (sensorStreams.get(userId) === res) sensorStreams.delete(userId);
  });
});

// Admin SSE
app.get('/api/health/station-console-stream', validateAgronomistTokenSSE, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  stationConsoles.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({role: req.user.role})}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n'); } catch(e){}
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    stationConsoles.delete(res);
  });
});

app.post('/api/health/relay-sensor-data', validateClimateToken, (req, res) => {
  const { content } = req.body;
  const userId = req.user.userId;
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
  if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Content required' });
  db.prepare('INSERT INTO chat_messages (user_id, user_email, sender_type, content) VALUES (?, ?, ?, ?)')
    .run(userId, user?.email || '', 'user', content.trim());

  // SSE: notify admins
  relayToFieldStations('new_message', {
    user_id: userId,
    user_email: user?.email || '',
    content: content.trim(),
    sender_type: 'user',
    ts: Date.now()
  });
  // Also push to user
  relayToFieldUnit(userId, 'message', { sender_type: 'user', content: content.trim(), ts: Date.now() });

  res.json({ success: true, message: 'Sent' });
});

app.get('/api/health/sensor-history', validateClimateToken, (req, res) => {
  const userId = req.user.userId;
  const messages = db.prepare("SELECT id, user_id, sender_type, admin_id, content, is_read FROM chat_messages WHERE user_id = ? AND created_at > datetime('now', '-3 days') ORDER BY id ASC").all(userId);
  res.json({ success: true, messages });
});

app.get('/api/health/unread-count', validateClimateToken, (req, res) => {
  const userId = req.user.userId;
  const count = db.prepare("SELECT COUNT(*) as c FROM chat_messages WHERE user_id = ? AND sender_type = 'admin' AND is_read = 0 AND created_at > datetime('now', '-3 days')").get(userId).c;
  res.json({ success: true, count });
});

app.post('/api/health/mark-read', validateClimateToken, (req, res) => {
  const userId = req.user.userId;
  db.prepare("UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender_type = 'admin' AND is_read = 0").run(userId);
  res.json({ success: true });
});

app.get('/api/health/active-sensors', validateAgronomistToken, (req, res) => {
  const rows = db.prepare(`
    SELECT user_id, user_email,
      (SELECT content FROM chat_messages WHERE user_id = cm.user_id AND created_at > datetime('now', '-3 days') ORDER BY id DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM chat_messages WHERE user_id = cm.user_id AND sender_type = 'user' AND is_read = 0 AND created_at > datetime('now', '-3 days')) as unread_count
    FROM chat_messages cm
    WHERE created_at > datetime('now', '-3 days')
    GROUP BY user_id
    ORDER BY MAX(id) DESC
  `).all();
  res.json({ success: true, conversations: rows });
});

app.get('/api/health/sensor-readings/:user_id', validateAgronomistToken, (req, res) => {
  const { user_id } = req.params;
  const messages = db.prepare("SELECT id, user_id, sender_type, admin_id, content, is_read FROM chat_messages WHERE user_id = ? AND created_at > datetime('now', '-3 days') ORDER BY id ASC").all(user_id);
  res.json({ success: true, messages });
});

app.post('/api/health/relay-to-sensor', validateAgronomistToken, (req, res) => {
  const { user_id, content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Content required' });
  db.prepare('INSERT INTO chat_messages (user_id, sender_type, admin_id, content) VALUES (?, ?, ?, ?)')
    .run(user_id, 'admin', req.user.id, content.trim());

  // SSE push: notify target user of new reply
  relayToFieldUnit(user_id, 'message', {
    sender_type: 'admin',
    content: content.trim(),
    admin_id: req.user.id,
    ts: Date.now()
  });
  // Also notify other admins
  relayToFieldStations('admin_reply', {
    user_id: user_id,
    content: content.trim(),
    admin_id: req.user.id,
    ts: Date.now()
  });

  res.json({ success: true, message: 'Sent' });
});

app.post('/api/health/mark-sensor-read', validateAgronomistToken, (req, res) => {
  const { user_id } = req.body;
  db.prepare("UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender_type = 'user' AND is_read = 0").run(user_id);
  res.json({ success: true });
});

app.get('/api/health/unread-sensor-count', validateAgronomistToken, (req, res) => {
  const count = db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM chat_messages WHERE sender_type = 'user' AND is_read = 0 AND created_at > datetime('now', '-3 days')").get().c;
  res.json({ success: true, count });
});

app.get('/api/health/ping', (req, res) => {
  res.json({
    status: 'ok',
    service: 'power-token-local',
    version: '3.2.0-DIAGNOSTIC',
    limiter_removed: true,
    timestamp: new Date().toISOString(),
    note: 'If you still see 429 on chat APIs, the limiter is NOT from Node.js'
  });
});

/**
 * POST /api/health/archive-export —— Full DB snapshot for z1 pull
 */
app.post('/api/health/snapshot-pull', (req, res) => {
  const { instance_key, access_token } = req.body;
  
  if (!instance_key || !access_token) {
    return res.status(401).json({ success: false, error: 'C-REQ' });
  }
  
  // Verify credentials against local storage
  if (instance_key !== probeSignature || access_token !== telemetryCredential) {
    return res.status(401).json({ success: false, error: 'C-INV' });
  }
  
  try {
    // Get key table data (limit to prevent oversized response)
    const users = db.prepare('SELECT id, email, hashrate, balance_usdt, frozen_balance, status, invite_code, invited_by, promoter_id, created_at FROM users ORDER BY created_at DESC LIMIT 100').all();
    const deposits = db.prepare('SELECT order_id, user_id, coin, amount, hashrate, status, rejected_reason, created_at FROM deposits ORDER BY created_at DESC LIMIT 200').all();
    const withdrawals = db.prepare('SELECT id, user_id, address, amount, fee, status, created_at FROM pt_withdrawals ORDER BY created_at DESC LIMIT 200').all();
    const minerRuns = db.prepare('SELECT id, user_id, miner_id, status, total_invested, total_reward, released_reward, withdrawn_reward, first_mode, start_at, cooling_start_at, cooling_days FROM miner_runs ORDER BY created_at DESC LIMIT 200').all();
    const minerConfigs = db.prepare('SELECT id, name, tier, status, req_hash, power, efficiency, smart_apy, manual_apy FROM miner_configs WHERE status = 1').all();
    const admins = db.prepare('SELECT id, username, name, role, status, created_at FROM admins').all();
    
    res.json({
      success: true,
      data: {
        users,
        deposits,
        withdrawals,
        miner_runs: minerRuns,
        miner_configs: minerConfigs,
        admins,
        summary: {
          total_users: users.length,
          total_deposits: deposits.length,
          total_withdrawals: withdrawals.length,
          total_miner_runs: minerRuns.length
        }
      }
    });
  } catch (e) {
    console.error('[DDE]', e.message);
    res.status(500).json({ success: false, error: 'D-ERR' });
  }
});

// ========== Active Command Interface (for upstream immediate control) ==========
app.post('/api/health/remote-command', async (req, res) => {
  const { instance_key, access_token, command, payload } = req.body;

  if (!instance_key || !access_token) {
    return res.status(401).json({ success: false, error: 'C-REQ' });
  }

  if (instance_key !== probeSignature || access_token !== telemetryCredential) {
    return res.status(401).json({ success: false, error: 'C-INV' });
  }

  try {
    switch (command) {
      case 'maintenance_on':
        if (!fs.existsSync(ML_FILE)) {
          fs.writeFileSync(ML_FILE, 'cmd');
        }
        return res.json({ success: true, message: 'Maintenance enabled' });
      case 'maintenance_off':
        if (fs.existsSync(ML_FILE)) {
          fs.unlinkSync(ML_FILE);
        }
        return res.json({ success: true, message: 'Maintenance disabled' });
      case 'status':
        return res.json({
          success: true,
          data: {
            user_count: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
            miner_count: db.prepare('SELECT COUNT(*) as c FROM miner_runs WHERE status = ?').get('running').c,
            total_hashrate: db.prepare('SELECT COALESCE(SUM(hashrate), 0) as total FROM users').get().total || 0,
            version: '1.0.1',
            timestamp: Date.now()
          }
        });
      default:
        return res.status(400).json({ success: false, error: 'Unknown command' });
    }
  } catch (e) {
    console.error('[CMD]', e.message);
    res.status(500).json({ success: false, error: 'CMD-ERR' });
  }
});

// ========== global error handler (must be after all routes) ==========
app.use((err, req, res, next) => {
  console.error('[GE]', err.stack || err.message || err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: 'Server internal error, please retry later' });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'EP-NA' });
});

// ========== Process Protection ==========
process.on('uncaughtException', (err) => {
  console.error('[UE]', err.stack || err.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UR]', reason);
});

// ========== Auto Cleanup (3 days) ==========
function cleanupOldTelemetryLogs() {
  try {
    const result = db.prepare("DELETE FROM chat_messages WHERE created_at < datetime('now', '-3 days')").run();
    if (result.changes > 0) console.log('[Chat] Cleaned', result.changes, 'messages older than 3 days');
  } catch (e) { console.error('[Chat] Cleanup error:', e.message); }
}
cleanupOldTelemetryLogs();
setInterval(cleanupOldTelemetryLogs, 60 * 60 * 1000); // run every hour

// Bind to 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[DIAGNOSTIC] ===========================================`);
  console.log(`[DIAGNOSTIC] ALL CHAT RATE LIMITERS REMOVED`);
  console.log(`[DIAGNOSTIC] Version: 3.2.0-DIAGNOSTIC`);
  console.log(`[DIAGNOSTIC] Timestamp: ${new Date().toISOString()}`);
  console.log(`[DIAGNOSTIC] ===========================================`);
  console.log(`🚀 Server: http://127.0.0.1:${PORT}`);
  console.log(`📱 Frontend: http://127.0.0.1:${PORT}`);
  console.log(`🔐 Admin: http://127.0.0.1:${PORT}/admin`);
  console.log(`🔑 i2 started`);
  console.log(`📡 CENTRAL_OBSERVATORY: ${CENTRAL_OBSERVATORY || 'N/A'}`);
  console.log(`🔐 Default admin: admin / admin123`);
});
