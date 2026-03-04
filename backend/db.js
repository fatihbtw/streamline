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
      tmdb_id INTEGER,
      imdb_id TEXT,
      year INTEGER,
      status TEXT DEFAULT 'wanted' CHECK(status IN ('wanted', 'downloading', 'downloaded', 'missing')),
      quality_profile TEXT DEFAULT '1080p',
      path TEXT,
      poster_url TEXT,
      backdrop_url TEXT,
      overview TEXT,
      genres TEXT,
      rating REAL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
      season_number INTEGER NOT NULL,
      episode_number INTEGER NOT NULL,
      title TEXT,
      air_date TEXT,
      status TEXT DEFAULT 'wanted' CHECK(status IN ('wanted', 'downloading', 'downloaded', 'missing', 'unaired')),
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
  `);

  // Insert default settings if not exist
  const defaultSettings = [
    ['tmdb_api_key', ''],
    ['download_path_movies', '/downloads/movies'],
    ['download_path_series', '/downloads/series'],
    ['quality_profiles', JSON.stringify(['720p', '1080p', '2160p', 'Any'])],
    ['setup_complete', 'false'],
  ];

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  logger.info('Database initialized', { path: DB_PATH });
}

module.exports = { getDB, initDB };
