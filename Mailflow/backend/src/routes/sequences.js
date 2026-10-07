const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Get all sequences
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { archived } = req.query;
    const showArchived = archived === 'true';
    const { rows } = await pool.query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM contacts WHERE sequence_id = s.id) as total_contacts
      FROM sequences s
      WHERE s.user_id = $1 AND s.archived = $2
      ORDER BY s.sort_order ASC, s.created_at DESC
    `, [req.userId, showArchived]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get scheduled emails grouped by date (calendar) — MUST be before /:id routes
router.get('/calendar/scheduled', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(es.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') as date_ist,
        TO_CHAR(es.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') as time_ist,
        s.name as sequence_name,
        COUNT(*) as count,
        es.step_number
      FROM email_sends es
      JOIN sequences s ON es.sequence_id = s.id
      WHERE s.user_id = $1
        AND es.status = 'scheduled'
        AND s.status = 'active'
      GROUP BY date_ist, time_ist, s.name, es.step_number
      ORDER BY date_ist ASC, time_ist ASC
    `, [req.userId]);

    // Group by date
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.date_ist]) grouped[row.date_ist] = [];
      grouped[row.date_ist].push({
        time: row.time_ist,
        sequence: row.sequence_name,
        count: parseInt(row.count),
        step: row.step_number
      });
    }
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder sequences — MUST be before /:id routes
router.post('/reorder', authMiddleware, async (req, res) => {
  try {
    const { orderedIds } = req.body; // array of sequence IDs in new order
    for (let i = 0; i < orderedIds.length; i++) {
      await pool.query(`UPDATE sequences SET sort_order = $1 WHERE id = $2 AND user_id = $3`, [i, orderedIds[i], req.userId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single sequence with emails
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows: seq } = await pool.query(
      'SELECT * FROM sequences WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!seq[0]) return res.status(404).json({ error: 'Not found' });

    const { rows: emails } = await pool.query(
      'SELECT * FROM sequence_emails WHERE sequence_id = $1 ORDER BY step_number',
      [req.params.id]
    );

    res.json({ ...seq[0], emails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create sequence
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, from_email, include_signature, open_tracking, description } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO sequences (user_id, name, from_email, include_signature, open_tracking, description)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.userId, name, from_email, include_signature ?? true, open_tracking ?? true, description || '']);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update sequence settings
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, from_email, include_signature, open_tracking, description } = req.body;
    const { rows } = await pool.query(`
      UPDATE sequences SET name = $1, from_email = $2, include_signature = $3, open_tracking = $4, description = $5, updated_at = NOW()
      WHERE id = $6 AND user_id = $7 RETURNING *
    `, [name, from_email, include_signature, open_tracking, description || '', req.params.id, req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload CSV
router.post('/:id/csv', authMiddleware, upload.single('csv'), async (req, res) => {
  try {
    const csvPath = req.file.path;
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

    if (records.length === 0) return res.status(400).json({ error: 'CSV is empty' });

    const columns = Object.keys(records[0]);

    // Delete existing contacts for this sequence
    await pool.query('DELETE FROM contacts WHERE sequence_id = $1', [req.params.id]);
    // Delete existing email_sends
    await pool.query(`
      DELETE FROM email_sends WHERE sequence_id = $1
    `, [req.params.id]);

    // Insert contacts
    for (const record of records) {
      const email = record.email || record.Email || record.EMAIL;
      if (!email) continue;
      await pool.query(
        'INSERT INTO contacts (sequence_id, email, data) VALUES ($1, $2, $3)',
        [req.params.id, email.trim(), JSON.stringify(record)]
      );
    }

    await pool.query(`
      UPDATE sequences SET csv_filename = $1, csv_columns = $2, total_contacts = $3, updated_at = NOW()
      WHERE id = $4
    `, [req.file.originalname, JSON.stringify(columns), records.length, req.params.id]);

    fs.unlinkSync(csvPath);
    res.json({ columns, count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add contacts manually (no CSV needed)
router.post('/:id/contacts/manual', authMiddleware, async (req, res) => {
  try {
    const { emails: emailList, replace } = req.body; // emailList: array of email strings
    if (!emailList || emailList.length === 0) return res.status(400).json({ error: 'No emails provided' });

    const validEmails = emailList.map(e => e.trim().toLowerCase()).filter(e => e && e.includes('@'));
    if (validEmails.length === 0) return res.status(400).json({ error: 'No valid emails' });

    if (replace) {
      // Clear existing contacts and sends
      await pool.query('DELETE FROM contacts WHERE sequence_id = $1', [req.params.id]);
      await pool.query('DELETE FROM email_sends WHERE sequence_id = $1', [req.params.id]);
    }

    // Get existing emails to avoid duplicates
    const { rows: existing } = await pool.query('SELECT email FROM contacts WHERE sequence_id = $1', [req.params.id]);
    const existingEmails = new Set(existing.map(r => r.email.toLowerCase()));

    let added = 0;
    for (const email of validEmails) {
      if (existingEmails.has(email)) continue;
      await pool.query(
        'INSERT INTO contacts (sequence_id, email, data) VALUES ($1, $2, $3)',
        [req.params.id, email, JSON.stringify({ email })]
      );
      existingEmails.add(email);
      added++;
    }

    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM contacts WHERE sequence_id = $1', [req.params.id]);
    const total = parseInt(countRows[0].count);

    await pool.query(`UPDATE sequences SET total_contacts = $1, updated_at = NOW() WHERE id = $2`, [total, req.params.id]);

    res.json({ added, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload attachment
router.post('/:id/attachment', authMiddleware, upload.single('attachment'), async (req, res) => {
  try {
    const attachDir = path.join(__dirname, '../../attachments');
    if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });

    const ext = path.extname(req.file.originalname);
    const newFilename = `${uuidv4()}${ext}`;
    const newPath = path.join(attachDir, newFilename);
    fs.renameSync(req.file.path, newPath);

    // Remove old attachment if exists
    const { rows } = await pool.query('SELECT attachment_path FROM sequences WHERE id = $1', [req.params.id]);
    if (rows[0]?.attachment_path && fs.existsSync(rows[0].attachment_path)) {
      fs.unlinkSync(rows[0].attachment_path);
    }

    await pool.query(`
      UPDATE sequences SET attachment_filename = $1, attachment_path = $2, attachment_mimetype = $3, updated_at = NOW()
      WHERE id = $4
    `, [req.file.originalname, newPath, req.file.mimetype, req.params.id]);

    res.json({ filename: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove attachment
router.delete('/:id/attachment', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT attachment_path FROM sequences WHERE id = $1', [req.params.id]);
    if (rows[0]?.attachment_path && fs.existsSync(rows[0].attachment_path)) {
      fs.unlinkSync(rows[0].attachment_path);
    }
    await pool.query(`
      UPDATE sequences SET attachment_filename = NULL, attachment_path = NULL, attachment_mimetype = NULL
      WHERE id = $1
    `, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save email steps
router.put('/:id/emails', authMiddleware, async (req, res) => {
  try {
    const { emails } = req.body; // array of { step_number, subject, body, scheduled_at, delay_days, delay_hours }

    // Delete existing steps
    await pool.query('DELETE FROM sequence_emails WHERE sequence_id = $1', [req.params.id]);

    for (const email of emails) {
      await pool.query(`
        INSERT INTO sequence_emails (sequence_id, step_number, subject, body, scheduled_at, delay_days, delay_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [req.params.id, email.step_number, email.subject, email.body, email.scheduled_at || null, email.delay_days || 0, email.delay_hours || 0]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Launch sequence - schedule all initial emails
router.post('/:id/launch', authMiddleware, async (req, res) => {
  try {
    const { rows: seq } = await pool.query('SELECT * FROM sequences WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!seq[0]) return res.status(404).json({ error: 'Not found' });

    const { rows: emails } = await pool.query(
      'SELECT * FROM sequence_emails WHERE sequence_id = $1 ORDER BY step_number',
      [req.params.id]
    );
    if (emails.length === 0) return res.status(400).json({ error: 'No email steps defined' });

    const { rows: contacts } = await pool.query(
      'SELECT * FROM contacts WHERE sequence_id = $1', [req.params.id]
    );
    if (contacts.length === 0) return res.status(400).json({ error: 'No contacts in sequence' });

    const firstEmail = emails[0];
    if (!firstEmail.scheduled_at) return res.status(400).json({ error: 'Initial email needs a scheduled date/time' });

    // Schedule initial email for each contact
    for (const contact of contacts) {
      // Clear any existing scheduled sends
      await pool.query('DELETE FROM email_sends WHERE contact_id = $1 AND status = $2', [contact.id, 'scheduled']);

      await pool.query(`
        INSERT INTO email_sends (sequence_id, contact_id, sequence_email_id, step_number, to_email, status, scheduled_at)
        VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)
      `, [seq[0].id, contact.id, firstEmail.id, 1, contact.email, firstEmail.scheduled_at]);

      await pool.query('UPDATE contacts SET status = $1, current_step = 0 WHERE id = $2', ['active', contact.id]);
    }

    await pool.query(`
      UPDATE sequences SET status = 'active', sent_count = 0, opened_count = 0, replied_count = 0, failed_count = 0, updated_at = NOW()
      WHERE id = $1
    `, [req.params.id]);

    await pool.query(`
      INSERT INTO activity_log (sequence_id, event_type, description)
      VALUES ($1, 'sequence_launched', $2)
    `, [req.params.id, `Sequence launched with ${contacts.length} contacts`]);

    res.json({ success: true, contactsScheduled: contacts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pause sequence
router.post('/:id/pause', authMiddleware, async (req, res) => {
  try {
    await pool.query(`UPDATE sequences SET status = 'paused', updated_at = NOW() WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    await pool.query(`INSERT INTO activity_log (sequence_id, event_type, description) VALUES ($1, 'sequence_paused', 'Sequence paused by user')`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resume sequence
router.post('/:id/resume', authMiddleware, async (req, res) => {
  try {
    await pool.query(`UPDATE sequences SET status = 'active', updated_at = NOW() WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    await pool.query(`INSERT INTO activity_log (sequence_id, event_type, description) VALUES ($1, 'sequence_resumed', 'Sequence resumed by user')`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stop sequence
router.post('/:id/stop', authMiddleware, async (req, res) => {
  try {
    await pool.query(`UPDATE sequences SET status = 'stopped', updated_at = NOW() WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    // Cancel all scheduled sends
    await pool.query(`UPDATE email_sends SET status = 'skipped' WHERE sequence_id = $1 AND status = 'scheduled'`, [req.params.id]);
    await pool.query(`UPDATE contacts SET status = 'stopped' WHERE sequence_id = $1 AND status = 'active'`, [req.params.id]);
    await pool.query(`INSERT INTO activity_log (sequence_id, event_type, description) VALUES ($1, 'sequence_stopped', 'Sequence stopped by user')`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Archive sequence
router.post('/:id/archive', authMiddleware, async (req, res) => {
  try {
    await pool.query(`UPDATE sequences SET archived = true, updated_at = NOW() WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Unarchive sequence
router.post('/:id/unarchive', authMiddleware, async (req, res) => {
  try {
    await pool.query(`UPDATE sequences SET archived = false, updated_at = NOW() WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Duplicate sequence
router.post('/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const { rows: orig } = await pool.query('SELECT * FROM sequences WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (!orig[0]) return res.status(404).json({ error: 'Not found' });

    const { rows: newSeq } = await pool.query(`
      INSERT INTO sequences (user_id, name, from_email, include_signature, open_tracking, attachment_filename, attachment_path, attachment_mimetype, duplicated_from)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [
      req.userId,
      `${orig[0].name} (Copy)`,
      orig[0].from_email,
      orig[0].include_signature,
      orig[0].open_tracking,
      orig[0].attachment_filename,
      orig[0].attachment_path,
      orig[0].attachment_mimetype,
      orig[0].id
    ]);

    // Copy email steps
    const { rows: emails } = await pool.query('SELECT * FROM sequence_emails WHERE sequence_id = $1 ORDER BY step_number', [req.params.id]);
    for (const email of emails) {
      await pool.query(`
        INSERT INTO sequence_emails (sequence_id, step_number, subject, body, scheduled_at, delay_days, delay_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [newSeq[0].id, email.step_number, email.subject, email.body, null, email.delay_days, email.delay_hours]);
      // Note: scheduled_at is cleared on duplicate so user must reschedule
    }

    res.json(newSeq[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete sequence
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM sequences WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get contacts for a sequence
router.get('/:id/contacts', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT c.*,
        (SELECT json_agg(json_build_object('step', es.step_number, 'status', es.status, 'sent_at', TO_CHAR(es.sent_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'scheduled_at', TO_CHAR(es.scheduled_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'opened_at', TO_CHAR(es.opened_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) ORDER BY es.step_number)
         FROM email_sends es WHERE es.contact_id = c.id) as sends
      FROM contacts c
      WHERE c.sequence_id = $1
    `;
    const params = [req.params.id];
    if (status) { query += ` AND c.status = $2`; params.push(status); }
    query += ' ORDER BY c.created_at';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get activity log for a sequence
router.get('/:id/activity', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM activity_log WHERE sequence_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
