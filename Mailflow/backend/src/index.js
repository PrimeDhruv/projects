require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const { startScheduler } = require('./services/scheduler');
const authRoutes = require('./routes/auth');
const sequenceRoutes = require('./routes/sequences');
const trackingRoutes = require('./routes/tracking');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const { authMiddleware, trialMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sequences', authMiddleware, trialMiddleware, sequenceRoutes);
app.use('/track', trackingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Start
async function start() {
  try {
    await initDB();
    startScheduler();
    app.listen(PORT, () => {
      console.log(`🚀 MailFlow backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
