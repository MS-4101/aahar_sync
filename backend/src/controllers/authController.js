const authService = require('../services/authService');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const result = await authService.login(username, password);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Authentication failed.' });
  }
};

exports.getMe = async (req, res) => {
  return res.status(200).json({ user: req.user });
};

