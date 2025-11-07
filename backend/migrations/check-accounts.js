import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Check all accounts in the database and their user_id values
 */
async function checkAccounts() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking all accounts in database...\n');
    
    // Get all accounts
    const allAccounts = await client.query(
      `SELECT id, name, account_type, user_id, created_at, balance 
       FROM bank_accounts 
       ORDER BY created_at DESC`
    );
    
    console.log(`📊 Total accounts found: ${allAccounts.rows.length}\n`);
    
    if (allAccounts.rows.length === 0) {
      console.log('⚠️  No accounts found in database!');
      return;
    }
    
    // Group by user_id
    const byUserId = {};
    allAccounts.rows.forEach(account => {
      const uid = account.user_id === null ? 'NULL' : account.user_id.toString();
      if (!byUserId[uid]) {
        byUserId[uid] = [];
      }
      byUserId[uid].push(account);
    });
    
    console.log('📋 Accounts grouped by user_id:\n');
    for (const [uid, accounts] of Object.entries(byUserId)) {
      console.log(`  user_id = ${uid}: ${accounts.length} account(s)`);
      accounts.forEach(acc => {
        console.log(`    - ${acc.name} (${acc.account_type}) - ID: ${acc.id}, Balance: ${acc.balance || 'N/A'}`);
      });
      console.log('');
    }
    
    // Check users
    const users = await client.query(
      `SELECT id, email FROM users ORDER BY id ASC`
    );
    
    console.log('👤 Users in database:');
    users.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkAccounts().catch(console.error);

