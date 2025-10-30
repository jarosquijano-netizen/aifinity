import pool from './config/database.js';

async function checkUsers() {
  try {
    console.log('\n🔍 Checking localhost database for users...\n');

    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.created_at,
        COUNT(DISTINCT ba.id) as account_count,
        COUNT(DISTINCT t.id) as transaction_count
      FROM users u
      LEFT JOIN bank_accounts ba ON ba.user_id = u.id
      LEFT JOIN transactions t ON t.user_id = u.id
      GROUP BY u.id, u.email, u.full_name, u.created_at
      ORDER BY u.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No users found in localhost database!');
      console.log('\n💡 This might mean:');
      console.log('   1. Your localhost backend is pointing to production database');
      console.log('   2. You need to create a user on localhost first');
      console.log('\n📝 Check your backend/.env file:\n');
      return;
    }

    console.log(`📊 Found ${result.rows.length} user(s) in localhost:\n`);

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. 👤 ${user.full_name || 'No name'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Accounts: ${user.account_count}`);
      console.log(`   Transactions: ${user.transaction_count}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log('');
    });

    // Recommend which user to export
    const userWithMostData = result.rows.reduce((prev, current) => {
      const prevTotal = parseInt(prev.account_count) + parseInt(prev.transaction_count);
      const currentTotal = parseInt(current.account_count) + parseInt(current.transaction_count);
      return currentTotal > prevTotal ? current : prev;
    });

    if (parseInt(userWithMostData.account_count) > 0 || parseInt(userWithMostData.transaction_count) > 0) {
      console.log('💡 Recommendation:');
      console.log(`   Export "${userWithMostData.email}" - has the most data!`);
      console.log('\n📦 To export, run:');
      console.log(`   node export-user-data.js ${userWithMostData.email}\n`);
    } else {
      console.log('⚠️  None of these users have any data (accounts/transactions)');
      console.log('💡 You might want to check if localhost is working correctly\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Your localhost PostgreSQL is running');
    console.log('   2. backend/.env points to your localhost database');
    console.log('   3. The database exists and has data\n');
  } finally {
    await pool.end();
  }
}

checkUsers();

