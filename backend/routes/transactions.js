import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Upload/save transactions
router.post('/upload', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { transactions, account_id, lastBalance } = req.body;
    const userId = req.user?.id || req.user?.userId || null;

    console.log(`📥 Upload request received:`, {
      transactionCount: transactions?.length || 0,
      account_id,
      lastBalance,
      userId
    });

    if (!transactions || !Array.isArray(transactions)) {
      console.error('❌ Invalid transaction data - not an array');
      return res.status(400).json({ error: 'Invalid transaction data' });
    }

    if (transactions.length === 0) {
      console.warn('⚠️ Empty transactions array received');
      return res.status(400).json({ error: 'No transactions provided' });
    }

    // Log first transaction for debugging
    console.log('📋 First transaction sample:', transactions[0]);

    await client.query('BEGIN');

    const insertedTransactions = [];
    let skippedDuplicates = 0;
    let skippedInvalid = 0;

    // Get common income patterns for auto-detection
    const commonIncomes = await client.query(
      `SELECT DISTINCT description, COUNT(*) as count
       FROM transactions
       WHERE type = 'income'
       AND (user_id IS NULL OR user_id = $1)
       GROUP BY description
       HAVING COUNT(*) >= 2
       ORDER BY count DESC
       LIMIT 10`,
      [userId]
    );
    const recurringIncomeDescriptions = commonIncomes.rows
      .filter(r => r.description) // Filter out null descriptions
      .map(r => r.description.toLowerCase());

    for (const transaction of transactions) {
      const { bank, date, category, description, amount, type, computable } = transaction;
      
      // Validate required fields
      if (!date || !description || amount === undefined || amount === null || !type) {
        skippedInvalid++;
        console.error('❌ Invalid transaction skipped:', {
          date,
          description,
          amount,
          type,
          bank,
          reason: 'Missing required fields'
        });
        continue;
      }
      
      // Validate date format (should be YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        skippedInvalid++;
        console.error('❌ Invalid date format skipped:', date, 'Expected YYYY-MM-DD format');
        continue;
      }
      
      // Validate amount is a number
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount === 0) {
        skippedInvalid++;
        console.error('❌ Invalid amount skipped:', amount);
        continue;
      }
      
      // Auto-exclude Transferencias from analytics
      let isComputable;
      if (category === 'Transferencias') {
        isComputable = false;
        console.log(`🔄 Auto-excluding transfer: "${description}"`);
      } else {
        isComputable = computable !== undefined ? computable : true;
      }

      // Check if transaction already exists (prevent duplicates)
      const duplicateCheck = await client.query(
        `SELECT id FROM transactions 
         WHERE date = $1 
         AND description = $2 
         AND amount = $3 
         AND COALESCE(account_id, 0) = COALESCE($4, 0)
         AND (user_id IS NULL OR user_id = $5)
         LIMIT 1`,
        [date, description, amount, account_id, userId]
      );

      if (duplicateCheck.rows.length > 0) {
        // Skip duplicate transaction
        skippedDuplicates++;
        if (insertedTransactions.length < 5 || skippedDuplicates <= 3) {
          console.log(`⏭️  Skipped duplicate: ${description} on ${date}`);
        }
        continue;
      }

      // Auto-detect income that should be moved to next month
      let applicableMonth = null;
      if (type === 'income') {
        const transactionDate = new Date(date);
        const dayOfMonth = transactionDate.getDate();
        const descriptionLower = description.toLowerCase();
        
        // Check if it's a recurring income (like salary/nomina) and in last week of month
        const isRecurringIncome = recurringIncomeDescriptions.some(pattern => 
          descriptionLower.includes(pattern) || pattern.includes(descriptionLower)
        );
        
        // If it's income in the last 7 days of the month, move to next month
        if ((isRecurringIncome || descriptionLower.includes('nómina') || descriptionLower.includes('nomina') || descriptionLower.includes('salary')) && dayOfMonth >= 25) {
          const nextMonth = new Date(transactionDate);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          applicableMonth = nextMonth.toISOString().slice(0, 7); // 'YYYY-MM'
          console.log(`🔄 Auto-shifting income "${description}" from ${date.slice(0, 7)} to ${applicableMonth}`);
        }
      }

      // Ensure all values are properly formatted
      const cleanBank = bank || 'Unknown';
      const cleanCategory = category || 'Uncategorized';
      const cleanDescription = (description && typeof description === 'string') ? description.trim() : 'Transaction';
      const cleanAmount = parseFloat(amount);
      
      // Validate cleanAmount is valid
      if (isNaN(cleanAmount)) {
        skippedInvalid++;
        console.error('❌ Invalid cleanAmount after parsing:', amount);
        continue;
      }
      
      const result = await client.query(
        `INSERT INTO transactions (user_id, bank, date, category, description, amount, type, account_id, computable, applicable_month)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [userId, cleanBank, date, cleanCategory, cleanDescription, cleanAmount, type, account_id, isComputable, applicableMonth]
      );

      insertedTransactions.push(result.rows[0]);
    }

    // Update account balance if lastBalance provided and account_id exists
    if (account_id && lastBalance !== undefined && lastBalance !== null) {
      await client.query(
        `UPDATE bank_accounts 
         SET balance = $1, balance_updated_at = NOW(), balance_source = 'csv'
         WHERE id = $2 AND (user_id IS NULL OR user_id = $3)`,
        [lastBalance, account_id, userId]
      );
      console.log(`✅ Updated balance for account ${account_id}: €${lastBalance}`);
    }

    // Update summaries
    try {
      await updateSummaries(client, userId);
    } catch (summaryError) {
      console.error('⚠️ Error updating summaries (non-critical):', summaryError);
      // Don't fail the entire upload if summaries fail
    }

    await client.query('COMMIT');

    console.log(`✅ Upload completed:`, {
      inserted: insertedTransactions.length,
      skippedDuplicates,
      skippedInvalid,
      total: transactions.length
    });

    res.status(201).json({
      message: 'Transactions uploaded successfully',
      count: insertedTransactions.length,
      skipped: skippedDuplicates,
      skippedInvalid: skippedInvalid,
      transactions: insertedTransactions,
      balanceUpdated: account_id && lastBalance !== undefined
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Failed to upload transactions',
      message: error.message,
      details: error.detail || error.hint || 'Check server logs'
    });
  } finally {
    client.release();
  }
});

// Get all transactions
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;

    console.log('📋 Fetching transactions for userId:', userId);
    console.log('📋 User object:', req.user);
    
    // First, let's check what transactions exist in the database (for debugging)
    const allTransactionsCheck = await pool.query(
      `SELECT id, date, description, amount, user_id FROM transactions ORDER BY date DESC LIMIT 20`
    );
    console.log('📋 ALL transactions in database (first 20):', allTransactionsCheck.rows.map(t => ({ id: t.id, date: t.date, description: t.description?.substring(0, 30), amount: t.amount, user_id: t.user_id })));

    // Query to get ALL transactions - both user-specific and shared (NULL user_id)
    // TEMPORARY FIX: If Authorization header is present, return ALL transactions (even if userId is null)
    const hasAuthHeader = req.headers['authorization'];
    let result;
    
    if (userId || hasAuthHeader) {
      // If user is logged in (or has auth header), get ALL transactions
      // Try both user_id formats to be safe
      if (userId) {
        result = await pool.query(
          `SELECT 
            t.*,
            COALESCE(
              ba.name,
              (SELECT name FROM bank_accounts WHERE LOWER(name) LIKE '%' || LOWER(t.bank) || '%' LIMIT 1),
              t.bank
            ) as account_name
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id IS NULL OR t.user_id = $1 OR t.user_id::text = $2
           ORDER BY t.date DESC`,
          [userId, userId?.toString()]
        );
      } else {
        // userId is null but has auth header - filter by account_ids to get user's transactions
        // Get user's accounts first
        const userAccountsResult = await pool.query(
          `SELECT id, name FROM bank_accounts ORDER BY created_at DESC`
        );
        const accountIds = userAccountsResult.rows.map(a => a.id);
        
        if (accountIds.length > 0) {
          result = await pool.query(
            `SELECT 
              t.*,
              COALESCE(
                ba.name,
                (SELECT name FROM bank_accounts WHERE LOWER(name) LIKE '%' || LOWER(t.bank) || '%' AND id = ANY($1::int[]) LIMIT 1),
                t.bank
              ) as account_name
             FROM transactions t
             LEFT JOIN bank_accounts ba ON t.account_id = ba.id
             WHERE t.account_id = ANY($1::int[]) OR t.user_id IS NULL
             ORDER BY t.date DESC`,
            [accountIds]
          );
        } else {
          // No accounts found, return only shared transactions
          result = await pool.query(
            `SELECT 
              t.*,
              COALESCE(
                ba.name,
                (SELECT name FROM bank_accounts WHERE LOWER(name) LIKE '%' || LOWER(t.bank) || '%' LIMIT 1),
                t.bank
              ) as account_name
             FROM transactions t
             LEFT JOIN bank_accounts ba ON t.account_id = ba.id
             WHERE t.user_id IS NULL
             ORDER BY t.date DESC`
          );
        }
        console.log('⚠️ TEMPORARY: Filtering by account_ids (userId is null but auth header present)');
      }
    } else {
      // If not logged in, get only shared transactions (user_id IS NULL)
      result = await pool.query(
        `SELECT 
          t.*,
          COALESCE(
            ba.name,
            (SELECT name FROM bank_accounts WHERE LOWER(name) LIKE '%' || LOWER(t.bank) || '%' LIMIT 1),
            t.bank
          ) as account_name
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id IS NULL
         ORDER BY t.date DESC`
      );
    }

    console.log('📋 Found transactions:', result.rows.length);
    console.log('📋 Sample transactions:', result.rows.slice(0, 5).map(t => ({ 
      id: t.id, 
      date: t.date, 
      description: t.description?.substring(0, 30), 
      bank: t.bank,
      account_id: t.account_id,
      account_name: t.account_name
    })));

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Update transaction category
router.patch('/:id/category', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { category, updateSimilar, computable } = req.body;
    const userId = req.user?.id || req.user?.userId || null;

    // Validate transaction ID
    const transactionId = parseInt(id);
    if (isNaN(transactionId) || transactionId <= 0) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    await client.query('BEGIN');

    // Get the transaction to update
    const transactionResult = await client.query(
      'SELECT * FROM transactions WHERE id = $1 AND (user_id IS NULL OR user_id = $2)',
      [transactionId, userId]
    );

    if (transactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];
    let updatedCount = 0;

    if (updateSimilar) {
      // Get all transactions from the same user
      const allTransactions = await client.query(
        'SELECT * FROM transactions WHERE user_id IS NULL OR user_id = $1',
        [userId]
      );

      // Find similar transactions (90% similarity)
      const similarIds = [];
      const similarDescriptions = [];
      for (const t of allTransactions.rows) {
        const similarity = calculateSimilarity(transaction.description, t.description);
        if (t.id !== transactionId && similarity >= 0.90) {
          similarIds.push(t.id);
          similarDescriptions.push({
            id: t.id,
            description: t.description,
            similarity: (similarity * 100).toFixed(1) + '%'
          });
        }
      }

      // Update similar transactions
      if (similarIds.length > 0) {
        console.log(`\n🔍 Found ${similarIds.length} similar transactions (≥90% similarity):`);
        similarDescriptions.forEach((item, index) => {
          console.log(`   ${index + 1}. [${item.similarity}] ${item.description.substring(0, 60)}...`);
        });
        console.log(`✅ Updating all to category: "${category}"\n`);
        
        const updateQuery = computable !== undefined
          ? 'UPDATE transactions SET category = $1, computable = $3 WHERE id = ANY($2::int[])'
          : 'UPDATE transactions SET category = $1 WHERE id = ANY($2::int[])';
        
        const updateParams = computable !== undefined
          ? [category, similarIds, computable]
          : [category, similarIds];
        
        await client.query(updateQuery, updateParams);
        updatedCount = similarIds.length;
      } else if (updateSimilar) {
        console.log(`\n🔍 No similar transactions found (≥90% similarity) for: "${transaction.description.substring(0, 60)}..."\n`);
      }
    }

    // Update the main transaction
    const updateQuery = computable !== undefined
      ? 'UPDATE transactions SET category = $1, computable = $2 WHERE id = $3'
      : 'UPDATE transactions SET category = $1 WHERE id = $2';
    
    const updateParams = computable !== undefined
      ? [category, computable, transactionId]
      : [category, transactionId];
    
    await client.query(updateQuery, updateParams);

    // Update summaries
    await updateSummaries(client, userId);

    await client.query('COMMIT');

    res.json({
      message: 'Category updated successfully',
      updatedCount: updatedCount + 1,
      similarUpdated: updatedCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  } finally {
    client.release();
  }
});

// Get available categories
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const hasAuthHeader = req.headers['authorization'];
    
    // TEMPORARY FIX: If Authorization header is present, return ALL categories (even if userId is null)
    let result;
    if (userId || hasAuthHeader) {
      if (userId) {
        result = await pool.query(
          `SELECT DISTINCT category 
           FROM transactions 
           WHERE user_id IS NULL OR user_id = $1
           ORDER BY category`,
          [userId]
        );
      } else {
        // userId is null but has auth header - return ALL categories
        result = await pool.query(
          `SELECT DISTINCT category 
           FROM transactions 
           ORDER BY category`
        );
      }
    } else {
      result = await pool.query(
        `SELECT DISTINCT category 
         FROM transactions 
         WHERE user_id IS NULL
         ORDER BY category`
      );
    }

    res.json({ categories: result.rows.map(r => r.category) });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Delete a single transaction
router.delete('/:id', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const transactionId = parseInt(req.params.id);
    
    // Validate transaction ID
    if (isNaN(transactionId) || transactionId <= 0) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }
    
    // Verify transaction belongs to user
    const checkResult = await client.query(
      'SELECT id FROM transactions WHERE id = $1 AND (user_id IS NULL OR user_id = $2)',
      [transactionId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    await client.query('BEGIN');
    
    // Delete the transaction
    await client.query(
      'DELETE FROM transactions WHERE id = $1 AND (user_id IS NULL OR user_id = $2)',
      [transactionId, userId]
    );
    
    // Update summaries
    try {
      await updateSummaries(client, userId);
    } catch (summaryError) {
      console.error('⚠️ Error updating summaries (non-critical):', summaryError);
    }
    
    await client.query('COMMIT');
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  } finally {
    client.release();
  }
});

// Delete all transactions (for testing/reset)
router.delete('/all', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    await pool.query(
      'DELETE FROM transactions WHERE user_id IS NULL OR user_id = $1',
      [userId]
    );
    
    await pool.query(
      'DELETE FROM summaries WHERE user_id IS NULL OR user_id = $1',
      [userId]
    );

    res.json({ message: 'All transactions deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete transactions' });
  }
});

// Helper function to update summaries
async function updateSummaries(client, userId) {
  const result = await client.query(
    `SELECT 
       TO_CHAR(date, 'YYYY-MM') as month,
       SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as total_income,
       SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as total_expenses
     FROM transactions
     WHERE (user_id IS NULL OR user_id = $1)
     GROUP BY TO_CHAR(date, 'YYYY-MM')`,
    [userId]
  );

  for (const row of result.rows) {
    const netBalance = parseFloat(row.total_income) - parseFloat(row.total_expenses);

    await client.query(
      `INSERT INTO summaries (user_id, month, total_income, total_expenses, net_balance)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, month) DO UPDATE
       SET total_income = $3, total_expenses = $4, net_balance = $5`,
      [userId, row.month, row.total_income, row.total_expenses, netBalance]
    );
  }
}

// Helper function to calculate similarity between two strings
// Returns a value between 0 (completely different) and 1 (identical)
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Normalize strings: lowercase and remove extra spaces
  const s1 = str1.toLowerCase().trim().replace(/\s+/g, ' ');
  const s2 = str2.toLowerCase().trim().replace(/\s+/g, ' ');
  
  if (s1 === s2) return 1;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  
  // Convert distance to similarity (1 - normalized distance)
  const similarity = 1 - (distance / maxLength);
  
  return similarity;
}

// Levenshtein distance algorithm
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

// Bulk update categories
router.post('/bulk-update-category', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { transactionIds, category, computable } = req.body;
    const userId = req.user?.id || req.user?.userId || null;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: 'No transaction IDs provided' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    await client.query('BEGIN');

    // Update all selected transactions
    const updateQuery = `
      UPDATE transactions
      SET category = $1, computable = $2
      WHERE id = ANY($3)
      AND (user_id IS NULL OR user_id = $4)
      RETURNING id
    `;

    const result = await client.query(updateQuery, [
      category,
      computable !== undefined ? computable : true,
      transactionIds,
      userId
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      updated: result.rowCount,
      message: `${result.rowCount} transacciones actualizadas exitosamente`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Error al actualizar transacciones' });
  } finally {
    client.release();
  }
});

// Create transfer between accounts
router.post('/transfer', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { fromAccountId, toAccountId, amount, date, description } = req.body;
    const userId = req.user?.id || req.user?.userId || null;

    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ error: 'Cannot transfer to same account' });
    }

    await client.query('BEGIN');

    const transferDate = date || new Date().toISOString().split('T')[0];
    const transferDescription = description || `Transferencia`;
    const transferAmount = parseFloat(amount);

    // Generate a unique transfer ID to link both transactions
    const { randomUUID } = await import('crypto');
    const transferId = randomUUID();

    console.log(`🔄 Creating transfer: €${transferAmount} from account ${fromAccountId} to ${toAccountId}`);

    // Create outgoing transaction (from source account)
    const outgoingResult = await client.query(
      `INSERT INTO transactions 
       (user_id, bank, date, category, description, amount, type, account_id, computable)
       VALUES ($1, 'Transfer', $2, 'Transferencias', $3, $4, 'expense', $5, false)
       RETURNING *`,
      [userId, transferDate, `${transferDescription} → Cuenta destino`, transferAmount, fromAccountId]
    );

    // Create incoming transaction (to destination account)
    const incomingResult = await client.query(
      `INSERT INTO transactions 
       (user_id, bank, date, category, description, amount, type, account_id, computable)
       VALUES ($1, 'Transfer', $2, 'Transferencias', $3, $4, 'income', $5, false)
       RETURNING *`,
      [userId, transferDate, `${transferDescription} ← Cuenta origen`, transferAmount, toAccountId]
    );

    // Update account balances
    await client.query(
      `UPDATE bank_accounts SET balance = balance - $1, balance_updated_at = NOW() WHERE id = $2 AND (user_id IS NULL OR user_id = $3)`,
      [transferAmount, fromAccountId, userId]
    );

    await client.query(
      `UPDATE bank_accounts SET balance = balance + $1, balance_updated_at = NOW() WHERE id = $2 AND (user_id IS NULL OR user_id = $3)`,
      [transferAmount, toAccountId, userId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Transferencia creada exitosamente',
      transferId: transferId,
      transactions: {
        outgoing: outgoingResult.rows[0],
        incoming: incomingResult.rows[0]
      }
    });

    console.log(`✅ Transfer completed: ${transferId}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Error al crear transferencia' });
  } finally {
    client.release();
  }
});

export default router;


