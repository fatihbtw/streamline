const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const logger = require('../logger');

const router = express.Router();

function getSabConfig() {
  const db = getDB();
  const url = db.prepare("SELECT value FROM settings WHERE key = 'sabnzbd_url'").get()?.value;
  const key = db.prepare("SELECT value FROM settings WHERE key = 'sabnzbd_api_key'").get()?.value;
  return { url, key };
}

// GET /api/downloads — local queue
router.get('/', (req, res) => {
  const db = getDB();
  const items = db.prepare(`
    SELECT dq.*, mi.title as media_title, mi.type as media_type
    FROM download_queue dq
    LEFT JOIN media_items mi ON mi.id = dq.media_id
    ORDER BY dq.added_at DESC
    LIMIT 100
  `).all();
  res.json({ items });
});

// GET /api/downloads/sabnzbd — live SABnzbd queue
router.get('/sabnzbd', async (req, res) => {
  const { url, key } = getSabConfig();
  if (!url || !key) return res.status(400).json({ error: 'SABnzbd not configured' });

  try {
    const [queueResp, histResp] = await Promise.all([
      axios.get(`${url}/api`, { params: { mode: 'queue', apikey: key, output: 'json' }, timeout: 5000 }),
      axios.get(`${url}/api`, { params: { mode: 'history', apikey: key, output: 'json', limit: 20 }, timeout: 5000 }),
    ]);

    const queue = queueResp.data?.queue?.slots || [];
    const history = histResp.data?.history?.slots || [];

    res.json({
      queue: queue.map(s => ({
        id: s.nzo_id,
        name: s.filename,
        status: s.status,
        progress: parseFloat(s.percentage),
        size: s.mb,
        speed: queueResp.data?.queue?.kbpersec,
        eta: s.timeleft,
      })),
      history: history.map(s => ({
        id: s.nzo_id,
        name: s.name,
        status: s.status,
        size: s.bytes,
        completed: s.completed,
      })),
    });
  } catch (err) {
    logger.error('SABnzbd fetch failed', { error: err.message });
    res.status(502).json({ error: 'SABnzbd unreachable' });
  }
});

// POST /api/downloads/sabnzbd/action — pause/resume/delete
// SABnzbd API reference:
//   Global pause/resume: mode=pause / mode=resume
//   Per-item pause:      mode=queue&name=pause&value=<nzo_id>
//   Per-item resume:     mode=queue&name=resume&value=<nzo_id>
//   Per-item delete:     mode=queue&name=delete&value=<nzo_id>&del_files=1
router.post('/sabnzbd/action',
  body('action').isIn(['pause', 'resume', 'delete', 'pause_all', 'resume_all']),
  body('nzo_id').optional().isString().isLength({ max: 100 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { url, key } = getSabConfig();
    if (!url || !key) return res.status(400).json({ error: 'SABnzbd not configured' });

    const { action, nzo_id } = req.body;

    let params = { apikey: key, output: 'json' };

    if (action === 'pause_all') {
      // Pause entire queue globally
      params.mode = 'pause';
    } else if (action === 'resume_all') {
      // Resume entire queue globally
      params.mode = 'resume';
    } else if (nzo_id) {
      // Per-item actions all use mode=queue with name= sub-command
      params.mode = 'queue';
      if (action === 'pause') {
        params.name = 'pause';
        params.value = nzo_id;
      } else if (action === 'resume') {
        params.name = 'resume';
        params.value = nzo_id;
      } else if (action === 'delete') {
        params.name = 'delete';
        params.value = nzo_id;
        params.del_files = 1;
      }
    } else {
      // No nzo_id — fall back to global pause/resume
      params.mode = action === 'delete' ? 'queue' : action;
      if (action === 'delete') params.name = 'delete';
    }

    try {
      const resp = await axios.get(`${url}/api`, { params, timeout: 5000 });
      logger.info('SABnzbd action', { action, nzo_id, response: resp.data });
      res.json({ message: `Action '${action}' executed`, sab_response: resp.data });
    } catch (err) {
      logger.error('SABnzbd action failed', { error: err.message, action, nzo_id });
      res.status(502).json({ error: 'SABnzbd action failed: ' + err.message });
    }
  }
);

// POST /api/downloads/send-nzb — send NZB link to SABnzbd
router.post('/send-nzb',
  body('nzb_url').isURL({ protocols: ['http', 'https'] }),
  body('category').optional().isLength({ max: 50 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { url, key } = getSabConfig();
    if (!url || !key) return res.status(400).json({ error: 'SABnzbd not configured' });

    try {
      const resp = await axios.get(`${url}/api`, {
        params: {
          mode: 'addurl',
          apikey: key,
          name: req.body.nzb_url,
          cat: req.body.category || '',
          output: 'json',
        },
        timeout: 10000,
      });

      if (resp.data?.status === true) {
        res.json({ message: 'Sent to SABnzbd', nzo_id: resp.data.nzo_ids?.[0] });
      } else {
        res.status(400).json({ error: 'SABnzbd rejected the NZB' });
      }
    } catch (err) {
      res.status(502).json({ error: 'Failed to send to SABnzbd' });
    }
  }
);

// GET /api/downloads/torrent/:indexer_id?q=...
router.get('/torrent/search',
  async (req, res) => {
    const db = getDB();
    const { indexer_id, q } = req.query;
    if (!q || q.length > 200) return res.status(400).json({ error: 'Invalid query' });

    const indexer = indexer_id
      ? db.prepare("SELECT * FROM indexers WHERE id = ? AND enabled = 1").get(indexer_id)
      : db.prepare("SELECT * FROM indexers WHERE type = 'torznab' AND enabled = 1 LIMIT 1").get();

    if (!indexer) return res.status(400).json({ error: 'No torrent indexer configured' });

    try {
      const resp = await axios.get(`${indexer.url}/api`, {
        params: { t: 'search', apikey: indexer.api_key, q, o: 'json' },
        timeout: 15000,
      });

      const items = resp.data?.channel?.item || [];
      res.json({ results: Array.isArray(items) ? items : [items] });
    } catch (err) {
      res.status(502).json({ error: 'Torrent search failed' });
    }
  }
);

module.exports = router;
