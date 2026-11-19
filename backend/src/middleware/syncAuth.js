const pool = require('../config/db');

module.exports = async function authenticateSync(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const restaurantId = req.headers['x-restaurant-id'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized: Missing X-API-KEY header.' });
  }

  const expectedMasterKey = process.env.DEFAULT_SYNC_API_KEY || 'aaharin_firm_master_token_2026';
  let matchedRestaurantId = null;

  // 1. Check if matching individual restaurant sync license key
  try {
    const [rows] = await pool.query(
      'SELECT id, status, addon_features FROM vaidi_restaurant_master WHERE sync_license_key = ? LIMIT 1',
      [apiKey]
    );
    if (rows && rows.length > 0) {
      const rest = rows[0];
      if (String(rest.status).toLowerCase() !== 'active') {
        return res.status(403).json({ error: 'Forbidden: Restaurant is inactive.' });
      }
      matchedRestaurantId = rest.id;
    }
  } catch (err) {
    console.error('[syncAuth db lookup error]:', err.message);
  }

  // 2. Fallback to Master API Key with x-restaurant-id
  if (!matchedRestaurantId && apiKey === expectedMasterKey) {
    const cleanRid = parseInt(restaurantId, 10);
    if (cleanRid && cleanRid > 0) {
      matchedRestaurantId = cleanRid;
    }
  }

  if (!matchedRestaurantId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid X-API-KEY or unregistered restaurant key.' });
  }

  req.syncContext = {
    restaurantId: matchedRestaurantId,
  };

  next();
};
