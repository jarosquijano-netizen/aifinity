import pool from './config/database.js';
import fs from 'fs';

async function importUserData(jsonFile, targetEmail) {
  const client = await pool.connect();
  
  try {
    console.log(`\n📥 Importing data from: ${jsonFile}`);
    console.log(`🎯 Target user: ${targetEmail}\n`);

    // Read export file
    if (!fs.existsSync(jsonFile)) {
      console.log(`❌ File not found: ${jsonFile}`);
      return;
    }

    const exportData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`📦 Export date: ${exportData.exportDate}`);
    console.log(`📊 Data summary:`);
    console.log(`   - Accounts: ${exportData.stats.totalAccounts}`);
    console.log(`   - Transactions: ${exportData.stats.totalTransactions}`);
    console.log(`   - Budget Categories: ${exportData.stats.totalBudgetCategories}\n`);

    // Get target user
    const userResult = await client.query(
      'SELECT id, email, full_name FROM users WHERE email = $1',
      [targetEmail]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ Target user ${targetEmail} not found!`);
      console.log(`💡 Make sure the user is registered first.`);
      return;
    }

    const targetUser = userResult.rows[0];
    console.log(`✅ Found target user: ${targetUser.full_name} (ID: ${targetUser.id})\n`);

    await client.query('BEGIN');

    // Import bank accounts
    console.log('📊 Importing bank accounts...');
    const accountIdMapping = {}; // old ID -> new ID
    
    for (const account of exportData.accounts) {
      const result = await client.query(
        `INSERT INTO bank_accounts 
         (user_id, name, account_type, balance, currency, color, credit_limit, 
          statement_day, due_day, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         RETURNING id`,
        [
          targetUser.id,
          account.name,
          account.account_type,
          account.balance,
          account.currency,
          account.color,
          account.credit_limit,
          account.statement_day,
          account.due_day,
          account.created_at
        ]
      );
      accountIdMapping[account.id] = result.rows[0].id;
      console.log(`   ✓ ${account.name} (${account.account_type})`);
    }

    // Import transactions
    console.log(`\n💳 Importing transactions...`);
    let transactionCount = 0;
    
    for (const transaction of exportData.transactions) {
      // Map old account_id to new account_id
      const newAccountId = accountIdMapping[transaction.account_id];
      
      await client.query(
        `INSERT INTO transactions 
         (user_id, date, description, amount, category, type, account_id, 
          is_computable, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          targetUser.id,
          transaction.date,
          transaction.description,
          transaction.amount,
          transaction.category,
          transaction.type,
          newAccountId,
          transaction.is_computable,
          transaction.created_at
        ]
      );
      transactionCount++;
      
      if (transactionCount % 100 === 0) {
        console.log(`   ✓ Imported ${transactionCount} transactions...`);
      }
    }
    console.log(`   ✅ Total transactions imported: ${transactionCount}`);

    // Import budget
    console.log(`\n💰 Importing budget...`);
    for (const budget of exportData.budget) {
      await client.query(
        `INSERT INTO budget (user_id, category, amount, color, icon, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, category) DO UPDATE 
         SET amount = $3, color = $4, icon = $5`,
        [
          targetUser.id,
          budget.category,
          budget.amount,
          budget.color,
          budget.icon,
          budget.created_at
        ]
      );
      console.log(`   ✓ ${budget.category}: €${budget.amount}`);
    }

    // Import settings
    if (exportData.settings) {
      console.log(`\n⚙️  Importing settings...`);
      await client.query(
        `INSERT INTO user_settings 
         (user_id, expected_monthly_income, actual_income_current_month, 
          last_income_update, created_at) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE 
         SET expected_monthly_income = $2, 
             actual_income_current_month = $3, 
             last_income_update = $4`,
        [
          targetUser.id,
          exportData.settings.expected_monthly_income,
          exportData.settings.actual_income_current_month,
          exportData.settings.last_income_update,
          exportData.settings.created_at
        ]
      );
      console.log(`   ✓ Expected income: €${exportData.settings.expected_monthly_income}`);
    }

    await client.query('COMMIT');

    console.log(`\n✅ Import complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Bank accounts: ${exportData.stats.totalAccounts}`);
    console.log(`   - Transactions: ${transactionCount}`);
    console.log(`   - Budget categories: ${exportData.stats.totalBudgetCategories}`);
    console.log(`\n🎉 Data successfully imported for ${targetEmail}!\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Import error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get parameters from command line
const jsonFile = process.argv[2];
const targetEmail = process.argv[3];

if (!jsonFile || !targetEmail) {
  console.log('❌ Missing parameters');
  console.log('Usage: node import-user-data.js JSON_FILE TARGET_EMAIL');
  console.log('Example: node import-user-data.js user-data-export.json newuser@example.com');
  process.exit(1);
}

importUserData(jsonFile, targetEmail);

