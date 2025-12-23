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
    
    // Get accounts for the current user
    let result;
    
    if (userId) {
      // User is logged in - get their accounts
      result = await pool.query(
        `SELECT * FROM bank_accounts 
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
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
      const key = `${account.name.toLowerCase().trim()}|${account.account_type || 'checking'}`;
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
       WHERE id = $8 AND user_id = $9
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
       WHERE id = $1 AND user_id = $2`,
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
       WHERE id = $1 AND user_id = $2
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
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { id } = req.params;

    console.log(`🔄 Recalculating balance for account ${id} (userId: ${userId})`);

    // Get the account info first
    const accountResult = await client.query(
      `SELECT id, name, account_type, balance, user_id FROM bank_accounts 
       WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
      [id, userId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accountResult.rows[0];
    const accountUserId = account.user_id; // Use account's user_id, not request userId

    console.log(`📊 Account: ${account.name} (${account.account_type}), current balance: €${parseFloat(account.balance || 0).toFixed(2)}`);

    // Get all transactions for this account
    // Use account's user_id to handle both shared (NULL) and user-specific accounts
    const result = await client.query(
      `SELECT 
         COUNT(*) as transaction_count,
         SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as calculated_balance,
         SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
         SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
       FROM transactions
       WHERE account_id = $1 
         AND (user_id IS NULL OR user_id = $2) 
         AND computable = true`,
      [id, accountUserId]
    );

    const transactionData = result.rows[0];
    const transactionCount = parseInt(transactionData.transaction_count || 0);
    const transactionSum = parseFloat(transactionData.calculated_balance || 0);
    const totalIncome = parseFloat(transactionData.total_income || 0);
    const totalExpenses = parseFloat(transactionData.total_expenses || 0);

    console.log(`📈 Transactions: ${transactionCount} (Income: €${totalIncome.toFixed(2)}, Expenses: €${totalExpenses.toFixed(2)})`);
    console.log(`💰 Calculated sum: €${transactionSum.toFixed(2)}`);

    // For credit cards:
    // - Expenses increase debt (make balance more negative)
    // - Income (payments/refunds) decrease debt (make balance less negative)
    // The formula SUM(income) - SUM(expenses) already handles this correctly
    // because expenses are stored as negative amounts in transactions
    // So transactionSum will be negative for credit cards with debt
    
    // For regular accounts:
    // - Income increases balance (positive)
    // - Expenses decrease balance (negative)
    // Same formula works: SUM(income) - SUM(expenses)
    
    const calculatedBalance = transactionSum;

    console.log(`✅ Final calculated balance: €${calculatedBalance.toFixed(2)}`);

    // Update the account balance
    await client.query('BEGIN');
    
    const updateResult = await client.query(
      `UPDATE bank_accounts 
       SET balance = $1, balance_updated_at = NOW(), balance_source = 'calculated'
       WHERE id = $2
       RETURNING *`,
      [calculatedBalance, id]
    );

    await client.query('COMMIT');

    console.log(`✅ Updated balance for account ${account.name}: €${parseFloat(account.balance).toFixed(2)} → €${calculatedBalance.toFixed(2)}`);

    res.json({ 
      message: 'Balance recalculated successfully',
      account: updateResult.rows[0],
      previousBalance: parseFloat(account.balance),
      calculatedBalance: calculatedBalance,
      transactionCount: transactionCount,
      totalIncome: totalIncome,
      totalExpenses: totalExpenses
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Recalculate balance error:', error);
    res.status(500).json({ 
      error: 'Failed to recalculate balance',
      message: error.message
    });
  } finally {
    client.release();
  }
});

// Find and remove duplicate transactions, then recalculate balances
router.post('/cleanup-transaction-duplicates', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { dryRun = false } = req.body;
    
    console.log('🔍 Finding duplicate transactions...', { userId, dryRun });
    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be made');
    }
    
    // Find all duplicate groups - use flexible matching:
    // 1. First try exact matches (date, description, amount, account_id, user_id)
    // 2. Then try flexible matches (date, description, amount - ignoring account_id)
    // This catches duplicates where account_id might differ (uploaded before/after account selection)
    
    let duplicatesQuery;
    if (userId) {
      // Try flexible matching first (ignoring account_id differences)
      duplicatesQuery = await client.query(
        `SELECT 
          date,
          TRIM(description) as description,
          amount,
          account_id,
          user_id,
          COUNT(*) as count,
          ARRAY_AGG(id ORDER BY id ASC)::int[] as transaction_ids,
          ARRAY_AGG(account_id) as account_ids
        FROM transactions
        WHERE user_id = $1
        GROUP BY date, TRIM(description), amount, user_id
        HAVING COUNT(*) > 1
        ORDER BY date DESC`,
        [userId]
      );
      
      // If no flexible matches, try exact matches
      if (duplicatesQuery.rows.length === 0) {
        duplicatesQuery = await client.query(
          `SELECT 
            date,
            description,
            amount,
            account_id,
            user_id,
            COUNT(*) as count,
            ARRAY_AGG(id ORDER BY id ASC)::int[] as transaction_ids
          FROM transactions
          WHERE user_id = $1
          GROUP BY date, description, amount, account_id, user_id
          HAVING COUNT(*) > 1
          ORDER BY date DESC`,
          [userId]
        );
      }
    } else {
      // Try flexible matching first (ignoring account_id differences)
      duplicatesQuery = await client.query(
        `SELECT 
          date,
          TRIM(description) as description,
          amount,
          account_id,
          user_id,
          COUNT(*) as count,
          ARRAY_AGG(id ORDER BY id ASC)::int[] as transaction_ids,
          ARRAY_AGG(account_id) as account_ids
        FROM transactions
        WHERE user_id IS NULL
        GROUP BY date, TRIM(description), amount, user_id
        HAVING COUNT(*) > 1
        ORDER BY date DESC`
      );
      
      // If no flexible matches, try exact matches
      if (duplicatesQuery.rows.length === 0) {
        duplicatesQuery = await client.query(
          `SELECT 
            date,
            description,
            amount,
            account_id,
            user_id,
            COUNT(*) as count,
            ARRAY_AGG(id ORDER BY id ASC)::int[] as transaction_ids
          FROM transactions
          WHERE user_id IS NULL
          GROUP BY date, description, amount, account_id, user_id
          HAVING COUNT(*) > 1
          ORDER BY date DESC`
        );
      }
    }

    const duplicateGroups = duplicatesQuery.rows;
    console.log(`📊 Found ${duplicateGroups.length} sets of duplicate transactions`);
    
    // Log sample duplicates for debugging
    if (duplicateGroups.length > 0) {
      console.log('Sample duplicates:');
      duplicateGroups.slice(0, 3).forEach((dup, idx) => {
        console.log(`  ${idx + 1}. Date: ${dup.date}, Amount: €${dup.amount}, Count: ${dup.count}`);
        console.log(`     Description: ${dup.description?.substring(0, 60)}...`);
        if (dup.account_ids) {
          console.log(`     Account IDs: ${dup.account_ids.join(', ')}`);
        }
      });
    }

    if (duplicateGroups.length === 0) {
      // Check total transaction count for diagnostic info
      let totalCountQuery;
      if (userId) {
        totalCountQuery = await client.query(
          `SELECT COUNT(*) as total FROM transactions WHERE user_id = $1`,
          [userId]
        );
      } else {
        totalCountQuery = await client.query(
          `SELECT COUNT(*) as total FROM transactions WHERE user_id IS NULL`
        );
      }
      const totalTransactions = totalCountQuery.rows[0]?.total || 0;
      
      client.release();
      return res.json({ 
        message: 'No duplicate transactions found using flexible matching (date, description, amount). All transactions appear unique.',
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        accountsRecalculated: [],
        totalTransactions: parseInt(totalTransactions),
        note: 'If balance is incorrect, try recalculating individual account balances using the refresh button.'
      });
    }

    let totalDuplicatesToDelete = 0;
    const duplicatesToDelete = [];
    const affectedAccounts = new Set();

    // Analyze duplicates
    duplicateGroups.forEach((dup) => {
      // Ensure transaction_ids is an array (PostgreSQL might return it as a string)
      let transactionIds = dup.transaction_ids;
      if (typeof transactionIds === 'string') {
        try {
          transactionIds = JSON.parse(transactionIds);
        } catch (e) {
          // If parsing fails, try splitting by comma
          transactionIds = transactionIds.split(',').map(id => parseInt(id.trim()));
        }
      }
      if (!Array.isArray(transactionIds) || transactionIds.length < 2) {
        console.warn('⚠️ Invalid transaction_ids format:', transactionIds);
        return;
      }
      
      const keepId = transactionIds[0]; // Keep the oldest (first) transaction
      const deleteIds = transactionIds.slice(1); // Delete the rest
      
      if (dup.account_id) {
        affectedAccounts.add(dup.account_id);
      }

      duplicatesToDelete.push(...deleteIds);
      totalDuplicatesToDelete += deleteIds.length;
    });

    console.log(`   Total transactions to delete: ${totalDuplicatesToDelete}`);
    console.log(`   Affected accounts: ${affectedAccounts.size}`);

    if (dryRun) {
      client.release();
      return res.json({
        message: 'Dry run completed - no changes made',
        duplicatesFound: duplicateGroups.length,
        duplicatesToRemove: totalDuplicatesToDelete,
        affectedAccounts: Array.from(affectedAccounts),
        dryRun: true
      });
    }

    if (duplicatesToDelete.length === 0) {
      client.release();
      return res.json({ 
        message: 'No duplicates to delete',
        duplicatesFound: 0,
        duplicatesRemoved: 0
      });
    }

    // Start transaction
    await client.query('BEGIN');
    transactionStarted = true;

    // Delete duplicate transactions
    console.log('🗑️  Deleting duplicate transactions...', { count: duplicatesToDelete.length });
    
    if (duplicatesToDelete.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      client.release();
      return res.json({ 
        message: 'No duplicates to delete',
        duplicatesFound: 0,
        duplicatesRemoved: 0
      });
    }
    
    const deleteResult = await client.query(
      `DELETE FROM transactions 
       WHERE id = ANY($1::int[])
       RETURNING id, account_id`,
      [duplicatesToDelete]
    );

    console.log(`✅ Successfully deleted ${deleteResult.rowCount} duplicate transaction(s)`);

    // Recalculate balances for affected accounts
    const recalculatedAccounts = [];
    if (affectedAccounts.size > 0) {
      console.log('🔄 Recalculating balances for affected accounts...');
      
      for (const accountId of affectedAccounts) {
        // Get account info
        const accountResult = await client.query(
          `SELECT id, name, user_id FROM bank_accounts WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
          [accountId, userId]
        );
        
        if (accountResult.rows.length === 0) {
          continue;
        }
        
        const account = accountResult.rows[0];
        const accountUserId = account.user_id;
        
        // Calculate balance from transactions
        const balanceResult = await client.query(
          `SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as calculated_balance
           FROM transactions
           WHERE account_id = $1 AND (user_id IS NULL OR user_id = $2) AND computable = true`,
          [accountId, accountUserId]
        );
        
        const calculatedBalance = parseFloat(balanceResult.rows[0]?.calculated_balance || 0);
        
        // Update account balance
        await client.query(
          `UPDATE bank_accounts 
           SET balance = $1, balance_updated_at = NOW(), balance_source = 'calculated'
           WHERE id = $2`,
          [calculatedBalance, accountId]
        );
        
        recalculatedAccounts.push({
          id: accountId,
          name: account.name,
          newBalance: calculatedBalance
        });
        
        console.log(`✅ ${account.name}: Updated balance to €${calculatedBalance.toFixed(2)}`);
      }
    }

    await client.query('COMMIT');
    client.release();

    console.log('✅ Duplicate removal and balance recalculation completed');

    res.json({ 
      message: 'Duplicate transactions removed and balances recalculated',
      duplicatesFound: duplicateGroups.length,
      duplicatesRemoved: deleteResult.rowCount,
      accountsRecalculated: recalculatedAccounts
    });
    
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    console.error('❌ Cleanup transaction duplicates error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Failed to cleanup duplicate transactions',
      message: error.message || 'Unknown error occurred'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router;





