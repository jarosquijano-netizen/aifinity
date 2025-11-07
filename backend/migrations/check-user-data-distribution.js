import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Check what data belongs to each user
 */
async function checkUserDataDistribution() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking data distribution across users...\n');
    
    // Get all users
    const users = await client.query(
      `SELECT id, email FROM users ORDER BY id ASC`
    );
    
    console.log('👤 Users in database:');
    users.rows.forEach(user => {
      console.log(`   - ID: ${user.id}, Email: ${user.email}`);
    });
    console.log('');
    
    // Check accounts by user_id
    console.log('📋 Accounts by user_id:');
    const accountsByUser = await client.query(
      `SELECT user_id, COUNT(*) as count 
       FROM bank_accounts 
       GROUP BY user_id 
       ORDER BY user_id NULLS LAST`
    );
    accountsByUser.rows.forEach(row => {
      const uid = row.user_id === null ? 'NULL' : row.user_id.toString();
      console.log(`   - user_id = ${uid}: ${row.count} account(s)`);
    });
    console.log('');
    
    // Check transactions by user_id
    console.log('📋 Transactions by user_id:');
    const transactionsByUser = await client.query(
      `SELECT user_id, COUNT(*) as count 
       FROM transactions 
       GROUP BY user_id 
       ORDER BY user_id NULLS LAST`
    );
    transactionsByUser.rows.forEach(row => {
      const uid = row.user_id === null ? 'NULL' : row.user_id.toString();
      console.log(`   - user_id = ${uid}: ${row.count} transaction(s)`);
    });
    console.log('');
    
    // Check categories by user_id
    console.log('📋 Categories by user_id:');
    const categoriesByUser = await client.query(
      `SELECT user_id, COUNT(*) as count 
       FROM categories 
       GROUP BY user_id 
       ORDER BY user_id NULLS LAST`
    );
    categoriesByUser.rows.forEach(row => {
      const uid = row.user_id === null ? 'NULL' : row.user_id.toString();
      console.log(`   - user_id = ${uid}: ${row.count} category(ies)`);
    });
    console.log('');
    
    // Check settings by user_id
    console.log('📋 Settings by user_id:');
    try {
      const settingsByUser = await client.query(
        `SELECT user_id, COUNT(*) as count 
         FROM user_settings 
         GROUP BY user_id 
         ORDER BY user_id NULLS LAST`
      );
      settingsByUser.rows.forEach(row => {
        const uid = row.user_id === null || row.user_id === 0 ? 'NULL/0' : row.user_id.toString();
        console.log(`   - user_id = ${uid}: ${row.count} setting(s)`);
      });
    } catch (err) {
      console.log('   ⚠️  user_settings table does not exist');
    }
    console.log('');
    
    // Check AI configs by user_id
    console.log('📋 AI Configs by user_id:');
    try {
      const aiConfigsByUser = await client.query(
        `SELECT user_id, COUNT(*) as count 
         FROM ai_config 
         GROUP BY user_id 
         ORDER BY user_id NULLS LAST`
      );
      aiConfigsByUser.rows.forEach(row => {
        const uid = row.user_id === null ? 'NULL' : row.user_id.toString();
        console.log(`   - user_id = ${uid}: ${row.count} config(s)`);
      });
    } catch (err) {
      console.log('   ⚠️  ai_config table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkUserDataDistribution().catch(console.error);

