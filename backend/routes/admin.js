import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0] || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// Get all users (admin endpoint)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.created_at,
        COUNT(DISTINCT t.id) as transaction_count,
        COUNT(DISTINCT ba.id) as account_count,
        COALESCE(SUM(CASE WHEN ba.account_type = 'credit' THEN ba.balance ELSE 0 END), 0) as total_credit_debt,
        COALESCE(SUM(CASE WHEN ba.account_type != 'credit' THEN ba.balance ELSE 0 END), 0) as total_balance
      FROM users u
      LEFT JOIN transactions t ON t.user_id = u.id
      LEFT JOIN bank_accounts ba ON ba.user_id = u.id
      GROUP BY u.id, u.email, u.full_name, u.created_at
      ORDER BY u.created_at DESC
    `);

    res.json({ 
      users: result.rows,
      total: result.rows.length 
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user details by ID
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user info
    const userResult = await pool.query(
      'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's accounts
    const accountsResult = await pool.query(
      'SELECT id, name, account_type, balance, currency, created_at FROM bank_accounts WHERE user_id = $1',
      [id]
    );

    // Get user's transaction count
    const transactionsResult = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE user_id = $1',
      [id]
    );

    // Get user's recent transactions
    const recentTransactionsResult = await pool.query(
      'SELECT id, date, description, amount, category, type FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT 10',
      [id]
    );

    res.json({
      user: userResult.rows[0],
      accounts: accountsResult.rows,
      transaction_count: parseInt(transactionsResult.rows[0].count),
      recent_transactions: recentTransactionsResult.rows
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Get system statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total users
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    
    // Total transactions
    const transactionsResult = await pool.query('SELECT COUNT(*) as count FROM transactions');
    
    // Total accounts
    const accountsResult = await pool.query('SELECT COUNT(*) as count FROM bank_accounts');
    
    // Users created in last 7 days
    const recentUsersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '7 days'"
    );

    // Total balance across all accounts
    const balanceResult = await pool.query(
      'SELECT COALESCE(SUM(balance), 0) as total FROM bank_accounts'
    );

    res.json({
      total_users: parseInt(usersResult.rows[0].count),
      total_transactions: parseInt(transactionsResult.rows[0].count),
      total_accounts: parseInt(accountsResult.rows[0].count),
      recent_users: parseInt(recentUsersResult.rows[0].count),
      total_balance: parseFloat(balanceResult.rows[0].total)
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Delete user (dangerous - use with caution)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Delete user's transactions
    await client.query('DELETE FROM transactions WHERE user_id = $1', [id]);

    // Delete user's bank accounts
    await client.query('DELETE FROM bank_accounts WHERE user_id = $1', [id]);

    // Delete user
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING email', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await client.query('COMMIT');

    res.json({ 
      message: 'User deleted successfully',
      email: result.rows[0].email 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    client.release();
  }
});

export default router;

