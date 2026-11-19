const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const syncRoutes = require('./routes/syncRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check & Root Handlers
app.get('/', (req, res) => {
  res.status(200).send('AaharIN Cloud Sync API is active.');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'AaharIN Cloud Sync API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sync', syncRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('[AaharCloud API Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
  });
});

// Export app for testing and server startup
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  🚀 AaharIN Cloud Sync Backend running on port ${PORT} `);
    console.log(`  Health Check: http://localhost:${PORT}/health         `);
    console.log(`  Sync Ingest:  POST http://localhost:${PORT}/api/v1/sync/push`);
    console.log(`=======================================================`);
  });
}

module.exports = app;

