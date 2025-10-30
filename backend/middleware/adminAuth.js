import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Verify JWT token AND check if user is admin
export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is admin
    const result = await pool.query(
      'SELECT id, email, full_name, is_admin FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check if user is admin
    if (!user.is_admin) {
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.',
        message: '🚫 This area is restricted to administrators only.'
      });
    }

    // User is admin, attach to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check admin status without requiring authentication (for login page)
export const checkAdminStatus = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length > 0) {
      req.isAdmin = result.rows[0].is_admin;
    }

    next();
  } catch (error) {
    next();
  }
};

