const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

// GET /api/settings
router.get('/', requireAdmin, (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT key, value, updated_at FROM settings').all();
  const settings = {};
  for (const row of rows) {
    // Never expose sensitive keys in plaintext
    if (row.key.includes('api_key') || row.key.includes('password')) {
      settings[row.key] = row.value ? '***CONFIGURED***' : '';
    } else {
      settings[row.key] = row.value;
    }
  }
  res.json(settings);
});

// PUT /api/settings — update settings (admin only)
router.put('/',
  requireAdmin,
  body('key').trim().isLength({ min: 1, max: 100 }).matches(/^[a-z0-9_]+$/),
  body('value').isString().isLength({ max: 2000 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const { key, value } = req.body;

    // Whitelist allowed setting keys
    const allowed = [
      'tmdb_api_key', 'download_path_movies', 'download_path_series',
      'quality_profiles', 'sabnzbd_url', 'sabnzbd_api_key',
      'hydra2_url', 'hydra2_api_key',
    ];
    if (!allowed.includes(key)) {
      return res.status(400).json({ error: 'Unknown setting key' });
    }

    db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
    logger.info('Setting updated', { key: key.replace(/api_key|password/, '[REDACTED]'), user: req.user.username });
    res.json({ message: 'Setting saved' });
  }
);

// GET /api/settings/indexers
router.get('/indexers', requireAdmin, (req, res) => {
  const db = getDB();
  const indexers = db.prepare('SELECT id, name, type, url, enabled, priority, added_at FROM indexers').all();
  res.json(indexers);
});

// POST /api/settings/indexers
router.post('/indexers',
  requireAdmin,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('type').isIn(['newznab', 'torznab', 'torrent_api']),
  body('url').isURL({ protocols: ['http', 'https'] }),
  body('api_key').optional().isLength({ max: 256 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const { name, type, url, api_key, priority = 1 } = req.body;
    const id = uuidv4();

    db.prepare('INSERT INTO indexers (id, name, type, url, api_key, priority) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, name, type, url, api_key || null, priority
    );
    logger.info('Indexer added', { name, type, user: req.user.username });
    res.status(201).json({ id, message: 'Indexer added' });
  }
);

// DELETE /api/settings/indexers/:id
router.delete('/indexers/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM indexers WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Indexer not found' });
  res.json({ message: 'Indexer removed' });
});

// POST /api/settings/test-connection — test sabnzbd or hydra2
router.post('/test-connection',
  requireAdmin,
  body('type').isIn(['sabnzbd', 'hydra2']),
  body('url').isURL({ protocols: ['http', 'https'] }),
  body('api_key').isLength({ min: 1, max: 256 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const axios = require('axios');
    const { type, url, api_key } = req.body;

    try {
      let testUrl;
      if (type === 'sabnzbd') {
        testUrl = `${url}/api?mode=version&apikey=${api_key}&output=json`;
      } else {
        testUrl = `${url}/api?apikey=${api_key}&t=caps&o=json`;
      }

      const resp = await axios.get(testUrl, {
        timeout: 5000,
        maxRedirects: 3,
        validateStatus: s => s < 500,
      });

      if (resp.status === 200) {
        res.json({ success: true, message: 'Connection successful' });
      } else {
        res.status(400).json({ success: false, message: `Received status ${resp.status}` });
      }
    } catch (err) {
      res.status(400).json({ success: false, message: 'Connection failed: ' + err.message });
    }
  }
);

module.exports = router;
