import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Comprehensive audit: Check all tables for NULL user_id and fix them
 */
async function auditAndFixAllUserIds() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Starting comprehensive user_id audit...\n');
    
    // Find the main user
    const userResult = await client.query(
      `SELECT id, email FROM users WHERE email = $1 LIMIT 1`,
      ['jarosquijano@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    const userId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;
    console.log(`✅ Found user: ${userEmail} (ID: ${userId})\n`);
    
    await client.query('BEGIN');
    
    const results = {};
    
    // 1. Check and fix bank_accounts
    console.log('📋 Checking bank_accounts...');
    const accountsCheck = await client.query(
      `SELECT COUNT(*) as count FROM bank_accounts WHERE user_id IS NULL`
    );
    const accountsNull = parseInt(accountsCheck.rows[0].count);
    if (accountsNull > 0) {
      const accountsFix = await client.query(
        `UPDATE bank_accounts SET user_id = $1 WHERE user_id IS NULL RETURNING id, name`,
        [userId]
      );
      results.accounts = accountsFix.rows.length;
      console.log(`   ✅ Fixed ${accountsFix.rows.length} accounts`);
    } else {
      results.accounts = 0;
      console.log(`   ✅ No NULL accounts found`);
    }
    
    // 2. Check and fix transactions
    console.log('📋 Checking transactions...');
    const transactionsCheck = await client.query(
      `SELECT COUNT(*) as count FROM transactions WHERE user_id IS NULL`
    );
    const transactionsNull = parseInt(transactionsCheck.rows[0].count);
    if (transactionsNull > 0) {
      const transactionsFix = await client.query(
        `UPDATE transactions SET user_id = $1 WHERE user_id IS NULL RETURNING id`,
        [userId]
      );
      results.transactions = transactionsFix.rows.length;
      console.log(`   ✅ Fixed ${transactionsFix.rows.length} transactions`);
    } else {
      results.transactions = 0;
      console.log(`   ✅ No NULL transactions found`);
    }
    
    // 3. Check and fix categories
    console.log('📋 Checking categories...');
    const categoriesCheck = await client.query(
      `SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL`
    );
    const categoriesNull = parseInt(categoriesCheck.rows[0].count);
    if (categoriesNull > 0) {
      const categoriesFix = await client.query(
        `UPDATE categories SET user_id = $1 WHERE user_id IS NULL RETURNING id, name`,
        [userId]
      );
      results.categories = categoriesFix.rows.length;
      console.log(`   ✅ Fixed ${categoriesFix.rows.length} categories`);
    } else {
      results.categories = 0;
      console.log(`   ✅ No NULL categories found`);
    }
    
    // 4. Check and fix user_settings
    console.log('📋 Checking user_settings...');
    try {
      const settingsCheck = await client.query(
        `SELECT COUNT(*) as count FROM user_settings WHERE user_id IS NULL OR user_id = 0`
      );
      const settingsNull = parseInt(settingsCheck.rows[0].count);
      if (settingsNull > 0) {
        // Check if user already has settings
        const existingSettings = await client.query(
          `SELECT user_id FROM user_settings WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        
        if (existingSettings.rows.length > 0) {
          // Merge NULL settings into existing
          const nullSettings = await client.query(
            `SELECT * FROM user_settings WHERE user_id IS NULL OR user_id = 0 LIMIT 1`
          );
          if (nullSettings.rows.length > 0) {
            const nullSetting = nullSettings.rows[0];
            const existingSetting = existingSettings.rows[0];
            const finalIncome = existingSetting.expected_monthly_income || nullSetting.expected_monthly_income || 0;
            
            await client.query(
              `UPDATE user_settings SET expected_monthly_income = $1, updated_at = NOW() WHERE user_id = $2`,
              [finalIncome, userId]
            );
            
            await client.query(
              `DELETE FROM user_settings WHERE user_id IS NULL OR user_id = 0`
            );
            results.settings = 1;
            console.log(`   ✅ Merged and fixed settings`);
          } else {
            results.settings = 0;
            console.log(`   ✅ No NULL settings to merge`);
          }
        } else {
          // Update NULL settings to user_id
          const settingsFix = await client.query(
            `UPDATE user_settings SET user_id = $1 WHERE user_id IS NULL OR user_id = 0 RETURNING user_id`,
            [userId]
          );
          results.settings = settingsFix.rows.length;
          console.log(`   ✅ Fixed ${settingsFix.rows.length} settings`);
        }
      } else {
        results.settings = 0;
        console.log(`   ✅ No NULL settings found`);
      }
    } catch (err) {
      if (err.message.includes('does not exist')) {
        console.log(`   ⚠️  user_settings table does not exist, skipping...`);
        results.settings = 0;
      } else {
        throw err;
      }
    }
    
    // 5. Check and fix budgets (if exists)
    console.log('📋 Checking budgets...');
    try {
      const budgetsCheck = await client.query(
        `SELECT COUNT(*) as count FROM budgets WHERE user_id IS NULL`
      );
      const budgetsNull = parseInt(budgetsCheck.rows[0].count);
      if (budgetsNull > 0) {
        const budgetsFix = await client.query(
          `UPDATE budgets SET user_id = $1 WHERE user_id IS NULL RETURNING id`,
          [userId]
        );
        results.budgets = budgetsFix.rows.length;
        console.log(`   ✅ Fixed ${budgetsFix.rows.length} budgets`);
      } else {
        results.budgets = 0;
        console.log(`   ✅ No NULL budgets found`);
      }
    } catch (err) {
      if (err.message.includes('does not exist')) {
        console.log(`   ⚠️  budgets table does not exist, skipping...`);
        results.budgets = 0;
      } else {
        throw err;
      }
    }
    
    // 6. Check and fix ai_config (if exists)
    console.log('📋 Checking ai_config...');
    try {
      const aiConfigCheck = await client.query(
        `SELECT COUNT(*) as count FROM ai_config WHERE user_id IS NULL`
      );
      const aiConfigNull = parseInt(aiConfigCheck.rows[0].count);
      if (aiConfigNull > 0) {
        const aiConfigFix = await client.query(
          `UPDATE ai_config SET user_id = $1 WHERE user_id IS NULL RETURNING id`,
          [userId]
        );
        results.ai_config = aiConfigFix.rows.length;
        console.log(`   ✅ Fixed ${aiConfigFix.rows.length} AI configs`);
      } else {
        results.ai_config = 0;
        console.log(`   ✅ No NULL AI configs found`);
      }
    } catch (err) {
      if (err.message.includes('does not exist')) {
        console.log(`   ⚠️  ai_config table does not exist, skipping...`);
        results.ai_config = 0;
      } else {
        throw err;
      }
    }
    
    // 7. Check and fix summaries (if exists)
    console.log('📋 Checking summaries...');
    try {
      const summariesCheck = await client.query(
        `SELECT COUNT(*) as count FROM summaries WHERE user_id IS NULL`
      );
      const summariesNull = parseInt(summariesCheck.rows[0].count);
      if (summariesNull > 0) {
        // Summaries have unique constraint on (user_id, month), so we need to merge or delete duplicates
        const nullSummaries = await client.query(
          `SELECT * FROM summaries WHERE user_id IS NULL`
        );
        
        let merged = 0;
        let deleted = 0;
        
        for (const nullSummary of nullSummaries.rows) {
          // Check if user already has a summary for this month
          const existing = await client.query(
            `SELECT id FROM summaries WHERE user_id = $1 AND month = $2`,
            [userId, nullSummary.month]
          );
          
          if (existing.rows.length > 0) {
            // User already has summary for this month, delete the NULL one
            await client.query(
              `DELETE FROM summaries WHERE id = $1`,
              [nullSummary.id]
            );
            deleted++;
          } else {
            // No existing summary, update NULL one to user_id
            await client.query(
              `UPDATE summaries SET user_id = $1 WHERE id = $2`,
              [userId, nullSummary.id]
            );
            merged++;
          }
        }
        
        results.summaries = merged;
        console.log(`   ✅ Merged ${merged} summaries, deleted ${deleted} duplicates`);
      } else {
        results.summaries = 0;
        console.log(`   ✅ No NULL summaries found`);
      }
    } catch (err) {
      if (err.message.includes('does not exist')) {
        console.log(`   ⚠️  summaries table does not exist, skipping...`);
        results.summaries = 0;
      } else {
        throw err;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Comprehensive audit completed!\n');
    console.log('📊 Summary:');
    console.log(`   - Accounts fixed: ${results.accounts}`);
    console.log(`   - Transactions fixed: ${results.transactions}`);
    console.log(`   - Categories fixed: ${results.categories}`);
    console.log(`   - Settings fixed: ${results.settings}`);
    console.log(`   - Budgets fixed: ${results.budgets || 0}`);
    console.log(`   - AI configs fixed: ${results.ai_config || 0}`);
    console.log(`   - Summaries fixed: ${results.summaries || 0}`);
    
    // Final verification
    console.log('\n🔍 Final verification...');
    const finalCheck = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM bank_accounts WHERE user_id IS NULL) as accounts_null,
        (SELECT COUNT(*) FROM transactions WHERE user_id IS NULL) as transactions_null,
        (SELECT COUNT(*) FROM categories WHERE user_id IS NULL) as categories_null,
        (SELECT COUNT(*) FROM user_settings WHERE user_id IS NULL OR user_id = 0) as settings_null
    `);
    
    const final = finalCheck.rows[0];
    const totalNull = parseInt(final.accounts_null) + parseInt(final.transactions_null) + parseInt(final.categories_null) + parseInt(final.settings_null);
    
    if (totalNull === 0) {
      console.log('✅ All data is now linked to user_id =', userId);
    } else {
      console.log('⚠️  Some NULL values remain:');
      console.log(`   - Accounts: ${final.accounts_null}`);
      console.log(`   - Transactions: ${final.transactions_null}`);
      console.log(`   - Categories: ${final.categories_null}`);
      console.log(`   - Settings: ${final.settings_null}`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

auditAndFixAllUserIds().catch(console.error);

