const sseService = require('./sseService');

class SyncService {
  constructor() {
    // In-memory cache of latest state per restaurantId
    // Key: restaurantId, Value: { timestamp, payload, lastReceivedAt }
    this.liveStore = new Map();
  }

  /**
   * Ingests payload from local POS sync worker.
   */
  ingest(restaurantId, payload) {
    const rid = String(restaurantId);

    // Validate minimum payload structure
    if (!payload || typeof payload !== 'object') {
      throw new Error('Malformed sync payload.');
    }

    const stateRecord = {
      restaurantId: parseInt(rid, 10),
      lastReceivedAt: new Date().toISOString(),
      payload: {
        ...payload,
        server_timestamp: new Date().toISOString(),
      },
    };

    // Store in live cache
    this.liveStore.set(rid, stateRecord);

    // Broadcast immediately to all connected owner dashboards
    const clientsNotified = sseService.broadcastToRestaurant(rid, stateRecord.payload);

    return {
      success: true,
      restaurantId: rid,
      receivedAt: stateRecord.lastReceivedAt,
      clientsNotified,
    };
  }

  /**
   * Retrieves latest cached state for owner when they first open the app.
   */
  getLatestState(restaurantId) {
    const rid = String(restaurantId);
    return this.liveStore.get(rid) || null;
  }
}

module.exports = new SyncService();

