const jwt = require('jsonwebtoken');
const { pool } = require('../db');

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function trialMiddleware(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT access_status, trial_expires_at, is_admin FROM users WHERE id = $1',
      [req.userId]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.is_admin) return next();
    if (user.access_status === 'approved') return next();
    if (user.access_status === 'trial') {
      if (user.trial_expires_at && new Date() > new Date(user.trial_expires_at)) {
        await pool.query("UPDATE users SET access_status = 'expired' WHERE id = $1", [req.userId]);
        return res.status(403).json({ error: 'trial_expired' });
      }
      return next();
    }
    if (user.access_status === 'expired') return res.status(403).json({ error: 'trial_expired' });
    if (user.access_status === 'rejected') return res.status(403).json({ error: 'access_rejected' });
    return res.status(403).json({ error: 'access_denied' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function adminMiddleware(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
    if (!rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { authMiddleware, trialMiddleware, adminMiddleware };
