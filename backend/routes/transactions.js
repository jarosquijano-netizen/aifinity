import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * Normalize category to hierarchical format
 * Maps old/non-hierarchical categories to master list format
 */
function normalizeCategory(category) {
  if (!category) return 'Otros > Sin categoría';
  
  const categoryLower = category.toLowerCase().trim();
  
  // Category normalization mapping
  const categoryMap = {
    // Income categories -> Finanzas > Ingresos
    'ingresos': 'Finanzas > Ingresos',
    'salary': 'Finanzas > Ingresos',
    'payroll': 'Finanzas > Ingresos',
    'nomina': 'Finanzas > Ingresos',
    'nómina': 'Finanzas > Ingresos',
    'salario': 'Finanzas > Ingresos',
    'sueldo': 'Finanzas > Ingresos',
    
    // Transfer categories -> Finanzas > Transferencias
    'transferencias': 'Finanzas > Transferencias',
    'transferencia': 'Finanzas > Transferencias',
    'transfer': 'Finanzas > Transferencias',
    'traspaso': 'Finanzas > Transferencias',
    'bizum': 'Finanzas > Transferencias',
    
    // Cash -> Finanzas > Efectivo
    'efectivo': 'Finanzas > Efectivo',
    'cash': 'Finanzas > Efectivo',
    
    // Loans -> Finanzas > Préstamos
    'préstamos': 'Finanzas > Préstamos',
    'prestamos': 'Finanzas > Préstamos',
    'loan': 'Finanzas > Préstamos',
    'loans': 'Finanzas > Préstamos',
    
    // Groceries -> Alimentación > Supermercado
    'supermercado': 'Alimentación > Supermercado',
    'groceries': 'Alimentación > Supermercado',
    
    // Restaurants -> Alimentación > Restaurante
    'restaurante': 'Alimentación > Restaurante',
    'restaurant': 'Alimentación > Restaurante',
    
    // Housing -> Vivienda > Hogar
    'hogar': 'Vivienda > Hogar',
    'housing': 'Vivienda > Hogar',
    
    // Mortgage -> Vivienda > Hipoteca
    'hipoteca': 'Vivienda > Hipoteca',
    'mortgage': 'Vivienda > Hipoteca',
    
    // Transport -> Transporte > Transportes
    'transportes': 'Transporte > Transportes',
    'transport': 'Transporte > Transportes',
    'transportation': 'Transporte > Transportes',
    
    // Gas -> Transporte > Gasolina
    'gasolina': 'Transporte > Gasolina',
    'gas': 'Transporte > Gasolina',
    
    // Health -> Salud > Médico
    'médico': 'Salud > Médico',
    'medico': 'Salud > Médico',
    
    // Pharmacy -> Salud > Farmacia
    'farmacia': 'Salud > Farmacia',
    'pharmacy': 'Salud > Farmacia',
    
    // Shopping -> Compras > Compras
    'compras': 'Compras > Compras',
    'shopping': 'Compras > Compras',
    
    // Entertainment -> Ocio > Entretenimiento
    'entretenimiento': 'Ocio > Entretenimiento',
    'entertainment': 'Ocio > Entretenimiento',
    
    // Education -> Educación > Estudios
    'estudios': 'Educación > Estudios',
    'education': 'Educación > Estudios',
    
    // Sports -> Deporte > Deporte
    'deporte': 'Deporte > Deporte',
    'sports': 'Deporte > Deporte',
    
    // Others -> Otros > Otros
    'otros': 'Otros > Otros',
    'other': 'Otros > Otros',
    'others': 'Otros > Otros',
    'uncategorized': 'Otros > Sin categoría',
    'sin categoría': 'Otros > Sin categoría',
    'sin categoria': 'Otros > Sin categoría',
  };
  
  // Check exact match first
  if (categoryMap[categoryLower]) {
    return categoryMap[categoryLower];
  }
  
  // Check if already in hierarchical format
  if (category.includes(' > ')) {
    return category; // Assume it's already normalized
  }
  
  // Default fallback
  return 'Otros > Sin categoría';
}

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
      
      // Auto-exclude Transferencias and NC category from analytics
      let isComputable;
      const categoryLower = (category || '').toLowerCase();
      const isTransferCategory = category === 'Transferencias' || 
                                 categoryLower.includes('transferencia') ||
                                 categoryLower.includes('transferencias');
      const isNCCategory = category === 'NC' || category === 'nc';
      
      if (isTransferCategory || isNCCategory) {
        isComputable = false;
        if (isTransferCategory) {
          console.log(`🔄 Auto-excluding transfer: "${description}" (category: ${category})`);
        } else {
          console.log(`🔄 Auto-excluding NC transaction: "${description}"`);
        }
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
      const cleanCategory = normalizeCategory(category || 'Uncategorized');
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

      // Log credit card transactions for debugging
      if (account_id) {
        const accountCheck = await client.query(
          `SELECT account_type FROM bank_accounts WHERE id = $1`,
          [account_id]
        );
        if (accountCheck.rows[0]?.account_type === 'credit') {
          console.log(`💳 Credit card transaction saved:`, {
            description: cleanDescription.substring(0, 30),
            amount: cleanAmount,
            account_id,
            category: cleanCategory
          });
        }
      }

      insertedTransactions.push(result.rows[0]);
    }

    // Store previous balance before updating (for revert functionality)
    let previousBalance = null;
    let previousBalanceSource = null;
    
    // Update account balance if lastBalance provided and account_id exists
    // IMPORTANT: This REPLACES the balance (does not add to it)
    // The balance from CSV represents the actual account balance after all transactions
    if (account_id && lastBalance !== undefined && lastBalance !== null) {
      // Get current balance for logging and revert
      const currentBalanceResult = await client.query(
        `SELECT balance, balance_source FROM bank_accounts WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
        [account_id, userId]
      );
      previousBalance = currentBalanceResult.rows[0]?.balance || 0;
      previousBalanceSource = currentBalanceResult.rows[0]?.balance_source || 'unknown';
      
      // REPLACE balance (do not add) - CSV balance is the absolute value
      await client.query(
        `UPDATE bank_accounts 
         SET balance = $1, balance_updated_at = NOW(), balance_source = 'csv'
         WHERE id = $2 AND (user_id IS NULL OR user_id = $3)`,
        [lastBalance, account_id, userId]
      );
      
      console.log(`✅ Updated balance for account ${account_id}: €${previousBalance} → €${lastBalance} (source: ${previousBalanceSource} → csv)`);
    }
    
    // Store last upload info for revert functionality
    // Create or update last_uploads table entry
    const transactionIds = insertedTransactions.map(t => t.id);
    if (transactionIds.length > 0) {
      // Check if last_uploads table exists, if not create it
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS last_uploads (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            account_id INTEGER,
            transaction_ids INTEGER[],
            previous_balance DECIMAL(12, 2),
            previous_balance_source VARCHAR(50),
            uploaded_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        
        // Delete previous last upload for this user
        await client.query(
          `DELETE FROM last_uploads WHERE user_id = $1 OR (user_id IS NULL AND $1 IS NULL)`,
          [userId]
        );
        
        // Insert new last upload record
        await client.query(
          `INSERT INTO last_uploads (user_id, account_id, transaction_ids, previous_balance, previous_balance_source)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, account_id, transactionIds, previousBalance, previousBalanceSource]
        );
        
        console.log(`📝 Stored last upload info: ${transactionIds.length} transactions, account ${account_id}`);
      } catch (tableError) {
        console.error('⚠️ Error creating/storing last upload info (non-critical):', tableError);
        // Don't fail the upload if this fails
      }
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
      balanceUpdated: account_id && lastBalance !== undefined,
      uploadInfo: {
        accountId: account_id,
        transactionIds: insertedTransactions.map(t => t.id),
        previousBalance: previousBalance,
        previousBalanceSource: previousBalanceSource
      }
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

// Get last upload info
router.get('/last-upload', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    // Ensure table exists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS last_uploads (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          account_id INTEGER,
          transaction_ids INTEGER[],
          previous_balance DECIMAL(12, 2),
          previous_balance_source VARCHAR(50),
          uploaded_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    } catch (tableError) {
      console.error('⚠️ Error creating last_uploads table (may already exist):', tableError.message);
    }
    
    // Get last upload info
    const result = await pool.query(
      `SELECT id, user_id, account_id, transaction_ids, previous_balance, previous_balance_source, uploaded_at
       FROM last_uploads
       WHERE user_id = $1 OR (user_id IS NULL AND $1 IS NULL)
       ORDER BY uploaded_at DESC
       LIMIT 1`,
      [userId]
    );
    
    console.log(`🔍 Last upload query result: ${result.rows.length} rows found for userId: ${userId}`);
    
    if (result.rows.length === 0) {
      return res.json({ 
        hasLastUpload: false,
        message: 'No last upload found'
      });
    }
    
    const lastUpload = result.rows[0];
    
    // Get account info
    let accountInfo = null;
    if (lastUpload.account_id) {
      const accountResult = await pool.query(
        `SELECT id, name, account_type, balance FROM bank_accounts WHERE id = $1`,
        [lastUpload.account_id]
      );
      if (accountResult.rows.length > 0) {
        accountInfo = accountResult.rows[0];
      }
    }
    
    // Get transaction count and sample
    let transactionCount = 0;
    let sampleTransactions = [];
    if (lastUpload.transaction_ids && lastUpload.transaction_ids.length > 0) {
      transactionCount = lastUpload.transaction_ids.length;
      const sampleResult = await pool.query(
        `SELECT id, date, description, amount, category, type
         FROM transactions
         WHERE id = ANY($1)
         ORDER BY date DESC
         LIMIT 5`,
        [lastUpload.transaction_ids]
      );
      sampleTransactions = sampleResult.rows;
    }
    
    res.json({
      hasLastUpload: true,
      uploadId: lastUpload.id,
      accountId: lastUpload.account_id,
      account: accountInfo,
      transactionCount: transactionCount,
      transactionIds: lastUpload.transaction_ids || [],
      previousBalance: lastUpload.previous_balance,
      previousBalanceSource: lastUpload.previous_balance_source,
      uploadedAt: lastUpload.uploaded_at,
      sampleTransactions: sampleTransactions
    });
  } catch (error) {
    console.error('Error getting last upload:', error);
    res.status(500).json({ error: 'Failed to get last upload info' });
  }
});

// Revert last upload
router.delete('/revert-last-upload', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    await client.query('BEGIN');
    
    // Get last upload info
    const lastUploadResult = await client.query(
      `SELECT id, user_id, account_id, transaction_ids, previous_balance, previous_balance_source
       FROM last_uploads
       WHERE user_id = $1 OR (user_id IS NULL AND $1 IS NULL)
       ORDER BY uploaded_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );
    
    if (lastUploadResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No last upload found to revert' });
    }
    
    const lastUpload = lastUploadResult.rows[0];
    const transactionIds = lastUpload.transaction_ids || [];
    
    if (transactionIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No transactions to revert' });
    }
    
    // Delete transactions
    const deleteResult = await client.query(
      `DELETE FROM transactions
       WHERE id = ANY($1)
       AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))
       RETURNING id`,
      [transactionIds, userId]
    );
    
    const deletedCount = deleteResult.rows.length;
    console.log(`🗑️ Deleted ${deletedCount} transactions from last upload`);
    
    // Restore previous balance if it was updated
    if (lastUpload.account_id && lastUpload.previous_balance !== null) {
      await client.query(
        `UPDATE bank_accounts
         SET balance = $1, 
             balance_updated_at = NOW(),
             balance_source = $2
         WHERE id = $3 AND (user_id IS NULL OR user_id = $4)`,
        [
          lastUpload.previous_balance,
          lastUpload.previous_balance_source || 'manual',
          lastUpload.account_id,
          userId
        ]
      );
      console.log(`↩️ Restored balance for account ${lastUpload.account_id}: ${lastUpload.previous_balance}`);
    }
    
    // Delete last upload record
    await client.query(
      `DELETE FROM last_uploads WHERE id = $1`,
      [lastUpload.id]
    );
    
    // Update summaries
    try {
      await updateSummaries(client, userId);
    } catch (summaryError) {
      console.error('⚠️ Error updating summaries (non-critical):', summaryError);
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Last upload reverted successfully',
      deletedTransactions: deletedCount,
      balanceRestored: lastUpload.account_id && lastUpload.previous_balance !== null
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reverting last upload:', error);
    res.status(500).json({ 
      error: 'Failed to revert last upload',
      message: error.message
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

    // Get transactions for the current user
    let result;
    
    if (userId) {
      // User is logged in - get their transactions
      result = await pool.query(
        `SELECT 
          t.*,
          COALESCE(
            ba.name,
            (SELECT name FROM bank_accounts ba2
             WHERE LOWER(ba2.name) LIKE '%' || LOWER(t.bank) || '%' 
             AND ba2.user_id = $1
             AND EXISTS (
               SELECT 1 FROM transactions t2 
               WHERE t2.account_id = ba2.id 
               AND LOWER(t2.bank) = LOWER(t.bank)
               LIMIT 1
             )
             ORDER BY created_at DESC
             LIMIT 1),
            t.bank
          ) as account_name
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         ORDER BY t.date DESC`,
        [userId]
      );
    } else {
      // If not logged in, get only shared transactions (user_id IS NULL)
      result = await pool.query(
        `SELECT 
          t.*,
          COALESCE(
            ba.name,
            (SELECT name FROM bank_accounts 
             WHERE LOWER(name) LIKE '%' || LOWER(t.bank) || '%'
             AND user_id IS NULL
             ORDER BY created_at DESC
             LIMIT 1),
            t.bank
          ) as account_name
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id IS NULL
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
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

    // Normalize category to hierarchical format
    const normalizedCategory = normalizeCategory(category);

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

    // Auto-set computable = false for NC and Transferencias categories unless explicitly overridden
    let finalComputable = computable;
    const categoryLower = (normalizedCategory || '').toLowerCase();
    const isTransferCategory = normalizedCategory === 'Finanzas > Transferencias' || 
                               normalizedCategory === 'Transferencias' ||
                               categoryLower.includes('transferencia') ||
                               categoryLower.includes('transferencias');
    const isNCCategory = normalizedCategory === 'NC' || normalizedCategory === 'nc';
    
    if (isNCCategory || isTransferCategory) {
      if (computable === undefined) {
        finalComputable = false;
        if (isNCCategory) {
          console.log(`🔄 Auto-setting computable=false for NC category: "${transaction.description}"`);
        } else {
          console.log(`🔄 Auto-setting computable=false for Transferencias category: "${transaction.description}"`);
        }
      }
    }

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
        console.log(`✅ Updating all to category: "${normalizedCategory}"\n`);
        
        const updateQuery = finalComputable !== undefined
          ? 'UPDATE transactions SET category = $1, computable = $3 WHERE id = ANY($2::int[]) AND user_id = $4'
          : 'UPDATE transactions SET category = $1 WHERE id = ANY($2::int[]) AND user_id = $3';
        
        const updateParams = finalComputable !== undefined
          ? [normalizedCategory, similarIds, finalComputable, userId]
          : [normalizedCategory, similarIds, userId];
        
        await client.query(updateQuery, updateParams);
        
        // Verify all updated transactions belong to the user
        const verifyResult = await client.query(
          'SELECT id FROM transactions WHERE id = ANY($1::int[]) AND user_id = $2',
          [similarIds, userId]
        );
        
        if (verifyResult.rows.length !== similarIds.length) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Cannot update transactions belonging to other users' });
        }
        
        updatedCount = verifyResult.rows.length;
      } else if (updateSimilar) {
        console.log(`\n🔍 No similar transactions found (≥90% similarity) for: "${transaction.description.substring(0, 60)}..."\n`);
      }
    }

    // Update the main transaction - ensure it belongs to the user
    const updateQuery = finalComputable !== undefined
      ? 'UPDATE transactions SET category = $1, computable = $2 WHERE id = $3 AND user_id = $4'
      : 'UPDATE transactions SET category = $1 WHERE id = $2 AND user_id = $3';
    
    const updateParams = finalComputable !== undefined
      ? [normalizedCategory, finalComputable, transactionId, userId]
      : [normalizedCategory, transactionId, userId];
    
    const updateResult = await client.query(updateQuery, updateParams);
    
    // Verify the transaction belongs to the user
    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cannot update transaction belonging to another user' });
    }

    // Save learned category mapping for future transactions
    // Create table if it doesn't exist
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS transaction_category_mappings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          description_pattern TEXT NOT NULL,
          category VARCHAR(255) NOT NULL,
          usage_count INTEGER DEFAULT 1,
          last_used TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, description_pattern)
        )
      `);
      
      // Normalize description for pattern matching (remove extra spaces, lowercase)
      const normalizedDescription = transaction.description
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 200); // Limit length
      
      // Save or update mapping
      await client.query(`
        INSERT INTO transaction_category_mappings (user_id, description_pattern, category, usage_count, last_used)
        VALUES ($1, $2, $3, 1, NOW())
        ON CONFLICT (user_id, description_pattern) 
        DO UPDATE SET 
          category = EXCLUDED.category,
          usage_count = transaction_category_mappings.usage_count + 1,
          last_used = NOW()
      `, [userId, normalizedDescription, normalizedCategory]);
      
      console.log(`💾 Saved category mapping: "${normalizedDescription.substring(0, 50)}..." -> "${normalizedCategory}"`);
    } catch (mappingError) {
      console.error('⚠️ Error saving category mapping (non-critical):', mappingError);
      // Don't fail the transaction if mapping save fails
    }

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

// Get learned category mappings for a description pattern
router.get('/learned-category', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { description } = req.query;
    
    if (!description) {
      return res.json({ category: null });
    }
    
    // Normalize description for matching
    const normalizedDescription = description
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 200);
    
    // Ensure table exists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS transaction_category_mappings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          description_pattern TEXT NOT NULL,
          category VARCHAR(255) NOT NULL,
          usage_count INTEGER DEFAULT 1,
          last_used TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, description_pattern)
        )
      `);
    } catch (tableError) {
      // Table might already exist, ignore
    }
    
    // Find exact or similar matches
    // First try exact match
    let result = await pool.query(
      `SELECT category, usage_count 
       FROM transaction_category_mappings
       WHERE user_id = $1 OR (user_id IS NULL AND $1 IS NULL)
       AND description_pattern = $2
       ORDER BY usage_count DESC, last_used DESC
       LIMIT 1`,
      [userId, normalizedDescription]
    );
    
    if (result.rows.length > 0) {
      return res.json({ 
        category: result.rows[0].category,
        confidence: 'exact',
        usageCount: result.rows[0].usage_count
      });
    }
    
    // Try similarity matching (find descriptions that contain or are contained in the pattern)
    result = await pool.query(
      `SELECT category, usage_count, 
              CASE 
                WHEN description_pattern LIKE $2 || '%' THEN 1
                WHEN $2 LIKE description_pattern || '%' THEN 2
                WHEN description_pattern LIKE '%' || $2 || '%' THEN 3
                ELSE 4
              END as match_type
       FROM transaction_category_mappings
       WHERE user_id = $1 OR (user_id IS NULL AND $1 IS NULL)
       AND (
         description_pattern LIKE $2 || '%' OR
         $2 LIKE description_pattern || '%' OR
         description_pattern LIKE '%' || $2 || '%'
       )
       ORDER BY match_type ASC, usage_count DESC, last_used DESC
       LIMIT 1`,
      [userId, normalizedDescription]
    );
    
    if (result.rows.length > 0) {
      return res.json({ 
        category: result.rows[0].category,
        confidence: 'similar',
        usageCount: result.rows[0].usage_count
      });
    }
    
    res.json({ category: null });
  } catch (error) {
    console.error('Error getting learned category:', error);
    res.json({ category: null });
  }
});

// Get available categories
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    // Get categories for the current user
    let result;
    if (userId) {
      // User is logged in - get their categories
      result = await pool.query(
        `SELECT DISTINCT category 
         FROM transactions 
         WHERE user_id = $1
         ORDER BY category`,
        [userId]
      );
    } else {
      // If not logged in, get only shared categories (user_id IS NULL)
      result = await pool.query(
        `SELECT DISTINCT category 
         FROM transactions 
         WHERE user_id IS NULL
         ORDER BY category`
      );
    }

    // Helper function to check if two categories are duplicates
    const isDuplicateCategory = (name1, name2) => {
      if (name1 === name2) return true;
      if (name1.includes(' > ')) {
        const subcategory = name1.split(' > ')[1];
        if (subcategory === name2) return true;
      }
      if (name2.includes(' > ')) {
        const subcategory = name2.split(' > ')[1];
        if (subcategory === name1) return true;
      }
      return false;
    };
    
    // Deduplicate: prefer hierarchical format over old format
    const categories = result.rows.map(r => r.category);
    const deduplicated = [];
    const seen = new Set();
    
    categories.forEach(cat => {
      if (seen.has(cat)) return;
      
      let isDuplicate = false;
      let duplicateOf = null;
      
      for (const existing of deduplicated) {
        if (isDuplicateCategory(cat, existing)) {
          isDuplicate = true;
          if (cat.includes(' > ')) {
            duplicateOf = existing;
            break;
          } else if (existing.includes(' > ')) {
            seen.add(cat);
            return;
          }
        }
      }
      
      if (isDuplicate && duplicateOf) {
        const index = deduplicated.indexOf(duplicateOf);
        deduplicated[index] = cat;
        seen.delete(duplicateOf);
        seen.add(cat);
      } else if (!isDuplicate) {
        deduplicated.push(cat);
        seen.add(cat);
      }
    });
    
    // Fix "Ocio > Hotel" to "Ocio > Vacation"
    const fixedCategories = deduplicated.map(cat => {
      if (cat === 'Ocio > Hotel' || cat === 'Hotel') {
        return 'Ocio > Vacation';
      }
      return cat;
    });
    
    // Remove duplicates after fixing
    const finalCategories = [...new Set(fixedCategories)].sort();

    res.json({ categories: finalCategories });
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
      'DELETE FROM transactions WHERE user_id = $1',
      [userId]
    );
    
    await pool.query(
      'DELETE FROM summaries WHERE user_id = $1',
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
     WHERE user_id = $1
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

    // Normalize category to hierarchical format
    const normalizedCategory = normalizeCategory(category);

    // Auto-set computable = false for NC and Transferencias categories unless explicitly overridden
    let finalComputable = computable;
    const categoryLower = (normalizedCategory || '').toLowerCase();
    const isTransferCategory = normalizedCategory === 'Finanzas > Transferencias' || 
                               normalizedCategory === 'Transferencias' ||
                               categoryLower.includes('transferencia') ||
                               categoryLower.includes('transferencias');
    const isNCCategory = normalizedCategory === 'NC' || normalizedCategory === 'nc';
    
    if (isNCCategory || isTransferCategory) {
      if (computable === undefined) {
        finalComputable = false;
        if (isNCCategory) {
          console.log(`🔄 Auto-setting computable=false for NC category in bulk update`);
        } else {
          console.log(`🔄 Auto-setting computable=false for Transferencias category in bulk update`);
        }
      }
    } else if (computable === undefined) {
      finalComputable = true;
    }

    await client.query('BEGIN');

    // Get transactions to learn from their descriptions
    const transactionsResult = await client.query(
      `SELECT DISTINCT description FROM transactions 
       WHERE id = ANY($1) AND (user_id IS NULL OR user_id = $2)
       AND description IS NOT NULL AND description != ''`,
      [transactionIds, userId]
    );

    // Update all selected transactions
    const updateQuery = `
      UPDATE transactions
      SET category = $1, computable = $2
      WHERE id = ANY($3)
      AND (user_id IS NULL OR user_id = $4)
      RETURNING id
    `;

    const result = await client.query(updateQuery, [
      normalizedCategory,
      finalComputable,
      transactionIds,
      userId
    ]);

    // Save learned category mappings for all unique descriptions
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS transaction_category_mappings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          description_pattern TEXT NOT NULL,
          category VARCHAR(255) NOT NULL,
          usage_count INTEGER DEFAULT 1,
          last_used TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, description_pattern)
        )
      `);
      
      for (const row of transactionsResult.rows) {
        const normalizedDescription = row.description
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' ')
          .substring(0, 200);
        
        await client.query(`
          INSERT INTO transaction_category_mappings (user_id, description_pattern, category, usage_count, last_used)
          VALUES ($1, $2, $3, 1, NOW())
          ON CONFLICT (user_id, description_pattern) 
          DO UPDATE SET 
            category = EXCLUDED.category,
            usage_count = transaction_category_mappings.usage_count + 1,
            last_used = NOW()
        `, [userId, normalizedDescription, normalizedCategory]);
      }
      
      console.log(`💾 Saved ${transactionsResult.rows.length} category mappings from bulk update`);
    } catch (mappingError) {
      console.error('⚠️ Error saving category mappings (non-critical):', mappingError);
    }

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

    // Verify both accounts belong to the user
    const accountCheck = await client.query(
      `SELECT id FROM bank_accounts 
       WHERE id IN ($1, $2) AND user_id = $3`,
      [fromAccountId, toAccountId, userId]
    );
    
    if (accountCheck.rows.length !== 2) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'One or both accounts do not belong to you' });
    }

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

    // Update account balances - accounts already verified above
    await client.query(
      `UPDATE bank_accounts SET balance = balance - $1, balance_updated_at = NOW() WHERE id = $2 AND user_id = $3`,
      [transferAmount, fromAccountId, userId]
    );
    
    await client.query(
      `UPDATE bank_accounts SET balance = balance + $1, balance_updated_at = NOW() WHERE id = $2 AND user_id = $3`,
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

// Delete credit card transactions from checking account (fix misuploaded credit card statements)
router.delete('/account/:accountId/credit-card-transactions', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { accountId } = req.params;
    
    console.log(`🔍 Finding credit card transactions in account ${accountId}`);
    
    await client.query('BEGIN');
    
    // Verify account exists
    const accountResult = await client.query(
      `SELECT id, name, account_type FROM bank_accounts 
       WHERE id = $1 AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))`,
      [accountId, userId]
    );
    
    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const account = accountResult.rows[0];
    
    // Find transactions that look like credit card transactions (in a checking account)
    // Look for patterns: COMPRA TARJ, card numbers with X's, etc.
    const creditCardPatterns = [
      'COMPRA TARJ',
      'COMPRA TARJETA',
      'TARJ',
      'XXXXXXXX',
      'MOVIMIENTOS DE CREDITO',
      'Límite de crédito'
    ];
    
    const patternQuery = creditCardPatterns.map((_, i) => 
      `description ILIKE $${i + 3}`
    ).join(' OR ');
    
    const patternValues = creditCardPatterns.map(p => `%${p}%`);
    
    const transactionsResult = await client.query(
      `SELECT id, date, description, amount, created_at
       FROM transactions 
       WHERE account_id = $1 
       AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))
       AND (${patternQuery})
       ORDER BY created_at DESC`,
      [accountId, userId, ...patternValues]
    );
    
    if (transactionsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ 
        message: 'No credit card transactions found',
        deleted: 0 
      });
    }
    
    const transactionIds = transactionsResult.rows.map(t => t.id);
    
    console.log(`📋 Found ${transactionIds.length} credit card transactions to delete`);
    
    // Delete transactions
    const deleteResult = await client.query(
      `DELETE FROM transactions
       WHERE id = ANY($1)
       AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))
       RETURNING id, description`,
      [transactionIds, userId]
    );
    
    const deletedCount = deleteResult.rows.length;
    console.log(`✅ Deleted ${deletedCount} credit card transactions`);
    
    // Update summaries
    try {
      await updateSummaries(client, userId);
    } catch (summaryError) {
      console.error('⚠️ Error updating summaries (non-critical):', summaryError);
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: `Deleted ${deletedCount} credit card transactions from ${account.name}`,
      deleted: deletedCount,
      account: account.name,
      transactions: deleteResult.rows.map(t => ({
        id: t.id,
        description: t.description?.substring(0, 50)
      }))
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting credit card transactions:', error);
    res.status(500).json({ 
      error: 'Failed to delete transactions',
      message: error.message
    });
  } finally {
    client.release();
  }
});

// Delete recent transactions from a specific account (admin/debug endpoint)
router.delete('/account/:accountId/recent', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { accountId } = req.params;
    const { limit = 50 } = req.query; // Default to last 50 transactions
    
    console.log(`🗑️ Deleting recent transactions from account ${accountId} (limit: ${limit})`);
    
    await client.query('BEGIN');
    
    // Verify account exists and belongs to user
    const accountResult = await client.query(
      `SELECT id, name, balance FROM bank_accounts 
       WHERE id = $1 AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))`,
      [accountId, userId]
    );
    
    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const account = accountResult.rows[0];
    console.log(`✅ Found account: ${account.name}`);
    
    // Get recent transactions
    const transactionsResult = await client.query(
      `SELECT id, date, description, amount
       FROM transactions 
       WHERE account_id = $1 
       AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))
       ORDER BY created_at DESC 
       LIMIT $3`,
      [accountId, userId, parseInt(limit)]
    );
    
    if (transactionsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ 
        message: 'No transactions found',
        deleted: 0 
      });
    }
    
    const transactionIds = transactionsResult.rows.map(t => t.id);
    
    console.log(`📋 Found ${transactionIds.length} transactions to delete`);
    
    // Delete transactions
    const deleteResult = await client.query(
      `DELETE FROM transactions
       WHERE id = ANY($1)
       AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))
       RETURNING id, description`,
      [transactionIds, userId]
    );
    
    const deletedCount = deleteResult.rows.length;
    console.log(`✅ Deleted ${deletedCount} transactions`);
    
    // Update summaries
    try {
      await updateSummaries(client, userId);
    } catch (summaryError) {
      console.error('⚠️ Error updating summaries (non-critical):', summaryError);
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: `Deleted ${deletedCount} recent transactions from ${account.name}`,
      deleted: deletedCount,
      account: account.name,
      transactions: deleteResult.rows.map(t => ({
        id: t.id,
        description: t.description?.substring(0, 50)
      }))
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting recent transactions:', error);
    res.status(500).json({ 
      error: 'Failed to delete transactions',
      message: error.message
    });
  } finally {
    client.release();
  }
});

export default router;


