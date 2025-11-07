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
      
      // Check if there are accounts with different user_ids for this email
      if (userCheck.rows.length > 0) {
        const allUserIds = userCheck.rows.map(u => u.id);
        console.log('📋 All user IDs for this email:', allUserIds);
      }
    }
    
    // TEMPORARY FIX: If Authorization header is present (even if userId is null due to token issues),
    // return ALL accounts to recover production accounts
    // TODO: After fixing user_id issues, revert to proper filtering
    let result;
    const hasAuthHeader = req.headers['authorization'];
    
    if (userId || hasAuthHeader) {
      // Return ALL accounts - this is temporary to recover production accounts
      // In production, accounts might have been created with user_id = NULL or different user_id
      result = await pool.query(
        `SELECT * FROM bank_accounts 
         ORDER BY created_at DESC`
      );
      console.log('⚠️ TEMPORARY: Returning ALL accounts (not filtered by user_id)');
      console.log('   Reason: userId =', userId, 'hasAuthHeader =', !!hasAuthHeader);
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

    // Deduplicate accounts: if same name + account_type, keep the one with correct user_id (or oldest if same)
    const deduplicatedAccounts = [];
    const seen = new Map(); // key: "name|account_type" -> account id to keep
    const accountMapping = new Map(); // duplicate account_id -> keep account_id (for transaction reassignment)
    
    // Sort by user_id (prefer non-null), then by created_at (oldest first)
    const sortedAccounts = result.rows.sort((a, b) => {
      // First, prefer accounts with user_id matching the current user
      if (userId) {
        if (a.user_id === userId && b.user_id !== userId) return -1;
        if (a.user_id !== userId && b.user_id === userId) return 1;
      }
      // Then prefer non-null user_id
      if (a.user_id !== null && b.user_id === null) return -1;
      if (a.user_id === null && b.user_id !== null) return 1;
      // Finally, prefer older accounts
      return new Date(a.created_at) - new Date(b.created_at);
    });

    for (const account of sortedAccounts) {
      const key = `${account.name.toLowerCase()}|${account.account_type}`;
      if (!seen.has(key)) {
        seen.set(key, account.id);
        deduplicatedAccounts.push(account);
      } else {
        const keepAccountId = seen.get(key);
        accountMapping.set(account.id, keepAccountId);
        console.log(`⚠️ Skipping duplicate account: ${account.name} (${account.account_type}) - ID: ${account.id}, user_id: ${account.user_id}`);
        console.log(`   → Transactions will be reassigned to account ID: ${keepAccountId}`);
      }
    }

    // Reassign transactions from duplicate accounts to kept accounts
    if (accountMapping.size > 0) {
      console.log(`🔄 Reassigning transactions from ${accountMapping.size} duplicate account(s)...`);
      for (const [duplicateId, keepId] of accountMapping.entries()) {
        const updateResult = await pool.query(
          `UPDATE transactions 
           SET account_id = $1 
           WHERE account_id = $2 
           RETURNING id`,
          [keepId, duplicateId]
        );
        console.log(`   ✅ Reassigned ${updateResult.rows.length} transactions from account ${duplicateId} to ${keepId}`);
      }
    }

    console.log(`📋 Deduplicated: ${result.rows.length} → ${deduplicatedAccounts.length} accounts`);

    res.json({ accounts: deduplicatedAccounts });
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
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { id } = req.params;

    await client.query('BEGIN');

    // First, verify the account exists and belongs to the user
    const accountCheck = await client.query(
      `SELECT id, name FROM bank_accounts 
       WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
      [id, userId]
    );

    if (accountCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found' });
    }

    const accountName = accountCheck.rows[0].name;
    
    // Delete all transactions associated with this account
    const deleteTransactionsResult = await client.query(
      `DELETE FROM transactions 
       WHERE account_id = $1 
       RETURNING id`,
      [id]
    );
    
    console.log(`🗑️ Deleted ${deleteTransactionsResult.rows.length} transactions from account "${accountName}" (ID: ${id})`);

    // Delete the account
    const deleteAccountResult = await client.query(
      `DELETE FROM bank_accounts 
       WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
       RETURNING id, name`,
      [id, userId]
    );

    await client.query('COMMIT');

    console.log(`✅ Successfully deleted account "${accountName}" (ID: ${id}) and ${deleteTransactionsResult.rows.length} associated transactions`);

    res.json({ 
      message: 'Account deleted successfully',
      deletedTransactions: deleteTransactionsResult.rows.length,
      account: deleteAccountResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  } finally {
    client.release();
  }
});

// Clean up duplicate accounts (keep oldest, delete newer duplicates)
router.post('/cleanup-duplicates', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const hasAuthHeader = req.headers['authorization'];
    
    if (!userId && !hasAuthHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get all accounts
    const allAccounts = await pool.query(
      `SELECT id, name, account_type, user_id, created_at 
       FROM bank_accounts 
       ORDER BY created_at ASC`
    );

    const seen = new Map(); // key: "name|account_type" -> account id to keep
    const toDelete = [];

    for (const account of allAccounts.rows) {
      const key = `${account.name.toLowerCase()}|${account.account_type}`;
      
      if (!seen.has(key)) {
        // First occurrence - keep this one
        seen.set(key, account.id);
      } else {
        // Duplicate found - mark for deletion
        const keepId = seen.get(key);
        const keepAccount = allAccounts.rows.find(a => a.id === keepId);
        
        // Prefer keeping account with correct user_id
        if (userId) {
          if (account.user_id === userId && keepAccount.user_id !== userId) {
            // Current account has correct user_id, keep it instead
            toDelete.push(keepId);
            seen.set(key, account.id);
            continue;
          }
        }
        
        // Keep the original, delete this duplicate
        toDelete.push(account.id);
      }
    }

    if (toDelete.length === 0) {
      return res.json({ 
        message: 'No duplicate accounts found',
        deleted: 0 
      });
    }

    // Reassign transactions from duplicate accounts to kept accounts before deletion
    console.log(`🔄 Reassigning transactions from ${toDelete.length} duplicate account(s)...`);
    for (const duplicateId of toDelete) {
      const duplicateAccount = allAccounts.rows.find(a => a.id === duplicateId);
      if (!duplicateAccount) continue;
      
      const key = `${duplicateAccount.name.toLowerCase()}|${duplicateAccount.account_type}`;
      const keepId = seen.get(key);
      
      if (keepId && keepId !== duplicateId) {
        const updateResult = await pool.query(
          `UPDATE transactions 
           SET account_id = $1 
           WHERE account_id = $2 
           RETURNING id`,
          [keepId, duplicateId]
        );
        console.log(`   ✅ Reassigned ${updateResult.rows.length} transactions from account ${duplicateId} to ${keepId}`);
      }
    }

    // Delete duplicate accounts
    const deleteResult = await pool.query(
      `DELETE FROM bank_accounts 
       WHERE id = ANY($1::int[])
       RETURNING id, name, account_type`,
      [toDelete]
    );

    console.log(`🗑️ Deleted ${deleteResult.rows.length} duplicate accounts:`, deleteResult.rows);

    res.json({ 
      message: `Deleted ${deleteResult.rows.length} duplicate account(s)`,
      deleted: deleteResult.rows.length,
      accounts: deleteResult.rows
    });
  } catch (error) {
    console.error('Cleanup duplicates error:', error);
    res.status(500).json({ error: 'Failed to cleanup duplicates' });
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





