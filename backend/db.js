const Database = require('better-sqlite3');
const path = require('path');
const logger = require('./logger');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'streamline.db');

let db;

function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

async function initDB() {
  const fs = require('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('secure_delete = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('movie', 'series')),
      title TEXT NOT NULL,
      original_title TEXT,
      tmdb_id INTEGER,
      imdb_id TEXT,
      year INTEGER,
      status TEXT DEFAULT 'wanted' CHECK(status IN ('wanted', 'downloading', 'downloaded', 'missing')),
      monitored INTEGER DEFAULT 1,
      quality_profile TEXT DEFAULT '1080p',
      path TEXT,
      poster_url TEXT,
      backdrop_url TEXT,
      overview TEXT,
      genres TEXT,
      rating REAL,
      last_monitored_at DATETIME,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
      season_number INTEGER NOT NULL,
      episode_number INTEGER NOT NULL,
      absolute_number INTEGER,
      title TEXT,
      overview TEXT,
      air_date TEXT,
      status TEXT DEFAULT 'wanted' CHECK(status IN ('wanted', 'downloading', 'downloaded', 'missing', 'unaired')),
      monitored INTEGER DEFAULT 1,
      file_path TEXT,
      UNIQUE(series_id, season_number, episode_number)
    );

    CREATE TABLE IF NOT EXISTS download_queue (
      id TEXT PRIMARY KEY,
      media_id TEXT REFERENCES media_items(id) ON DELETE SET NULL,
      episode_id TEXT REFERENCES episodes(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('sabnzbd', 'torrent')),
      source_id TEXT,
      status TEXT DEFAULT 'queued' CHECK(status IN ('queued', 'downloading', 'completed', 'failed', 'paused')),
      progress REAL DEFAULT 0,
      size_bytes INTEGER,
      speed_bytes INTEGER,
      eta_seconds INTEGER,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS indexers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('newznab', 'torznab', 'torrent_api')),
      url TEXT NOT NULL,
      api_key TEXT,
      enabled INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 1,
      categories TEXT,
      test_status TEXT,
      last_tested_at DATETIME,
      supports_search INTEGER DEFAULT 1,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ── NEW: Monitoring & Activity ────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS monitor_jobs (
      id TEXT PRIMARY KEY,
      media_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
      episode_id TEXT REFERENCES episodes(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'searching', 'found', 'grabbed', 'skipped', 'failed')),
      last_searched_at DATETIME,
      next_search_at DATETIME,
      search_count INTEGER DEFAULT 0,
      found_release TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('search', 'grab', 'upgrade', 'import', 'error', 'info', 'warning')),
      media_id TEXT REFERENCES media_items(id) ON DELETE SET NULL,
      episode_id TEXT REFERENCES episodes(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS indexer_stats (
      indexer_id TEXT PRIMARY KEY REFERENCES indexers(id) ON DELETE CASCADE,
      total_queries INTEGER DEFAULT 0,
      successful_queries INTEGER DEFAULT 0,
      failed_queries INTEGER DEFAULT 0,
      last_queried_at DATETIME,
      last_error TEXT,
      avg_response_ms INTEGER DEFAULT 0
    );
  `);

  // ── Safe migrations for existing databases ──────────────────────────────────
  const safeAlter = (sql) => {
    try { db.prepare(sql).run(); } catch (_) { /* column already exists — OK */ }
  };
  [
    'ALTER TABLE media_items ADD COLUMN monitored INTEGER DEFAULT 1',
    'ALTER TABLE media_items ADD COLUMN original_title TEXT',
    'ALTER TABLE media_items ADD COLUMN last_monitored_at DATETIME',
    'ALTER TABLE episodes ADD COLUMN monitored INTEGER DEFAULT 1',
    'ALTER TABLE episodes ADD COLUMN absolute_number INTEGER',
    'ALTER TABLE episodes ADD COLUMN overview TEXT',
    'ALTER TABLE indexers ADD COLUMN categories TEXT',
    'ALTER TABLE indexers ADD COLUMN test_status TEXT',
    'ALTER TABLE indexers ADD COLUMN last_tested_at DATETIME',
    'ALTER TABLE indexers ADD COLUMN supports_search INTEGER DEFAULT 1',
  ].forEach(safeAlter);

  // ── Default settings ─────────────────────────────────────────────────────────
  const defaultSettings = [
    ['tmdb_api_key', ''],
    ['download_path_movies', '/downloads/movies'],
    ['download_path_series', '/downloads/series'],
    ['quality_profiles', JSON.stringify(['720p', '1080p', '2160p', 'Any'])],
    ['setup_complete', 'false'],
    // Monitoring
    ['monitor_interval_minutes', '60'],
    ['monitor_enabled', 'true'],
    ['quality_upgrade_enabled', 'true'],
    ['quality_upgrade_cutoff', '1080p'],
    ['failed_retry_count', '3'],
    ['failed_retry_delay_hours', '6'],
    // Integrations
    ['plex_url', ''],
    ['plex_token', ''],
    ['jellyfin_url', ''],
    ['jellyfin_api_key', ''],
    ['webhook_url', ''],
    ['pushover_user_key', ''],
    ['pushover_api_token', ''],
    ['qbittorrent_url', ''],
    ['qbittorrent_username', ''],
    ['qbittorrent_password', ''],
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  logger.info('Database initialized', { path: DB_PATH });
}

module.exports = { getDB, initDB };
