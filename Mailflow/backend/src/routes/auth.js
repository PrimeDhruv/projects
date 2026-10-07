const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { getAuthUrl, exchangeCode, getSendAsAliases, fetchGmailSignature } = require('../services/gmail');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Check if app is set up (first user exists)
router.get('/status', async (req, res) => {
  const { rows } = await pool.query('SELECT COUNT(*) FROM users');
  res.json({ setup: parseInt(rows[0].count) > 0 });
});

// Initial setup - create the single user
router.post('/setup', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) > 0) return res.status(400).json({ error: 'Already set up' });

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const hash = await bcrypt.hash(password, 12);
    const { rows: newUser } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, hash]
    );

    const token = jwt.sign({ userId: newUser[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, userId: newUser[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register new user (trial account)
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { rows: newUser } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, is_admin, access_status, trial_expires_at)
       VALUES ($1, $2, $3, false, 'trial', $4) RETURNING id, email, full_name, is_admin, access_status, trial_expires_at`,
      [full_name, email, hash, trialExpires]
    );

    // Notify admins
    const { rows: admins } = await pool.query('SELECT id FROM users WHERE is_admin = true');
    for (const admin of admins) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'new_user', $2, $3)`,
        [admin.id, '🆕 New User Registered', `${full_name} (${email}) just signed up and started their 7-day trial.`]
      );
    }

    const token = jwt.sign({ userId: newUser[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, ...newUser[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      userId: rows[0].id,
      email: rows[0].email,
      full_name: rows[0].full_name,
      gmailConnected: !!rows[0].gmail_access_token,
      gmailEmail: rows[0].gmail_email,
      is_admin: rows[0].is_admin,
      access_status: rows[0].access_status,
      trial_expires_at: rows[0].trial_expires_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, gmail_email, gmail_connected_at, signature, is_admin, access_status, trial_expires_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gmail OAuth - get URL
router.get('/gmail/url', authMiddleware, (req, res) => {
  res.json({ url: getAuthUrl(req.userId) });
});

// Gmail OAuth - callback
router.get('/gmail/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state || 1; // pass userId via state param in production

    const { tokens, email } = await exchangeCode(code);
    
    await pool.query(`
      UPDATE users SET 
        gmail_access_token = $1,
        gmail_refresh_token = $2,
        gmail_email = $3,
        gmail_connected_at = NOW()
      WHERE id = $4
    `, [tokens.access_token, tokens.refresh_token, email, userId]);

    // Auto-fetch signature
    try {
      const signature = await fetchGmailSignature(parseInt(userId));
      if (signature) {
        await pool.query('UPDATE users SET signature = $1 WHERE id = $2', [signature, userId]);
      }
    } catch (e) {
      console.log('Could not fetch signature:', e.message);
    }

    res.redirect(`${process.env.FRONTEND_URL}/settings?gmail=connected`);
  } catch (err) {
    res.redirect(`${process.env.FRONTEND_URL}/settings?gmail=error&msg=${encodeURIComponent(err.message)}`);
  }
});

// Get Gmail aliases
router.get('/gmail/aliases', authMiddleware, async (req, res) => {
  try {
    const aliases = await getSendAsAliases(req.userId);
    res.json(aliases.map(a => ({ email: a.sendAsEmail, name: a.displayName, isPrimary: a.isPrimary })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update signature
router.put('/signature', authMiddleware, async (req, res) => {
  try {
    const { signature } = req.body;
    await pool.query('UPDATE users SET signature = $1 WHERE id = $2', [signature, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect Gmail
router.post('/gmail/disconnect', authMiddleware, async (req, res) => {
  try {
    await pool.query(`
      UPDATE users SET gmail_access_token = NULL, gmail_refresh_token = NULL, gmail_email = NULL, gmail_connected_at = NULL
      WHERE id = $1
    `, [req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
