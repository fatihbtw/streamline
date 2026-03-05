const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db');
const logger = require('../logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 12;

const validateUsername = body('username')
  .trim()
  .isLength({ min: 3, max: 32 })
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Username must be 3-32 alphanumeric characters');

const validatePassword = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be 8-128 characters');

// POST /api/auth/setup — First-time admin setup
router.post('/setup',
  validateUsername,
  validatePassword,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const setupDone = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get();
    if (setupDone?.value === 'true') {
      return res.status(409).json({ error: 'Setup already completed' });
    }

    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
      id, username, hash, 'admin'
    );
    db.prepare("UPDATE settings SET value = 'true' WHERE key = 'setup_complete'").run();

    logger.info('Admin user created during setup', { username });
    res.status(201).json({ message: 'Admin account created. Please log in.' });
  }
);

// POST /api/auth/login
router.post('/login',
  validateUsername,
  validatePassword,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    // Always compare to prevent timing attacks
    const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhas';
    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash);

    if (!user || !valid) {
      logger.warn('Failed login attempt', { username, ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '24h', issuer: 'streamline' }
    );

    logger.info('User logged in', { username, ip: req.ip });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  }
);

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// GET /api/auth/setup-status
router.get('/setup-status', (req, res) => {
  const db = getDB();
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get();
  res.json({ setupComplete: setting?.value === 'true' });
});


// ── User Management ──────────────────────────────────────────────────────────

// GET /api/auth/users — list all users (admin only)
router.get('/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const db = getDB();
  const users = db.prepare('SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at').all();
  res.json({ users });
});

// POST /api/auth/users — create user (admin only)
router.post('/users',
  authenticateToken,
  validateUsername,
  validatePassword,
  body('role').optional().isIn(['admin', 'user']),
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const { username, password, role = 'user' } = req.body;
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) return res.status(409).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(id, username, hash, role);
    logger.info('User created', { username, role, by: req.user.username });
    res.status(201).json({ id, username, role });
  }
);

// PATCH /api/auth/users/:id/password — change password (admin or self)
router.patch('/users/:id/password',
  authenticateToken,
  validatePassword,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDB();
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Admin can change anyone, user can only change own password
    if (req.user.role !== 'admin' && req.user.id !== target.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const hash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, target.id);
    logger.info('Password changed', { username: target.username, by: req.user.username });
    res.json({ success: true });
  }
);

// DELETE /api/auth/users/:id — delete user (admin only, can't delete self)
router.delete('/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot delete yourself' });

  const db = getDB();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logger.info('User deleted', { username: target.username, by: req.user.username });
  res.json({ success: true });
});

module.exports = router;

