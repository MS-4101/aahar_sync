const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const authenticateSync = require('../middleware/syncAuth');

// 1. POS Sync Push (Protected by X-API-KEY and X-Restaurant-ID)
router.post('/push', authenticateSync, syncController.pushSnapshot);

// 2. Real-time Live SSE Stream (Open to authorized mobile clients)
router.get('/stream/:restaurantId', syncController.streamLive);

// 3. Fallback REST Polling / Snapshot
router.get('/live/:restaurantId', syncController.getLiveState);

// 4. Historical Day Report & Order Logs by Date
router.get('/historical/:restaurantId', syncController.getHistoricalReport);

module.exports = router;

