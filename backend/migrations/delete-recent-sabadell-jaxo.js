/**
 * Script to delete recent transactions from Sabadell JAXO account
 * This will help fix incorrectly uploaded transactions
 */

import pool from '../config/database.js';

async function deleteRecentSabadellJaxo() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Find Sabadell JAXO account
    const accountResult = await client.query(
      `SELECT id, name, balance FROM bank_accounts 
       WHERE name LIKE '%JAXO%' AND name LIKE '%Sabadell%'
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
    
    // Get recent transactions (last 50 to be safe)
    const transactionsResult = await client.query(
      `SELECT id, date, description, amount, created_at
       FROM transactions 
       WHERE account_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [account.id]
    );
    
    if (transactionsResult.rows.length === 0) {
      console.log('❌ No transactions found for this account');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`📋 Found ${transactionsResult.rows.length} recent transactions:\n`);
    transactionsResult.rows.forEach((t, idx) => {
      console.log(`   ${idx + 1}. ${t.date} - ${t.description?.substring(0, 60)}... - €${t.amount}`);
    });
    
    const transactionIds = transactionsResult.rows.map(t => t.id);
    
    console.log(`\n⚠️  WARNING: This will delete ${transactionIds.length} transactions!`);
    console.log(`   Account: ${account.name}`);
    console.log(`   This action cannot be undone.\n`);
    
    // Delete transactions
    const deleteResult = await client.query(
      `DELETE FROM transactions
       WHERE id = ANY($1)
       RETURNING id, description`,
      [transactionIds]
    );
    
    console.log(`✅ Deleted ${deleteResult.rows.length} transactions`);
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully deleted transactions from ${account.name}`);
    console.log(`   You can now re-upload the file with correct descriptions.`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteRecentSabadellJaxo()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

