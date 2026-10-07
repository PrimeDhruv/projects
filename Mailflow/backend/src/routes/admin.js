const express = require('express');
const { pool } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get all non-admin users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, full_name, email, access_status, trial_expires_at, created_at,
        (SELECT COUNT(*) FROM sequences WHERE user_id = users.id) as sequence_count
      FROM users WHERE is_admin = false ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve user
router.post('/users/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE users SET access_status = 'approved' WHERE id = $1", [req.params.id]);
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'access_approved', $2, $3)`,
      [req.params.id, '✅ Access Approved!', 'Your account has been approved. You now have full access to MailFlow!']
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reject user
router.post('/users/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE users SET access_status = 'rejected' WHERE id = $1", [req.params.id]);
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'access_rejected', $2, $3)`,
      [req.params.id, '❌ Access Request Declined', 'Your request was not approved at this time. Contact the admin for more info.']
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Extend trial by 7 days
router.post('/users/:id/extend', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query(`
      UPDATE users SET
        trial_expires_at = GREATEST(COALESCE(trial_expires_at, NOW()), NOW()) + INTERVAL '7 days',
        access_status = 'trial'
      WHERE id = $1
    `, [req.params.id]);
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'trial_extended', $2, $3)`,
      [req.params.id, '⏳ Trial Extended', 'Your trial has been extended by 7 more days. Enjoy!']
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get admin's own notifications
router.get('/notifications', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Send notification to a user
router.post('/notifications/send', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { user_id, title, message } = req.body;
    if (!user_id || !title || !message) return res.status(400).json({ error: 'user_id, title, message required' });
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'admin_message', $2, $3)`,
      [user_id, title, message]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Overview stats
router.get('/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_admin = false) as total_users,
        COUNT(*) FILTER (WHERE access_status = 'trial' AND is_admin = false) as trial_users,
        COUNT(*) FILTER (WHERE access_status = 'expired' AND is_admin = false) as expired_users,
        COUNT(*) FILTER (WHERE access_status = 'approved' AND is_admin = false) as approved_users
      FROM users
    `);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
