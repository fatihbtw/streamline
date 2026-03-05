// db.js — ADD these migrations to the bottom of initDB(), before the closing logger.info line
// Copy/paste the db.exec block and the migration section below into your existing db.js

// ── NEW TABLES to add inside the db.exec(`...`) block ────────────────────────
//
// Paste these CREATE TABLE statements into your existing db.exec(`...`) in initDB():

const NEW_TABLES = `
  -- Monitoring jobs: one row per monitored media item
  CREATE TABLE IF NOT EXISTS monitor_jobs (
    id TEXT PRIMARY KEY,
    media_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'searching', 'found', 'grabbed', 'skipped', 'failed')),
    last_searched_at DATETIME,
    next_search_at DATETIME,
    search_count INTEGER DEFAULT 0,
    found_release TEXT,  -- JSON of the found NZB/torrent release
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Activity log: every automated action is recorded here  
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,  -- 'search', 'grab', 'upgrade', 'import', 'error', 'info'
    media_id TEXT REFERENCES media_items(id) ON DELETE SET NULL,
    episode_id TEXT REFERENCES episodes(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    details TEXT,  -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexer health/stats
  CREATE TABLE IF NOT EXISTS indexer_stats (
    indexer_id TEXT PRIMARY KEY REFERENCES indexers(id) ON DELETE CASCADE,
    total_queries INTEGER DEFAULT 0,
    successful_queries INTEGER DEFAULT 0,
    failed_queries INTEGER DEFAULT 0,
    last_queried_at DATETIME,
    last_error TEXT,
    avg_response_ms INTEGER DEFAULT 0
  );
`;

// ── SAFE MIGRATIONS — run after initDB to add new columns to existing tables ──
// These use try/catch so they won't fail on a fresh DB (column already exists from CREATE TABLE)

const MIGRATIONS = `
  ALTER TABLE media_items ADD COLUMN monitored INTEGER DEFAULT 1;
  ALTER TABLE media_items ADD COLUMN original_title TEXT;
  ALTER TABLE media_items ADD COLUMN last_monitored_at DATETIME;
  ALTER TABLE episodes ADD COLUMN monitored INTEGER DEFAULT 1;
  ALTER TABLE episodes ADD COLUMN absolute_number INTEGER;
  ALTER TABLE indexers ADD COLUMN categories TEXT;
  ALTER TABLE indexers ADD COLUMN test_status TEXT;
  ALTER TABLE indexers ADD COLUMN last_tested_at DATETIME;
  ALTER TABLE indexers ADD COLUMN supports_search INTEGER DEFAULT 1;
`;

// ── NEW DEFAULT SETTINGS to add to the defaultSettings array ─────────────────
const NEW_DEFAULT_SETTINGS = [
  ['monitor_interval_minutes', '60'],
  ['monitor_enabled', 'true'],
  ['quality_upgrade_enabled', 'true'],
  ['quality_upgrade_cutoff', '1080p'],
  ['failed_retry_count', '3'],
  ['failed_retry_delay_hours', '6'],
];

module.exports = { NEW_TABLES, MIGRATIONS, NEW_DEFAULT_SETTINGS };

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTIONS:
// 1. In your db.js, add NEW_TABLES content inside the existing db.exec(`...`)
// 2. After db.exec, add this migration loop:
//
//   const safeAlter = (sql) => { try { db.prepare(sql).run(); } catch(_) {} };
//   const migrations = [
//     "ALTER TABLE media_items ADD COLUMN monitored INTEGER DEFAULT 1",
//     "ALTER TABLE media_items ADD COLUMN original_title TEXT",
//     "ALTER TABLE media_items ADD COLUMN last_monitored_at DATETIME",
//     "ALTER TABLE episodes ADD COLUMN monitored INTEGER DEFAULT 1",
//     "ALTER TABLE episodes ADD COLUMN absolute_number INTEGER",
//     "ALTER TABLE indexers ADD COLUMN categories TEXT",
//     "ALTER TABLE indexers ADD COLUMN test_status TEXT",
//     "ALTER TABLE indexers ADD COLUMN last_tested_at DATETIME",
//     "ALTER TABLE indexers ADD COLUMN supports_search INTEGER DEFAULT 1",
//   ];
//   migrations.forEach(safeAlter);
//
// 3. Add NEW_DEFAULT_SETTINGS entries to the defaultSettings array
// ─────────────────────────────────────────────────────────────────────────────
