require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDB, getDB } = require('./db');
const logger = require('./logger');
const authRouter = require('./routes/auth');
const mediaRouter = require('./routes/media');
const settingsRouter = require('./routes/settings');
const searchRouter = require('./routes/search');
const downloadRouter = require('./routes/downloads');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust nginx/reverse proxy
app.set('trust proxy', 1);

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://image.tmdb.org', 'https://www.themoviedb.org'],
      connectSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// ── Dynamic CORS ───────────────────────────────────────────────────────────────
// Reads allowed_origins from DB at runtime so users can add their own domains
// via Settings without restarting the container.
// Falls back to ALLOWED_ORIGINS env var on startup.
function getAllowedOrigins() {
  try {
    const db = getDB();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'allowed_origins'").get();
    if (row?.value) {
      return row.value.split(',').map(o => o.trim()).filter(Boolean);
    }
  } catch (_) { /* DB not ready yet */ }
  // Fallback: env var
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
  }
  return ['http://localhost', 'http://localhost:3000', 'http://localhost:7878'];
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin / curl
    const allowed = getAllowedOrigins();
    if (allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
    logger.warn('CORS blocked', { origin });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Rate limiters ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logging ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/media', authenticateToken, mediaRouter);
app.use('/api/settings', authenticateToken, settingsRouter);
app.use('/api/search', authenticateToken, searchRouter);
app.use('/api/downloads', authenticateToken, downloadRouter);

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── Onboarding status (no auth — needed before login) ────────────────────────
app.get('/api/onboarding/status', (req, res) => {
  try {
    const db = getDB();
    const done = db.prepare("SELECT value FROM settings WHERE key = 'onboarding_complete'").get();
    const expiry = db.prepare("SELECT value FROM settings WHERE key = 'onboarding_expiry'").get();

    if (done?.value === 'true') return res.json({ required: false });

    // Check 5-minute expiry
    if (expiry?.value) {
      const exp = parseInt(expiry.value);
      if (Date.now() > exp) {
        // Mark expired — skip onboarding
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_complete', 'true')").run();
        return res.json({ required: false, reason: 'expired' });
      }
    }

    // First visit — set expiry if not set
    if (!expiry?.value) {
      const exp = Date.now() + 5 * 60 * 1000; // 5 minutes
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_expiry', ?)").run(String(exp));
    }

    res.json({ required: true, expiresAt: parseInt(expiry?.value || Date.now() + 5 * 60 * 1000) });
  } catch (err) {
    res.json({ required: false });
  }
});

// POST /api/onboarding/complete — save onboarding data and mark done
app.post('/api/onboarding/complete', express.json(), async (req, res) => {
  try {
    const db = getDB();
    const { admin, sabnzbd, tmdb_api_key, indexer } = req.body;

    // Check not already done and not expired
    const done = db.prepare("SELECT value FROM settings WHERE key = 'onboarding_complete'").get();
    if (done?.value === 'true') return res.status(409).json({ error: 'Onboarding already completed' });

    const expiry = db.prepare("SELECT value FROM settings WHERE key = 'onboarding_expiry'").get();
    if (expiry?.value && Date.now() > parseInt(expiry.value)) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_complete', 'true')").run();
      return res.status(410).json({ error: 'Onboarding window expired' });
    }

    // 1. Create admin user
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(admin.username);
    if (!existing) {
      const hash = await bcrypt.hash(admin.password, 12);
      db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
        uuidv4(), admin.username, hash, 'admin'
      );
    }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('setup_complete', 'true')").run();

    // 2. Save SABnzbd if provided
    if (sabnzbd?.url && sabnzbd?.api_key) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('sabnzbd_url', ?)").run(sabnzbd.url);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('sabnzbd_api_key', ?)").run(sabnzbd.api_key);
    }

    // 3. Save TMDB API key
    if (tmdb_api_key) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('tmdb_api_key', ?)").run(tmdb_api_key);
    }

    // 4. Save indexer if provided
    if (indexer?.name && indexer?.url) {
      db.prepare(
        'INSERT INTO indexers (id, name, type, url, api_key, enabled) VALUES (?, ?, ?, ?, ?, 1)'
      ).run(uuidv4(), indexer.name, indexer.type || 'newznab', indexer.url, indexer.api_key || '');
    }

    // Mark onboarding done
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_complete', 'true')").run();

    logger.info('Onboarding completed', { username: admin.username });
    res.json({ success: true });
  } catch (err) {
    logger.error('Onboarding failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── Error Handling ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'CORS: origin not allowed' });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    logger.info('Streamline backend running on port ' + PORT);
  });
}

start().catch(err => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
