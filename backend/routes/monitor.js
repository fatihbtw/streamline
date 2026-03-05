/**
 * routes/monitor.js
 * 
 * Endpoints:
 *   GET  /api/monitor/status          — current scheduler state + stats
 *   POST /api/monitor/trigger          — manual "Search All Now"
 *   POST /api/monitor/search/:id       — search for a specific item now
 *   GET  /api/monitor/activity         — activity log with pagination
 *   DELETE /api/monitor/activity       — clear activity log
 *   GET  /api/monitor/indexer-stats    — per-indexer query stats
 */

const express = require('express');
const { param, query } = require('express-validator');
const { getDB } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const {
  triggerNow, searchAndGrab, logActivity, runMonitorCycle
} = require('../monitor');
const logger = require('../logger');

const router = express.Router();

// ── Status ────────────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const db = getDB();

  const wantedMovies = db.prepare("SELECT COUNT(*) as c FROM media_items WHERE status='wanted' AND monitored=1 AND type='movie'").get().c;
  const wantedEpisodes = db.prepare("SELECT COUNT(*) as c FROM episodes WHERE status='wanted' AND monitored=1").get().c;
  const missingItems = db.prepare("SELECT COUNT(*) as c FROM media_items WHERE status='missing' AND monitored=1").get().c;
  const downloadingItems = db.prepare("SELECT COUNT(*) as c FROM media_items WHERE status='downloading'").get().c;
  const totalMonitored = db.prepare("SELECT COUNT(*) as c FROM media_items WHERE monitored=1").get().c;

  const lastActivity = db.prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 1").get();
  const intervalMinutes = db.prepare("SELECT value FROM settings WHERE key='monitor_interval_minutes'").get()?.value || '60';
  const enabled = db.prepare("SELECT value FROM settings WHERE key='monitor_enabled'").get()?.value === 'true';

  const todayGrabs = db.prepare(
    "SELECT COUNT(*) as c FROM activity_log WHERE type='grab' AND created_at >= date('now')"
  ).get().c;

  res.json({
    enabled,
    interval_minutes: parseInt(intervalMinutes),
    stats: {
      wanted_movies: wantedMovies,
      wanted_episodes: wantedEpisodes,
      missing: missingItems,
      downloading: downloadingItems,
      total_monitored: totalMonitored,
      grabs_today: todayGrabs,
    },
    last_activity: lastActivity || null,
  });
});

// ── Manual trigger — Search All Now ──────────────────────────────────────────
router.post('/trigger', requireAdmin, async (req, res) => {
  try {
    res.json({ success: true, message: 'Monitor-Zyklus gestartet...' });
    // Run async without blocking response
    setImmediate(async () => {
      try {
        await runMonitorCycle();
      } catch (err) {
        logger.error('Manual trigger failed', { error: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Search for specific media item ────────────────────────────────────────────
router.post('/search/:id', requireAdmin, async (req, res) => {
  const db = getDB();
  const item = db.prepare('SELECT * FROM media_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  res.json({ success: true, message: `Suche gestartet für "${item.title}"` });

  setImmediate(async () => {
    try {
      await searchAndGrab(item);
    } catch (err) {
      logActivity('error', `Manuelle Suche fehlgeschlagen: ${err.message}`, { mediaId: item.id });
    }
  });
});

// ── Update monitor settings ───────────────────────────────────────────────────
router.patch('/settings', requireAdmin, (req, res) => {
  const db = getDB();
  const allowed = ['monitor_enabled', 'monitor_interval_minutes', 'quality_upgrade_enabled',
                   'quality_upgrade_cutoff', 'failed_retry_count', 'failed_retry_delay_hours'];
  const update = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      update.run(key, String(req.body[key]));
    }
  }
  res.json({ success: true });
});

// ── Toggle monitored on a media item ─────────────────────────────────────────
router.patch('/toggle/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const item = db.prepare('SELECT id, monitored, title FROM media_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  const newValue = item.monitored ? 0 : 1;
  db.prepare('UPDATE media_items SET monitored = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(newValue, item.id);

  logger.info('Monitoring toggled', { id: item.id, title: item.title, monitored: newValue, user: req.user.username });
  res.json({ monitored: newValue === 1 });
});

// ── Activity log ──────────────────────────────────────────────────────────────
router.get('/activity', (req, res) => {
  const db = getDB();
  const page = Math.max(1, parseInt(req.query.page || '1'));
  const limit = Math.min(100, parseInt(req.query.limit || '50'));
  const offset = (page - 1) * limit;
  const type = req.query.type; // filter by type

  let sql = 'SELECT al.*, mi.title as media_title FROM activity_log al LEFT JOIN media_items mi ON mi.id = al.media_id';
  const params = [];

  if (type && ['search','grab','upgrade','import','error','info','warning'].includes(type)) {
    sql += ' WHERE al.type = ?';
    params.push(type);
  }

  sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const items = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM activity_log' + (type ? ' WHERE type = ?' : '')).get(...(type ? [type] : [])).c;

  res.json({ items, total, page, limit });
});

router.delete('/activity', requireAdmin, (req, res) => {
  const db = getDB();
  const older = req.query.older_than_days;
  if (older) {
    db.prepare("DELETE FROM activity_log WHERE created_at < datetime('now', ? || ' days')").run(`-${parseInt(older)}`);
  } else {
    db.prepare('DELETE FROM activity_log').run();
  }
  res.json({ success: true });
});

// ── Indexer stats ─────────────────────────────────────────────────────────────
router.get('/indexer-stats', (req, res) => {
  const db = getDB();
  const stats = db.prepare(`
    SELECT i.id, i.name, i.type, i.enabled, i.url, i.test_status, i.last_tested_at,
           COALESCE(s.total_queries, 0) as total_queries,
           COALESCE(s.successful_queries, 0) as successful_queries,
           COALESCE(s.failed_queries, 0) as failed_queries,
           COALESCE(s.avg_response_ms, 0) as avg_response_ms,
           s.last_queried_at, s.last_error
    FROM indexers i
    LEFT JOIN indexer_stats s ON s.indexer_id = i.id
    ORDER BY i.priority DESC
  `).all();

  res.json(stats);
});

module.exports = router;
