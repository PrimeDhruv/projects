const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get my notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.userId]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark one as read
router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark all as read
router.post('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Request full access
router.post('/request-access', authMiddleware, async (req, res) => {
  try {
    const { rows: userRows } = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [req.userId]);
    const user = userRows[0];
    const { rows: admins } = await pool.query('SELECT id FROM users WHERE is_admin = true');
    for (const admin of admins) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'access_request', $2, $3)`,
        [admin.id, '📨 Access Request', `${user.full_name || user.email} has requested full access. Go to Admin → Users to approve.`]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
