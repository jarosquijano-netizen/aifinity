import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Fix remaining NULL account and check why accounts aren't showing
 */
async function fixRemainingAccount() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Fixing remaining NULL account...\n');
    
    // Find the user
    const userResult = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['jarosquijano@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Found user ID: ${userId}\n`);
    
    // Update the NULL account
    const updateResult = await client.query(
      `UPDATE bank_accounts 
       SET user_id = $1 
       WHERE user_id IS NULL
       RETURNING id, name, account_type`,
      [userId]
    );
    
    console.log(`✅ Updated ${updateResult.rows.length} account(s) with NULL user_id:`);
    updateResult.rows.forEach(acc => {
      console.log(`   - ${acc.name} (${acc.account_type}) - ID: ${acc.id}`);
    });
    
    // Now check all accounts for this user
    const allAccounts = await client.query(
      `SELECT id, name, account_type, user_id, created_at 
       FROM bank_accounts 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    
    console.log(`\n📊 Total accounts for user_id = ${userId}: ${allAccounts.rows.length}`);
    allAccounts.rows.forEach(acc => {
      console.log(`   - ${acc.name} (${acc.account_type}) - ID: ${acc.id}, Created: ${acc.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixRemainingAccount().catch(console.error);

