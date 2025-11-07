import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Migration script to fix user_id in production
 * This script will:
 * 1. Find the main user (first user in the database, or user with email jarosquijano@gmail.com)
 * 2. Update all accounts with user_id = NULL to belong to that user
 * 3. Update all transactions with user_id = NULL to belong to that user
 * 4. Update all settings with user_id = NULL to belong to that user
 */

async function fixUserId() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting user_id migration...');
    
    await client.query('BEGIN');
    
    // Step 1: Find or create the main user
    let mainUser;
    
    // Try to find user by email first
    const userByEmail = await client.query(
      `SELECT id, email FROM users WHERE email = $1 LIMIT 1`,
      ['jarosquijano@gmail.com']
    );
    
    if (userByEmail.rows.length > 0) {
      mainUser = userByEmail.rows[0];
      console.log(`✅ Found user by email: ${mainUser.email} (ID: ${mainUser.id})`);
    } else {
      // Get the first user
      const firstUser = await client.query(
        `SELECT id, email FROM users ORDER BY id ASC LIMIT 1`
      );
      
      if (firstUser.rows.length > 0) {
        mainUser = firstUser.rows[0];
        console.log(`✅ Using first user: ${mainUser.email} (ID: ${mainUser.id})`);
      } else {
        throw new Error('No users found in database. Please create a user first.');
      }
    }
    
    const userId = mainUser.id;
    
    // Step 2: Update accounts with user_id = NULL
    const accountsResult = await client.query(
      `UPDATE bank_accounts 
       SET user_id = $1 
       WHERE user_id IS NULL
       RETURNING id, name`,
      [userId]
    );
    console.log(`✅ Updated ${accountsResult.rows.length} accounts to user_id = ${userId}`);
    if (accountsResult.rows.length > 0) {
      console.log(`   Accounts: ${accountsResult.rows.map(a => a.name).join(', ')}`);
    }
    
    // Step 3: Update transactions with user_id = NULL
    const transactionsResult = await client.query(
      `UPDATE transactions 
       SET user_id = $1 
       WHERE user_id IS NULL
       RETURNING id`,
      [userId]
    );
    console.log(`✅ Updated ${transactionsResult.rows.length} transactions to user_id = ${userId}`);
    
    // Step 4: Update settings with user_id = NULL (if settings table exists)
    try {
      const settingsResult = await client.query(
        `UPDATE user_settings 
         SET user_id = $1 
         WHERE user_id IS NULL OR user_id = 0
         RETURNING user_id`,
        [userId]
      );
      console.log(`✅ Updated ${settingsResult.rows.length} settings records to user_id = ${userId}`);
    } catch (err) {
      if (err.message.includes('does not exist')) {
        console.log('⚠️  user_settings table does not exist, skipping...');
      } else {
        throw err;
      }
    }
    
    // Step 5: Update categories with user_id = NULL
    try {
      const categoriesResult = await client.query(
        `UPDATE categories 
         SET user_id = $1 
         WHERE user_id IS NULL
         RETURNING id, name`,
        [userId]
      );
      console.log(`✅ Updated ${categoriesResult.rows.length} categories to user_id = ${userId}`);
    } catch (err) {
      if (err.message.includes('does not exist')) {
        console.log('⚠️  categories table does not exist, skipping...');
      } else {
        throw err;
      }
    }
    
    // Step 6: Update budgets with user_id = NULL (if budgets table exists)
    try {
      const budgetsResult = await client.query(
        `UPDATE budgets 
         SET user_id = $1 
         WHERE user_id IS NULL
         RETURNING id`,
        [userId]
      );
      console.log(`✅ Updated ${budgetsResult.rows.length} budgets to user_id = ${userId}`);
    } catch (err) {
      if (err.message.includes('does not exist')) {
        console.log('⚠️  budgets table does not exist, skipping...');
      } else {
        throw err;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Main user: ${mainUser.email} (ID: ${userId})`);
    console.log(`   - Accounts updated: ${accountsResult.rows.length}`);
    console.log(`   - Transactions updated: ${transactionsResult.rows.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
fixUserId().catch(console.error);

