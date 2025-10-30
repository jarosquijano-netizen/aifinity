import pkg from 'pg';
const { Client } = pkg;

async function checkLocalDatabase() {
  console.log('\n🔍 Checking LOCAL PostgreSQL databases...\n');

  // Try different common localhost database configurations
  const configs = [
    { name: 'postgres database', connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' },
    { name: 'finova database', connectionString: 'postgresql://postgres:postgres@localhost:5432/finova' },
    { name: 'postgres (no password)', connectionString: 'postgresql://postgres@localhost:5432/postgres' },
    { name: 'finova (no password)', connectionString: 'postgresql://postgres@localhost:5432/finova' },
  ];

  for (const config of configs) {
    console.log(`\n🔍 Trying: ${config.name}...`);
    const client = new Client({ connectionString: config.connectionString });
    
    try {
      await client.connect();
      console.log(`   ✅ Connected successfully!`);
      
      // Check for users
      const usersResult = await client.query('SELECT COUNT(*) FROM users');
      console.log(`   📊 Users: ${usersResult.rows[0].count}`);
      
      // Check for accounts
      const accountsResult = await client.query('SELECT COUNT(*) FROM bank_accounts');
      console.log(`   🏦 Bank Accounts: ${accountsResult.rows[0].count}`);
      
      // Check for transactions
      const transactionsResult = await client.query('SELECT COUNT(*) FROM transactions');
      console.log(`   💳 Transactions: ${transactionsResult.rows[0].count}`);
      
      // Get users with data
      const detailedUsers = await client.query(`
        SELECT 
          u.email,
          u.full_name,
          COUNT(DISTINCT ba.id) as accounts,
          COUNT(DISTINCT t.id) as transactions
        FROM users u
        LEFT JOIN bank_accounts ba ON ba.user_id = u.id
        LEFT JOIN transactions t ON t.user_id = u.id
        GROUP BY u.email, u.full_name
        ORDER BY u.email
      `);
      
      if (detailedUsers.rows.length > 0) {
        console.log(`\n   👥 Users in this database:`);
        detailedUsers.rows.forEach(user => {
          console.log(`      - ${user.email}: ${user.accounts} accounts, ${user.transactions} transactions`);
        });
      }
      
      // Check if this database has any data
      const totalRecords = parseInt(accountsResult.rows[0].count) + parseInt(transactionsResult.rows[0].count);
      
      if (totalRecords > 0) {
        console.log(`\n   🎉 FOUND DATA IN THIS DATABASE!`);
        console.log(`\n   📝 To use this database, update backend/.env:`);
        console.log(`   DATABASE_URL=${config.connectionString}\n`);
      }
      
      await client.end();
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ Database scan complete!\n');
}

checkLocalDatabase().catch(console.error);

