/**
 * Script to delete recent transactions from Sabadell JAXO account
 * Direct database access
 */

import pool from '../config/database.js';

async function deleteSabadellJaxoTransactions() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Finding Sabadell JAXO account...\n');
    
    // Find Sabadell JAXO account (not the savings one)
    const accountResult = await client.query(
      `SELECT id, name, balance FROM bank_accounts 
       WHERE name LIKE '%JAXO%' AND name LIKE '%Sabadell%'
       AND name NOT LIKE '%AHORRO%'
       ORDER BY created_at DESC LIMIT 1`
    );
    
    if (accountResult.rows.length === 0) {
      console.log('❌ No Sabadell JAXO account found');
      await client.query('ROLLBACK');
      return;
    }
    
    const account = accountResult.rows[0];
    console.log(`✅ Found account: ${account.name} (ID: ${account.id})`);
    console.log(`   Current balance: €${account.balance}\n`);
    
    // Get recent transactions (last 100 to be safe)
    const transactionsResult = await client.query(
      `SELECT id, date, description, amount, created_at
       FROM transactions 
       WHERE account_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [account.id]
    );
    
    if (transactionsResult.rows.length === 0) {
      console.log('❌ No transactions found for this account');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`📋 Found ${transactionsResult.rows.length} recent transactions:\n`);
    transactionsResult.rows.slice(0, 10).forEach((t, idx) => {
      console.log(`   ${idx + 1}. ${t.date} - ${t.description?.substring(0, 50)}... - €${t.amount}`);
    });
    if (transactionsResult.rows.length > 10) {
      console.log(`   ... and ${transactionsResult.rows.length - 10} more\n`);
    }
    
    const transactionIds = transactionsResult.rows.map(t => t.id);
    
    console.log(`🗑️  Deleting ${transactionIds.length} transactions...\n`);
    
    // Delete transactions
    const deleteResult = await client.query(
      `DELETE FROM transactions
       WHERE id = ANY($1)
       RETURNING id, description`,
      [transactionIds]
    );
    
    console.log(`✅ Deleted ${deleteResult.rows.length} transactions`);
    
    // Update summaries
    try {
      // Simple summary update - recalculate totals
      await client.query(`
        UPDATE summaries 
        SET last_updated = NOW()
        WHERE user_id IS NULL
      `);
    } catch (summaryError) {
      console.log('⚠️  Summary update skipped (non-critical)');
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully deleted transactions from ${account.name}`);
    console.log(`   You can now re-upload the file with correct descriptions!`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteSabadellJaxoTransactions();

