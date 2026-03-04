const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const logger = require('../logger');
const { notifyMediaAdded } = require('../notify');

const router = express.Router();

// GET /api/media — list all media items
router.get('/', (req, res) => {
  const db = getDB();
  const { type, status, search, page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));

  let sql = 'SELECT * FROM media_items WHERE 1=1';
  const params = [];

  if (type && ['movie', 'series'].includes(type)) {
    sql += ' AND type = ?'; params.push(type);
  }
  if (status && ['wanted', 'downloading', 'downloaded', 'missing'].includes(status)) {
    sql += ' AND status = ?'; params.push(status);
  }
  if (search) {
    sql += ' AND title LIKE ?'; params.push(`%${search.slice(0, 100)}%`);
  }

  sql += ' ORDER BY added_at DESC LIMIT ? OFFSET ?';
  params.push(Math.min(100, parseInt(limit)), offset);

  const items = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM media_items WHERE 1=1').get().c;

  res.json({ items, total, page: parseInt(page) });
});

// GET /api/media/:id
router.get('/:id', param('id').isUUID(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const item = db.prepare('SELECT * FROM media_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  if (item.type === 'series') {
    const episodes = db.prepare('SELECT * FROM episodes WHERE series_id = ? ORDER BY season_number, episode_number').all(item.id);
    return res.json({ ...item, episodes });
  }
  res.json(item);
});

// POST /api/media — add movie or series
router.post('/',
  body('type').isIn(['movie', 'series']),
  body('title').trim().isLength({ min: 1, max: 500 }),
  body('tmdb_id').optional().isInt({ min: 1 }),
  body('year').optional().isInt({ min: 1880, max: 2100 }),
  body('quality_profile').optional().isIn(['720p', '1080p', '2160p', 'Any']),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const { type, title, tmdb_id, imdb_id, year, quality_profile = '1080p',
            poster_url, backdrop_url, overview, genres, rating } = req.body;

    // Check duplicate
    if (tmdb_id) {
      const existing = db.prepare('SELECT id FROM media_items WHERE tmdb_id = ? AND type = ?').get(tmdb_id, type);
      if (existing) return res.status(409).json({ error: 'Already in library' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO media_items (id, type, title, tmdb_id, imdb_id, year, quality_profile,
        poster_url, backdrop_url, overview, genres, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, type, title, tmdb_id || null, imdb_id || null, year || null,
           quality_profile, poster_url || null, backdrop_url || null,
           overview || null, genres ? JSON.stringify(genres) : null, rating || null);

    logger.info('Media added', { type, title, tmdb_id, user: req.user.username });
    notifyMediaAdded({ type, title, year, quality_profile, poster_url });
    res.status(201).json({ id, message: 'Added to library' });
  }
);

// PATCH /api/media/:id — update status/quality
router.patch('/:id',
  param('id').isUUID(),
  body('status').optional().isIn(['wanted', 'downloading', 'downloaded', 'missing']),
  body('quality_profile').optional().isIn(['720p', '1080p', '2160p', 'Any']),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const allowed = ['status', 'quality_profile', 'path'];
    const updates = [];
    const values = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    const result = db.prepare(`UPDATE media_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });

    res.json({ message: 'Updated' });
  }
);

// DELETE /api/media/:id
router.delete('/:id', param('id').isUUID(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const result = db.prepare('DELETE FROM media_items WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });

  logger.info('Media removed', { id: req.params.id, user: req.user.username });
  res.json({ message: 'Removed from library' });
});

// POST /api/media/:id/episodes — bulk insert episodes for series
router.post('/:id/episodes',
  param('id').isUUID(),
  body('episodes').isArray({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const series = db.prepare("SELECT id FROM media_items WHERE id = ? AND type = 'series'").get(req.params.id);
    if (!series) return res.status(404).json({ error: 'Series not found' });

    const insert = db.prepare(`
      INSERT OR IGNORE INTO episodes (id, series_id, season_number, episode_number, title, air_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((episodes) => {
      for (const ep of episodes) {
        if (typeof ep.season_number !== 'number' || typeof ep.episode_number !== 'number') continue;
        insert.run(uuidv4(), req.params.id, ep.season_number, ep.episode_number,
                   ep.title || null, ep.air_date || null, ep.status || 'wanted');
      }
    });

    insertMany(req.body.episodes);
    res.status(201).json({ message: 'Episodes synced' });
  }
);

module.exports = router;
