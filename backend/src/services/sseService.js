/**
 * Server-Sent Events (SSE) Real-Time Broadcast Service
 *
 * Streams live state to connected owner phones/tablets.
 * Multi-tenant: Isolates clients by restaurantId.
 */
class SseService {
  constructor() {
    // Map of restaurantId -> Set of response objects
    this.clients = new Map();

    // Heartbeat every 15s to keep connections alive through proxies/Plesk
    setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  /**
   * Registers a connected mobile client for a specific restaurant.
   */
  addClient(restaurantId, res) {
    const rid = String(restaurantId);
    if (!this.clients.has(rid)) {
      this.clients.set(rid, new Set());
    }

    this.clients.get(rid).add(res);

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx/Plesk response buffering
    res.flushHeaders?.();

    // Initial greeting event
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'STREAM_CONNECTED', restaurantId: rid, timestamp: new Date().toISOString() })}\n\n`);

    // Cleanup on disconnect
    res.on('close', () => {
      this.removeClient(rid, res);
    });
  }

  /**
   * Removes disconnected client.
   */
  removeClient(restaurantId, res) {
    const rid = String(restaurantId);
    if (this.clients.has(rid)) {
      this.clients.get(rid).delete(res);
      if (this.clients.get(rid).size === 0) {
        this.clients.delete(rid);
      }
    }
  }

  /**
   * Broadcasts live payload to all active screens of a specific restaurant.
   */
  broadcastToRestaurant(restaurantId, payload) {
    const rid = String(restaurantId);
    const clientSet = this.clients.get(rid);

    if (!clientSet || clientSet.size === 0) {
      return 0; // No active listeners
    }

    const sseMessage = `event: live_update\ndata: ${JSON.stringify(payload)}\n\n`;
    let deliveredCount = 0;

    for (const res of clientSet) {
      try {
        res.write(sseMessage);
        deliveredCount++;
      } catch (err) {
        this.removeClient(rid, res);
      }
    }

    return deliveredCount;
  }

  /**
   * Keepalive ping to prevent proxy connection dropouts.
   */
  sendHeartbeat() {
    const ping = `:heartbeat ${Date.now()}\n\n`;
    for (const [rid, set] of this.clients.entries()) {
      for (const res of set) {
        try {
          res.write(ping);
        } catch (err) {
          this.removeClient(rid, res);
        }
      }
    }
  }

  getClientCount(restaurantId) {
    const rid = String(restaurantId);
    return this.clients.get(rid)?.size || 0;
  }
}

module.exports = new SseService();

