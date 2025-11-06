import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all bank accounts
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const userEmail = req.user?.email || null;
    
    console.log('📋 Fetching accounts for userId:', userId);
    console.log('📋 User email:', userEmail);
    console.log('📋 User object:', req.user);
    
    // First, let's check what accounts exist in the database (for debugging)
    const allAccountsCheck = await pool.query(
      `SELECT id, name, user_id, account_type, created_at FROM bank_accounts ORDER BY created_at DESC LIMIT 50`
    );
    console.log('📋 ALL accounts in database (first 50):', allAccountsCheck.rows.map(a => ({ 
      id: a.id, 
      name: a.name, 
      user_id: a.user_id, 
      type: a.account_type,
      created: a.created_at 
    })));
    
    // Also check what users exist
    if (userEmail) {
      const userCheck = await pool.query(
        `SELECT id, email FROM users WHERE email = $1`,
        [userEmail]
      );
      console.log('📋 User lookup by email:', userCheck.rows);
    }
    
    // Query to get ALL accounts - both user-specific and shared (NULL user_id)
    // This ensures we don't miss any accounts
    let result;
    if (userId) {
      // If user is logged in, get their accounts + shared accounts
      // Try both user_id formats to be safe
      result = await pool.query(
        `SELECT * FROM bank_accounts 
         WHERE user_id IS NULL OR user_id = $1 OR user_id::text = $2
         ORDER BY created_at DESC`,
        [userId, userId?.toString()]
      );
    } else {
      // If not logged in, get only shared accounts (user_id IS NULL)
      result = await pool.query(
        `SELECT * FROM bank_accounts 
         WHERE user_id IS NULL
         ORDER BY created_at DESC`
      );
    }

    console.log('📋 Found accounts:', result.rows.length);
    console.log('📋 Accounts returned:', result.rows.map(a => ({ id: a.id, name: a.name, user_id: a.user_id })));

    res.json({ accounts: result.rows });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Create new bank account
router.post('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { name, accountType, color, initialAmount, currency, excludeFromStats, creditLimit } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Account name is required' });
    }

    // For credit cards, balance should be negative (debt)
    const balance = accountType === 'credit' ? -Math.abs(initialAmount || 0) : (initialAmount || 0);

    const result = await pool.query(
      `INSERT INTO bank_accounts (user_id, name, account_type, color, balance, currency, exclude_from_stats, credit_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, name, accountType || 'General', color || '#6d4c41', balance, currency || 'EUR', excludeFromStats || false, creditLimit || null]
    );

    res.status(201).json({ 
      message: 'Account created successfully',
      account: result.rows[0] 
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Update bank account
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { id } = req.params;
    
    console.log('📥 RECEIVED REQUEST BODY:', JSON.stringify(req.body, null, 2));
    
    const { name, accountType, color, balance, currency, excludeFromStats, creditLimit, initialAmount } = req.body;

    console.log(`📝 Updating account ${id}:`, { name, accountType, creditLimit, balance, initialAmount });

    // For credit cards, use initialAmount if provided, otherwise use balance
    let finalBalance;
    if (accountType === 'credit') {
      finalBalance = initialAmount !== undefined ? -Math.abs(initialAmount) : -Math.abs(balance || 0);
    } else {
      finalBalance = initialAmount !== undefined ? initialAmount : (balance || 0);
    }

    const finalCreditLimit = creditLimit !== undefined && creditLimit !== null ? parseFloat(creditLimit) : null;
    
    console.log(`   Final balance: ${finalBalance}, Final credit limit: ${finalCreditLimit}`);

    console.log('🗄️  EXECUTING SQL UPDATE with values:', [name, accountType, color, finalBalance, currency, excludeFromStats, finalCreditLimit, id, userId]);
    
    const result = await pool.query(
      `UPDATE bank_accounts 
       SET name = $1, account_type = $2, color = $3, balance = $4, currency = $5, exclude_from_stats = $6, credit_limit = $7
       WHERE id = $8 AND (user_id IS NULL OR user_id = $9)
       RETURNING *`,
      [name, accountType, color, finalBalance, currency, excludeFromStats, finalCreditLimit, id, userId]
    );

    console.log('📊 SQL UPDATE result rows:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('✅ Updated row:', JSON.stringify(result.rows[0], null, 2));
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ 
      message: 'Account updated successfully',
      account: result.rows[0] 
    });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete bank account
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM bank_accounts 
       WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Recalculate account balance from transactions
router.post('/:id/recalculate-balance', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { id } = req.params;

    // Get the account info first
    const accountResult = await pool.query(
      `SELECT account_type, balance FROM bank_accounts WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
      [id, userId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accountResult.rows[0];
    const isCreditCard = account.account_type === 'credit';

    // Get all transactions for this account
    const result = await pool.query(
      `SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as calculated_balance
       FROM transactions
       WHERE account_id = $1 AND (user_id IS NULL OR user_id = $2) AND computable = true`,
      [id, userId]
    );

    const transactionSum = parseFloat(result.rows[0]?.calculated_balance || 0);
    
    // For credit cards, the balance is already negative (debt)
    // Transactions add to or reduce the debt
    // So we just use the transaction sum directly (expenses are negative, refunds are positive)
    const calculatedBalance = transactionSum;

    // Update the account balance
    const updateResult = await pool.query(
      `UPDATE bank_accounts 
       SET balance = $1, balance_updated_at = NOW(), balance_source = 'calculated'
       WHERE id = $2 AND (user_id IS NULL OR user_id = $3)
       RETURNING *`,
      [calculatedBalance, id, userId]
    );

    console.log(`✅ Updated balance for account ${id}: €${calculatedBalance}`);

    res.json({ 
      message: 'Balance recalculated successfully',
      account: updateResult.rows[0],
      previousBalance: parseFloat(account.balance),
      calculatedBalance: calculatedBalance
    });
  } catch (error) {
    console.error('Recalculate balance error:', error);
    res.status(500).json({ error: 'Failed to recalculate balance' });
  }
});

export default router;





