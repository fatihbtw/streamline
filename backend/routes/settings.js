const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { getDB } = require('../db');
const logger = require('../logger');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/settings ─────────────────────────────────────────────────────────
router.get('/', requireAdmin, (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const { key, value } of rows) {
    // Don't expose raw API keys in listing - mask them
    if (['sabnzbd_api_key', 'tmdb_api_key', 'plex_token', 'jellyfin_api_key',
         'pushover_api_token', 'qbittorrent_password'].includes(key)) {
      settings[key] = value ? '••••••••' : '';
      settings[`${key}_set`] = !!value;
    } else {
      settings[key] = value;
    }
  }
  res.json(settings);
});

// ── PATCH /api/settings — update one or more settings ────────────────────────
router.patch('/', requireAdmin,
  body('key').optional().isString(),
  body('value').optional(),
  (req, res) => {
    const db = getDB();
    const allowed = [
      'tmdb_api_key', 'sabnzbd_url', 'sabnzbd_api_key',
      'download_path_movies', 'download_path_series',
      'monitor_interval_minutes', 'monitor_enabled',
      'quality_upgrade_enabled', 'quality_upgrade_cutoff',
      'failed_retry_count', 'failed_retry_delay_hours',
      'plex_url', 'plex_token',
      'jellyfin_url', 'jellyfin_api_key',
      'webhook_url', 'pushover_user_key', 'pushover_api_token',
      'qbittorrent_url', 'qbittorrent_username', 'qbittorrent_password',
      'allowed_origins',
    ];
    const update = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)");

    // Support both {key,value} and bulk {key1:val1, key2:val2}
    if (req.body.key && req.body.value !== undefined) {
      if (!allowed.includes(req.body.key)) return res.status(400).json({ error: 'Unknown setting key' });
      update.run(req.body.key, String(req.body.value));
    } else {
      for (const [k, v] of Object.entries(req.body)) {
        if (allowed.includes(k)) update.run(k, String(v));
      }
    }

    logger.info('Settings updated', { user: req.user.username, keys: Object.keys(req.body) });
    res.json({ success: true });
  }
);

// ── GET /api/settings/indexers ────────────────────────────────────────────────
router.get('/indexers', requireAdmin, (req, res) => {
  const db = getDB();
  const indexers = db.prepare(`
    SELECT i.id, i.name, i.type, i.url, i.enabled, i.priority,
           i.categories, i.test_status, i.last_tested_at, i.supports_search,
           i.added_at,
           COALESCE(s.total_queries, 0) as total_queries,
           COALESCE(s.successful_queries, 0) as successful_queries,
           COALESCE(s.avg_response_ms, 0) as avg_response_ms,
           s.last_queried_at
    FROM indexers i
    LEFT JOIN indexer_stats s ON s.indexer_id = i.id
    ORDER BY i.priority DESC, i.added_at
  `).all();
  res.json(indexers);
});

// ── POST /api/settings/indexers ───────────────────────────────────────────────
router.post('/indexers', requireAdmin,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('type').isIn(['newznab', 'torznab', 'torrent_api']),
  body('url').trim().isURL(),
  body('api_key').optional().trim(),
  body('priority').optional().isInt({ min: 1, max: 100 }),
  body('categories').optional().trim(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const { name, type, url, api_key = '', priority = 25, categories = '' } = req.body;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO indexers (id, name, type, url, api_key, priority, categories)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type, url.replace(/\/$/, ''), api_key, priority, categories);

    // Init stats row
    db.prepare('INSERT OR IGNORE INTO indexer_stats (indexer_id) VALUES (?)').run(id);

    logger.info('Indexer added', { name, type, user: req.user.username });
    res.status(201).json({ id, message: 'Indexer hinzugefügt' });
  }
);

// ── PATCH /api/settings/indexers/:id — update indexer ────────────────────────
router.patch('/indexers/:id', requireAdmin,
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('url').optional().trim().isURL(),
  body('api_key').optional().trim(),
  body('priority').optional().isInt({ min: 1, max: 100 }),
  body('enabled').optional().isBoolean(),
  body('categories').optional().trim(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const allowed = ['name', 'url', 'api_key', 'priority', 'enabled', 'categories'];
    const updates = [];
    const values = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(field === 'enabled' ? (req.body[field] ? 1 : 0) : req.body[field]);
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id);
    const result = db.prepare(`UPDATE indexers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    if (result.changes === 0) return res.status(404).json({ error: 'Indexer not found' });

    res.json({ success: true });
  }
);

// ── DELETE /api/settings/indexers/:id ────────────────────────────────────────
router.delete('/indexers/:id', requireAdmin, param('id').isUUID(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const result = db.prepare('DELETE FROM indexers WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Indexer not found' });
  res.json({ success: true });
});

// ── POST /api/settings/indexers/:id/test ─────────────────────────────────────
router.post('/indexers/:id/test', requireAdmin, param('id').isUUID(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const indexer = db.prepare('SELECT * FROM indexers WHERE id = ?').get(req.params.id);
  if (!indexer) return res.status(404).json({ error: 'Indexer not found' });

  const startTime = Date.now();
  try {
    const response = await axios.get(`${indexer.url}/api`, {
      params: { t: 'caps', apikey: indexer.api_key || '', output: 'json' },
      timeout: 8000,
    });
    const elapsed = Date.now() - startTime;

    db.prepare(`
      UPDATE indexers SET test_status = 'ok', last_tested_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(indexer.id);

    res.json({
      success: true,
      message: `Verbindung erfolgreich (${elapsed}ms)`,
      response_ms: elapsed,
      caps: response.data?.caps || null,
    });
  } catch (err) {
    db.prepare(`
      UPDATE indexers SET test_status = 'failed', last_tested_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(indexer.id);

    const status = err.response?.status || 0;
    res.status(400).json({
      success: false,
      message: `Verbindung fehlgeschlagen: ${err.message}`,
      http_status: status,
    });
  }
});

// ── POST /api/settings/test-connection ───────────────────────────────────────
router.post('/test-connection', requireAdmin,
  body('type').isIn(['sabnzbd', 'qbittorrent', 'plex', 'jellyfin']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const { type } = req.body;

    try {
      if (type === 'sabnzbd') {
        const url = req.body.url || db.prepare("SELECT value FROM settings WHERE key = 'sabnzbd_url'").get()?.value;
        const key = req.body.api_key || db.prepare("SELECT value FROM settings WHERE key = 'sabnzbd_api_key'").get()?.value;
        if (!url || !key) return res.status(400).json({ error: 'URL and API key required' });
        const r = await axios.get(`${url}/api`, { params: { mode: 'version', apikey: key, output: 'json' }, timeout: 6000 });
        res.json({ success: true, message: `SABnzbd v${r.data?.version || '?'} — Verbindung OK` });

      } else if (type === 'qbittorrent') {
        const url = req.body.url || db.prepare("SELECT value FROM settings WHERE key = 'qbittorrent_url'").get()?.value;
        if (!url) return res.status(400).json({ error: 'URL required' });
        const r = await axios.get(`${url}/api/v2/app/version`, { timeout: 6000 });
        res.json({ success: true, message: `qBittorrent v${r.data || '?'} — Verbindung OK` });

      } else if (type === 'plex') {
        const url = req.body.url || db.prepare("SELECT value FROM settings WHERE key = 'plex_url'").get()?.value;
        const token = req.body.token || db.prepare("SELECT value FROM settings WHERE key = 'plex_token'").get()?.value;
        if (!url) return res.status(400).json({ error: 'URL required' });
        await axios.get(`${url}/identity`, {
          headers: token ? { 'X-Plex-Token': token } : {},
          timeout: 6000,
        });
        res.json({ success: true, message: 'Plex — Verbindung OK' });

      } else if (type === 'jellyfin') {
        const url = req.body.url || db.prepare("SELECT value FROM settings WHERE key = 'jellyfin_url'").get()?.value;
        if (!url) return res.status(400).json({ error: 'URL required' });
        const r = await axios.get(`${url}/System/Info/Public`, { timeout: 6000 });
        res.json({ success: true, message: `Jellyfin ${r.data?.Version || ''} — Verbindung OK` });
      }
    } catch (err) {
      res.status(400).json({ success: false, message: `Verbindungsfehler: ${err.message}` });
    }
  }
);

// ── GET /api/settings/meta-provider ──────────────────────────────────────────
router.get('/meta-provider', requireAdmin, (req, res) => {
  const db = getDB();
  const key = db.prepare("SELECT value FROM settings WHERE key = 'tmdb_api_key'").get();
  res.json({ provider: 'tmdb', configured: !!(key?.value) });
});

// ── GET /api/settings/custom-formats ─────────────────────────────────────────
router.get('/custom-formats', requireAdmin, (req, res) => {
  const db = getDB();
  const raw = db.prepare("SELECT value FROM settings WHERE key = 'custom_formats'").get();
  res.json(raw ? JSON.parse(raw.value) : []);
});

// ── POST /api/settings/custom-formats ────────────────────────────────────────
router.post('/custom-formats', requireAdmin,
  body('formats').isArray(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('custom_formats', ?)").run(JSON.stringify(req.body.formats));
    res.json({ success: true });
  }
);

// ── GET /api/settings/backup ──────────────────────────────────────────────────
router.get('/backup', requireAdmin, (req, res) => {
  const db = getDB();
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const indexers = db.prepare('SELECT id, name, type, url, enabled, priority, categories FROM indexers').all();
  const customFormats = db.prepare("SELECT value FROM settings WHERE key = 'custom_formats'").get();

  res.json({
    version: '2.0',
    exported_at: new Date().toISOString(),
    settings: Object.fromEntries(settings.map(s => [s.key, s.value])),
    indexers,
    custom_formats: customFormats ? JSON.parse(customFormats.value) : [],
  });
});

// ── POST /api/settings/restore ────────────────────────────────────────────────
router.post('/restore', requireAdmin,
  body('settings').optional().isObject(),
  body('indexers').optional().isArray(),
  async (req, res) => {
    const db = getDB();
    const backup = req.body;
    let restoredSettings = 0, restoredIndexers = 0;

    const sensitiveKeys = new Set(['password_hash', 'jwt_secret']);
    const allowedKeys = [
      'tmdb_api_key', 'sabnzbd_url', 'sabnzbd_api_key',
      'download_path_movies', 'download_path_series',
      'monitor_interval_minutes', 'monitor_enabled', 'quality_upgrade_enabled',
      'quality_upgrade_cutoff', 'failed_retry_count', 'failed_retry_delay_hours',
      'plex_url', 'plex_token', 'jellyfin_url', 'jellyfin_api_key',
      'webhook_url', 'pushover_user_key', 'pushover_api_token',
      'qbittorrent_url', 'qbittorrent_username', 'qbittorrent_password',
      'allowed_origins', 'custom_formats',
    ];

    if (backup.settings) {
      const update = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
      for (const [k, v] of Object.entries(backup.settings)) {
        if (allowedKeys.includes(k) && !sensitiveKeys.has(k)) {
          update.run(k, String(v));
          restoredSettings++;
        }
      }
    }

    if (Array.isArray(backup.indexers)) {
      db.prepare('DELETE FROM indexers').run();
      const stmt = db.prepare('INSERT OR IGNORE INTO indexers (id, name, type, url, enabled, priority, categories) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const idx of backup.indexers) {
        stmt.run(idx.id || uuidv4(), idx.name, idx.type, idx.url, idx.enabled ? 1 : 0, idx.priority || 25, idx.categories || '');
        restoredIndexers++;
      }
    }

    logger.info('Settings restored', { user: req.user.username, settings: restoredSettings, indexers: restoredIndexers });
    res.json({ success: true, message: `${restoredSettings} Einstellungen, ${restoredIndexers} Indexer wiederhergestellt` });
  }
);

// ── GET /api/settings/cors ────────────────────────────────────────────────────
router.get('/cors', requireAdmin, (req, res) => {
  const db = getDB();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'allowed_origins'").get();
  res.json({ origins: row?.value ? row.value.split(',').map(o => o.trim()) : [] });
});

router.post('/cors', requireAdmin, body('origins').isArray(), (req, res) => {
  const db = getDB();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('allowed_origins', ?)").run(req.body.origins.join(','));
  res.json({ success: true });
});

module.exports = router;
