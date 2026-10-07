const { google } = require('googleapis');
const { getAuthenticatedClient } = require('./gmail');
const { pool } = require('../db');
const path = require('path');
const fs = require('fs');

function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

function buildTrackingPixelUrl(pixelId) {
  return `${process.env.BACKEND_URL}/track/open/${pixelId}`;
}

async function buildMimeMessage({ to, from, subject, htmlBody, attachmentPath, attachmentFilename, attachmentMimetype, trackingPixelId, includeTracking }) {
  const boundary = `boundary_${Date.now()}`;
  
  let trackedBody = htmlBody;
  if (includeTracking && trackingPixelId) {
    const pixelUrl = buildTrackingPixelUrl(trackingPixelId);
    trackedBody += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;
  }

  const hasAttachment = attachmentPath && fs.existsSync(attachmentPath);

  let messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];

  if (hasAttachment) {
    messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    messageParts.push('');
    messageParts.push(`--${boundary}`);
    messageParts.push(`Content-Type: text/html; charset="UTF-8"`);
    messageParts.push('');
    messageParts.push(trackedBody);
    messageParts.push('');

    const fileData = fs.readFileSync(attachmentPath);
    const base64File = fileData.toString('base64');
    messageParts.push(`--${boundary}`);
    messageParts.push(`Content-Type: ${attachmentMimetype || 'application/octet-stream'}; name="${attachmentFilename}"`);
    messageParts.push(`Content-Disposition: attachment; filename="${attachmentFilename}"`);
    messageParts.push(`Content-Transfer-Encoding: base64`);
    messageParts.push('');
    messageParts.push(base64File);
    messageParts.push(`--${boundary}--`);
  } else {
    messageParts.push(`Content-Type: text/html; charset="UTF-8"`);
    messageParts.push('');
    messageParts.push(trackedBody);
  }

  const rawMessage = messageParts.join('\r\n');
  return Buffer.from(rawMessage).toString('base64url');
}

async function sendEmail(userId, sendData) {
  const {
    to, from, subject, htmlBody,
    attachmentPath, attachmentFilename, attachmentMimetype,
    trackingPixelId, includeTracking,
    threadId // for follow-ups, to keep them in same thread
  } = sendData;

  const auth = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = await buildMimeMessage({
    to, from, subject, htmlBody,
    attachmentPath, attachmentFilename, attachmentMimetype,
    trackingPixelId, includeTracking
  });

  const params = {
    userId: 'me',
    requestBody: { raw }
  };

  if (threadId) {
    params.requestBody.threadId = threadId;
  }

  const response = await gmail.users.messages.send(params);
  return {
    messageId: response.data.id,
    threadId: response.data.threadId
  };
}

async function processDueEmails() {
  const client = await pool.connect();
  try {
    // Get all scheduled emails that are due now
    const { rows: dueSends } = await client.query(`
      SELECT 
        es.*,
        c.email as contact_email,
        c.data as contact_data,
        c.status as contact_status,
        seq.user_id,
        seq.from_email,
        seq.attachment_path,
        seq.attachment_filename,
        seq.attachment_mimetype,
        seq.include_signature,
        seq.open_tracking,
        seq.status as sequence_status,
        seq.daily_limit_hit,
        se.subject as email_subject,
        se.body as email_body,
        u.signature as user_signature,
        u.gmail_email
      FROM email_sends es
      JOIN contacts c ON es.contact_id = c.id
      JOIN sequences seq ON es.sequence_id = seq.id
      JOIN sequence_emails se ON es.sequence_email_id = se.id
      JOIN users u ON seq.user_id = u.id
      WHERE es.status = 'scheduled'
        AND es.scheduled_at <= NOW()
        AND seq.status = 'active'
        AND c.status NOT IN ('replied', 'stopped')
        AND seq.daily_limit_hit = false
      ORDER BY es.scheduled_at ASC
      LIMIT 50
    `);

    if (dueSends.length === 0) return;

    // Group by user to enforce per-user hourly limit (50/hour)
    const byUser = {};
    for (const send of dueSends) {
      if (!byUser[send.user_id]) byUser[send.user_id] = [];
      byUser[send.user_id].push(send);
    }

    for (const [userId, sends] of Object.entries(byUser)) {
      // Check how many sent in last hour
      const { rows: recentSends } = await client.query(`
        SELECT COUNT(*) FROM email_sends es
        JOIN sequences seq ON es.sequence_id = seq.id
        WHERE seq.user_id = $1 AND es.sent_at > NOW() - INTERVAL '1 hour' AND es.status = 'sent'
      `, [userId]);

      let sentThisHour = parseInt(recentSends[0].count);
      const hourlyLimit = 50;

      for (const send of sends) {
        if (sentThisHour >= hourlyLimit) {
          console.log(`⚠️ Hourly limit reached for user ${userId}, pausing sends`);
          break;
        }

        try {
          // Hard duplicate check before send
          const { rows: alreadySent } = await client.query(
            `SELECT id FROM email_sends WHERE contact_id = $1 AND step_number = $2 AND status = 'sent'`,
            [send.contact_id, send.step_number]
          );
          if (alreadySent.length > 0) {
            // Already sent this step to this contact — mark as skipped and skip
            await client.query(`UPDATE email_sends SET status = 'skipped', error_message = 'Duplicate: already sent' WHERE id = $1`, [send.id]);
            console.log(`⚠️ Skipping duplicate send to ${send.contact_email} step ${send.step_number}`);
            continue;
          }

          // Build final email body with variable substitution
          let htmlBody = renderTemplate(send.email_body, send.contact_data);
          
          // Append signature if enabled
          if (send.include_signature && send.user_signature) {
            htmlBody += `<br/><br/>--<br/>${send.user_signature}`;
          }

          const subject = renderTemplate(send.email_subject, send.contact_data);

          const result = await sendEmail(parseInt(userId), {
            to: send.contact_email,
            from: send.from_email || send.gmail_email,
            subject,
            htmlBody,
            attachmentPath: send.attachment_path,
            attachmentFilename: send.attachment_filename,
            attachmentMimetype: send.attachment_mimetype,
            trackingPixelId: send.tracking_pixel_id,
            includeTracking: send.open_tracking,
            threadId: send.step_number > 1 ? send.gmail_thread_id : null
          });

          // Mark as sent
          await client.query(`
            UPDATE email_sends 
            SET status = 'sent', sent_at = NOW(), gmail_message_id = $1, gmail_thread_id = $2
            WHERE id = $3
          `, [result.messageId, result.threadId, send.id]);

          // Update contact current step
          await client.query(`
            UPDATE contacts SET current_step = $1 WHERE id = $2
          `, [send.step_number, send.contact_id]);

          // Update sequence sent count
          await client.query(`
            UPDATE sequences SET sent_count = sent_count + 1 WHERE id = $1
          `, [send.sequence_id]);

          // Log activity
          await client.query(`
            INSERT INTO activity_log (sequence_id, contact_id, event_type, description, metadata)
            VALUES ($1, $2, 'email_sent', $3, $4)
          `, [
            send.sequence_id,
            send.contact_id,
            `Email sent to ${send.contact_email} (Step ${send.step_number})`,
            JSON.stringify({ messageId: result.messageId, step: send.step_number })
          ]);

          // Schedule next follow-up if exists
          await scheduleNextFollowUp(client, send, result.threadId);

          sentThisHour++;
          console.log(`✅ Sent email to ${send.contact_email} (Step ${send.step_number})`);

        } catch (err) {
          const isLimitError = err.message?.includes('429') || err.message?.toLowerCase().includes('limit') || err.message?.includes('rateLimitExceeded');
          
          if (isLimitError) {
            // Mark daily limit hit
            await client.query(`
              UPDATE sequences SET daily_limit_hit = true, daily_limit_reset_at = NOW() + INTERVAL '24 hours'
              WHERE id = $1
            `, [send.sequence_id]);

            await client.query(`
              INSERT INTO activity_log (sequence_id, event_type, description)
              VALUES ($1, 'limit_reached', 'Gmail daily sending limit reached. Sending will resume tomorrow.')
            `, [send.sequence_id]);

            console.log(`⚠️ Gmail limit hit for sequence ${send.sequence_id}`);
            break;
          } else {
            // Mark as failed
            await client.query(`
              UPDATE email_sends SET status = 'failed', error_message = $1 WHERE id = $2
            `, [err.message, send.id]);

            await client.query(`
              UPDATE sequences SET failed_count = failed_count + 1 WHERE id = $1
            `, [send.sequence_id]);

            console.error(`❌ Failed to send to ${send.contact_email}:`, err.message);
          }
        }
      }
    }
  } finally {
    client.release();
  }
}

async function scheduleNextFollowUp(client, completedSend, threadId) {
  // Find next step for this contact
  const { rows: nextEmail } = await client.query(`
    SELECT se.* FROM sequence_emails se
    WHERE se.sequence_id = $1 AND se.step_number = $2
  `, [completedSend.sequence_id, completedSend.step_number + 1]);

  if (nextEmail.length === 0) {
    // No more steps, mark contact as completed
    await client.query(`UPDATE contacts SET status = 'completed' WHERE id = $1`, [completedSend.contact_id]);
    return;
  }

  const next = nextEmail[0];

  // Check if already scheduled or sent for this step
  const { rows: existing } = await client.query(
    "SELECT id FROM email_sends WHERE contact_id = $1 AND step_number = $2 AND status IN ('scheduled', 'sent')",
    [completedSend.contact_id, next.step_number]
  );
  if (existing.length > 0) return;

  const delayMs = ((next.delay_days || 0) * 24 * 60 + (next.delay_hours || 0) * 60) * 60 * 1000;
  const scheduledAt = new Date(Date.now() + delayMs);

  await client.query(`
    INSERT INTO email_sends (sequence_id, contact_id, sequence_email_id, step_number, to_email, status, scheduled_at, gmail_thread_id)
    VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7)
  `, [
    completedSend.sequence_id,
    completedSend.contact_id,
    next.id,
    next.step_number,
    completedSend.contact_email,
    scheduledAt,
    threadId
  ]);
}

async function resetDailyLimits() {
  await pool.query(`
    UPDATE sequences 
    SET daily_limit_hit = false, daily_limit_reset_at = NULL
    WHERE daily_limit_hit = true AND daily_limit_reset_at <= NOW()
  `);
}

module.exports = { processDueEmails, resetDailyLimits, renderTemplate };
