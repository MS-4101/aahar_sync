const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
  /**
   * Verifies user credentials against AaharIN vaidi_users table.
   * Allows login via username, email, or mobile number.
   */
  async login(identifier, password) {
    if (!identifier || !password) {
      throw new Error('Username/Mobile and Password are required.');
    }

    const cleanId = String(identifier).trim();

    // Query user by mobile_number, username, or email
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.mobile_number, u.password_hash, u.restaurant_id, u.role_id, u.status,
              r.role_name
       FROM vaidi_users u 
       LEFT JOIN vaidi_role_master r ON r.id = u.role_id
       WHERE (u.mobile_number = ? OR u.username = ? OR u.email = ?) AND u.status = 'Active' 
       LIMIT 1`,
      [cleanId, cleanId, cleanId]
    );

    if (rows.length === 0) {
      throw new Error('Invalid mobile number or username. Account not found.');
    }

    const user = rows[0];

    // Enforce role: Only Restaurant Owner (role_id 4) or Admin (role_id 1)
    const isOwner =
      user.role_id === 4 ||
      user.role_id === 1 ||
      String(user.role_name || '').toLowerCase().includes('owner') ||
      String(user.role_name || '').toLowerCase().includes('admin');

    if (!isOwner) {
      throw new Error('Access denied. Only registered Restaurant Owners are authorized to log in.');
    }

    // Verify Password Hash (Handle PHP $2y$ prefix for standard bcryptjs compatibility)
    let hash = user.password_hash || '';
    if (hash.startsWith('$2y$')) {
      hash = '$2a$' + hash.substring(4);
    }

    const isMatch = bcrypt.compareSync(password, hash);
    if (!isMatch) {
      throw new Error('Invalid password. Please enter your correct AaharIN account password.');
    }

    // Fetch accessible restaurants for this user and check Addon Feature status
    let restaurants = [];
    if (user.restaurant_id) {
      const [rRows] = await pool.query(
        `SELECT id, restaurant_name, city, mobile_no, addon_features, status 
         FROM vaidi_restaurant_master 
         WHERE id = ?`,
        [user.restaurant_id]
      );
      restaurants = rRows;
    } else {
      // If superadmin or unassigned, fetch active restaurants
      const [rRows] = await pool.query(
        `SELECT id, restaurant_name, city, mobile_no, addon_features, status 
         FROM vaidi_restaurant_master 
         ORDER BY id ASC LIMIT 5`
      );
      restaurants = rRows;
    }

    const primaryRestaurant = restaurants[0] || null;

    // Check Cloud Sync Dashboard Addon Feature for primary restaurant
    let isCloudSyncEnabled = true;
    let cloudSyncDisabledReason = '';

    if (primaryRestaurant) {
      let features = {};
      try {
        features = typeof primaryRestaurant.addon_features === 'string'
          ? JSON.parse(primaryRestaurant.addon_features || '{}')
          : (primaryRestaurant.addon_features || {});
      } catch (_) {
        features = {};
      }

      isCloudSyncEnabled = !!features.cloud_sync_dashboard && String(primaryRestaurant.status).toLowerCase() === 'active';
      if (!isCloudSyncEnabled) {
        cloudSyncDisabledReason = 'Cloud Sync Dashboard addon is currently disabled in Firm Master.';
      }
    }

    // Generate JWT Token
    const payload = {
      userId: user.id,
      username: user.username,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
      email: user.email,
      mobile: user.mobile_number,
      role: user.role_name || 'Restaurant Owner',
      restaurants: restaurants.map((r) => {
        let f = {};
        try {
          f = typeof r.addon_features === 'string' ? JSON.parse(r.addon_features || '{}') : (r.addon_features || {});
        } catch (_) {}
        return {
          id: r.id,
          name: r.restaurant_name,
          city: r.city,
          isCloudSyncEnabled: !!f.cloud_sync_dashboard && String(r.status).toLowerCase() === 'active',
        };
      }),
      primaryRestaurantId: primaryRestaurant?.id || null,
      isCloudSyncEnabled,
      cloudSyncDisabledReason,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'aaharin_default_secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });

    return {
      token,
      user: payload,
    };
  }
}

module.exports = new AuthService();

