import pool from './config/database.js';
import fs from 'fs';

async function exportUserData(userEmail) {
  const client = await pool.connect();
  
  try {
    console.log(`\n📦 Exporting data for user: ${userEmail}\n`);

    // Get user
    const userResult = await client.query(
      'SELECT id, email, full_name, created_at FROM users WHERE email = $1',
      [userEmail]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User ${userEmail} not found!`);
      return;
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.full_name} (ID: ${user.id})`);

    // Get bank accounts
    const accountsResult = await client.query(
      `SELECT id, name, account_type, balance, currency, color, credit_limit, 
              statement_day, due_day, created_at 
       FROM bank_accounts 
       WHERE user_id = $1 
       ORDER BY id`,
      [user.id]
    );
    console.log(`📊 Found ${accountsResult.rows.length} bank accounts`);

    // Get transactions
    const transactionsResult = await client.query(
      `SELECT id, date, description, amount, category, type, account_id, 
              is_computable, created_at 
       FROM transactions 
       WHERE user_id = $1 
       ORDER BY date DESC`,
      [user.id]
    );
    console.log(`💳 Found ${transactionsResult.rows.length} transactions`);

    // Get budget
    const budgetResult = await client.query(
      `SELECT category, amount, color, icon, created_at 
       FROM budget 
       WHERE user_id = $1 
       ORDER BY category`,
      [user.id]
    );
    console.log(`💰 Found ${budgetResult.rows.length} budget categories`);

    // Get settings
    const settingsResult = await client.query(
      `SELECT expected_monthly_income, actual_income_current_month, 
              last_income_update, created_at, updated_at 
       FROM user_settings 
       WHERE user_id = $1`,
      [user.id]
    );
    console.log(`⚙️  Found ${settingsResult.rows.length} settings`);

    // Create export object
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        email: user.email,
        fullName: user.full_name,
        createdAt: user.created_at
      },
      accounts: accountsResult.rows,
      transactions: transactionsResult.rows,
      budget: budgetResult.rows,
      settings: settingsResult.rows[0] || null,
      stats: {
        totalAccounts: accountsResult.rows.length,
        totalTransactions: transactionsResult.rows.length,
        totalBudgetCategories: budgetResult.rows.length
      }
    };

    // Save to file
    const filename = `user-data-export-${userEmail.replace('@', '-')}-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));

    console.log(`\n✅ Export complete!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Summary:`);
    console.log(`   - Accounts: ${exportData.stats.totalAccounts}`);
    console.log(`   - Transactions: ${exportData.stats.totalTransactions}`);
    console.log(`   - Budget Categories: ${exportData.stats.totalBudgetCategories}`);
    console.log(`\n💡 To import this data, run:`);
    console.log(`   node import-user-data.js ${filename} TARGET_EMAIL\n`);

  } catch (error) {
    console.error('❌ Export error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide user email');
  console.log('Usage: node export-user-data.js EMAIL');
  console.log('Example: node export-user-data.js user@example.com');
  process.exit(1);
}

exportUserData(email);

