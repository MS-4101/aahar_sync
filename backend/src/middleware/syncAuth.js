module.exports = function authenticateSync(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const restaurantId = req.headers['x-restaurant-id'];

  const expectedKey = process.env.DEFAULT_SYNC_API_KEY || 'aaharin_firm_master_token_2026';

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-API-KEY.' });
  }

  const cleanRid = parseInt(restaurantId, 10);
  if (!cleanRid || cleanRid <= 0) {
    return res.status(400).json({ error: 'Bad Request: Invalid or missing X-Restaurant-ID header.' });
  }

  req.syncContext = {
    restaurantId: cleanRid,
  };

  next();
};

