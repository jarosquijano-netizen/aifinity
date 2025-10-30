import pool from './config/database.js';

async function checkAllData() {
  try {
    console.log('\n🔍 Checking ALL data in database...\n');

    // Check users
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`👥 Total Users: ${usersResult.rows[0].count}`);

    // Check accounts
    const accountsResult = await pool.query('SELECT COUNT(*) FROM bank_accounts');
    console.log(`🏦 Total Bank Accounts: ${accountsResult.rows[0].count}`);

    // Check transactions
    const transactionsResult = await pool.query('SELECT COUNT(*) FROM transactions');
    console.log(`💳 Total Transactions: ${transactionsResult.rows[0].count}`);

    // Check budget
    const budgetResult = await pool.query('SELECT COUNT(*) FROM budget');
    console.log(`💰 Total Budget Categories: ${budgetResult.rows[0].count}`);

    // If there are accounts, show them
    if (parseInt(accountsResult.rows[0].count) > 0) {
      console.log('\n📊 Bank Accounts found:');
      const accounts = await pool.query(`
        SELECT id, user_id, name, account_type, balance, currency 
        FROM bank_accounts 
        ORDER BY id
      `);
      accounts.rows.forEach(acc => {
        console.log(`   - ID ${acc.id}: ${acc.name} (${acc.account_type}) - User ID: ${acc.user_id} - Balance: ${acc.currency} ${acc.balance}`);
      });
    }

    // If there are transactions, show summary
    if (parseInt(transactionsResult.rows[0].count) > 0) {
      console.log('\n💳 Transactions found:');
      const transactions = await pool.query(`
        SELECT user_id, COUNT(*) as count 
        FROM transactions 
        GROUP BY user_id 
        ORDER BY user_id
      `);
      transactions.rows.forEach(t => {
        console.log(`   - User ID ${t.user_id}: ${t.count} transactions`);
      });
    }

    // Check if database is completely empty
    const totalData = parseInt(accountsResult.rows[0].count) + 
                     parseInt(transactionsResult.rows[0].count) + 
                     parseInt(budgetResult.rows[0].count);

    if (totalData === 0) {
      console.log('\n⚠️  DATABASE IS COMPLETELY EMPTY!');
      console.log('\n💡 This means you need to:');
      console.log('   1. Login to http://localhost:5173');
      console.log('   2. Go to "Upload" tab');
      console.log('   3. Upload your bank statements/CSV files');
      console.log('   4. Create your accounts and transactions\n');
    } else {
      console.log(`\n✅ Database has data: ${totalData} records found\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message, '\n');
  } finally {
    await pool.end();
  }
}

checkAllData();

