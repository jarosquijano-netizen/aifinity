/**
 * Script to revert the last upload for a user
 * Usage: node backend/migrations/revert-last-upload.js [userId]
 * If userId is not provided, will revert for user_id IS NULL (demo account)
 */

import pool from '../config/database.js';

async function revertLastUpload(userId = null) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🔍 Looking for last upload for userId: ${userId || 'NULL (demo)'}`);
    
    // First, ensure last_uploads table exists
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS last_uploads (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          account_id INTEGER,
          transaction_ids INTEGER[],
          previous_balance DECIMAL(12, 2),
          previous_balance_source VARCHAR(50),
          uploaded_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch (tableError) {
      console.log('⚠️ Table creation check:', tableError.message);
    }
    
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
      console.log('❌ No last upload found in last_uploads table');
      console.log('🔍 Trying to find recent transactions for Sabadell JAXO account...');
      
      // Try to find the account and recent transactions
      const accountResult = await client.query(
        `SELECT id, name, balance FROM bank_accounts 
         WHERE name LIKE '%JAXO%' OR name LIKE '%Sabadell%'
         ORDER BY created_at DESC LIMIT 5`
      );
      
      if (accountResult.rows.length > 0) {
        console.log(`\n📋 Found ${accountResult.rows.length} potential accounts:`);
        accountResult.rows.forEach((acc, idx) => {
          console.log(`   ${idx + 1}. ${acc.name} (ID: ${acc.id}, Balance: €${acc.balance})`);
        });
        
        // Get recent transactions for the first account
        const accountId = accountResult.rows[0].id;
        const transactionsResult = await client.query(
          `SELECT id, date, description, amount 
           FROM transactions 
           WHERE account_id = $1 
           ORDER BY created_at DESC 
           LIMIT 20`,
          [accountId]
        );
        
        if (transactionsResult.rows.length > 0) {
          console.log(`\n📋 Found ${transactionsResult.rows.length} recent transactions:`);
          transactionsResult.rows.slice(0, 10).forEach((t, idx) => {
            console.log(`   ${idx + 1}. ${t.date} - ${t.description?.substring(0, 50)}... - €${t.amount}`);
          });
          
          console.log(`\n⚠️ No last_uploads record found. You can:`);
          console.log(`   1. Use the UI to revert (if available)`);
          console.log(`   2. Manually delete transactions from the database`);
          console.log(`   3. Re-upload the file (duplicates will be skipped)`);
        }
      }
      
      await client.query('ROLLBACK');
      return;
    }
    
    const lastUpload = lastUploadResult.rows[0];
    const transactionIds = lastUpload.transaction_ids || [];
    
    console.log(`📋 Found last upload:`);
    console.log(`   - Upload ID: ${lastUpload.id}`);
    console.log(`   - Account ID: ${lastUpload.account_id}`);
    console.log(`   - Transaction count: ${transactionIds.length}`);
    console.log(`   - Previous balance: ${lastUpload.previous_balance}`);
    
    if (transactionIds.length === 0) {
      console.log('⚠️ No transactions to delete');
      await client.query('ROLLBACK');
      return;
    }
    
    // Delete transactions
    const deleteResult = await client.query(
      `DELETE FROM transactions
       WHERE id = ANY($1)
       AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))
       RETURNING id, description`,
      [transactionIds, userId]
    );
    
    const deletedCount = deleteResult.rows.length;
    console.log(`🗑️ Deleted ${deletedCount} transactions`);
    
    if (deletedCount > 0) {
      console.log(`   First few deleted transactions:`);
      deleteResult.rows.slice(0, 5).forEach((t, idx) => {
        console.log(`   ${idx + 1}. ${t.description?.substring(0, 50)}...`);
      });
    }
    
    // Restore previous balance if it was updated
    if (lastUpload.account_id && lastUpload.previous_balance !== null) {
      const accountResult = await client.query(
        `SELECT name, balance FROM bank_accounts WHERE id = $1`,
        [lastUpload.account_id]
      );
      
      if (accountResult.rows.length > 0) {
        const account = accountResult.rows[0];
        const oldBalance = account.balance;
        
        await client.query(
          `UPDATE bank_accounts
           SET balance = $1, 
               balance_updated_at = NOW(),
               balance_source = $2
           WHERE id = $3`,
          [
            lastUpload.previous_balance,
            lastUpload.previous_balance_source || 'manual',
            lastUpload.account_id
          ]
        );
        
        console.log(`↩️ Restored balance for account "${account.name}"`);
        console.log(`   From: €${oldBalance} → To: €${lastUpload.previous_balance}`);
      }
    }
    
    // Delete last upload record
    await client.query(
      `DELETE FROM last_uploads WHERE id = $1`,
      [lastUpload.id]
    );
    
    console.log(`✅ Deleted last_uploads record`);
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Last upload reverted successfully!`);
    console.log(`   - Deleted ${deletedCount} transactions`);
    console.log(`   - Balance restored: ${lastUpload.account_id && lastUpload.previous_balance !== null ? 'Yes' : 'No'}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error reverting last upload:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Get userId from command line argument
const userId = process.argv[2] ? parseInt(process.argv[2]) : null;

revertLastUpload(userId)
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

