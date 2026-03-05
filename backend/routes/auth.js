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

    const token = jwt.sign(
      { id, username, role: 'admin' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '24h', issuer: 'streamline' }
    );

    logger.info('Admin user created during setup', { username });
    res.status(201).json({ token, user: { id, username, role: 'admin' } });
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

module.exports = router;
