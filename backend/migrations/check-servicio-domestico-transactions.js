import pool from '../config/database.js';

/**
 * Check all transactions in "Servicio doméstico" category to see what's there
 */
async function checkServicioDomesticoTransactions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking all transactions in "Servicio doméstico" category...\n');
    
    // Get all transactions in this category
    const result = await client.query(`
      SELECT 
        id,
        date,
        description,
        amount,
        account_id,
        user_id,
        category,
        bank,
        LENGTH(description) as desc_length,
        TRIM(description) as clean_description
      FROM transactions
      WHERE category = 'Servicio doméstico'
      ORDER BY date DESC, id ASC
    `);

    console.log(`📊 Found ${result.rows.length} transactions in "Servicio doméstico" category\n`);

    if (result.rows.length === 0) {
      console.log('✅ No transactions found in this category');
      return;
    }

    // Group by similar characteristics
    result.rows.forEach((t, idx) => {
      console.log(`\n${idx + 1}. Transaction ID: ${t.id}`);
      console.log(`   Date: ${t.date}`);
      console.log(`   Amount: €${t.amount}`);
      console.log(`   Account ID: ${t.account_id || 'null'}`);
      console.log(`   User ID: ${t.user_id || 'null'}`);
      console.log(`   Bank: ${t.bank || 'null'}`);
      console.log(`   Description length: ${t.desc_length}`);
      console.log(`   Description: "${t.description}"`);
      console.log(`   Clean description: "${t.clean_description}"`);
    });

    // Check for potential duplicates (same date and amount)
    console.log('\n\n🔍 Checking for potential duplicates (same date + amount):\n');
    
    const potentialDuplicates = new Map();
    
    result.rows.forEach(transaction => {
      const key = `${transaction.date}|${transaction.amount}`;
      if (!potentialDuplicates.has(key)) {
        potentialDuplicates.set(key, []);
      }
      potentialDuplicates.get(key).push(transaction);
    });

    potentialDuplicates.forEach((transactions, key) => {
      if (transactions.length > 1) {
        console.log(`\n⚠️  Potential duplicate group (Date: ${transactions[0].date}, Amount: €${transactions[0].amount}):`);
        transactions.forEach(t => {
          console.log(`   ID: ${t.id} - "${t.description?.substring(0, 60)}..."`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run check
checkServicioDomesticoTransactions()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });






