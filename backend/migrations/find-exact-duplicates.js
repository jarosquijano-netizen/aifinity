import pool from '../config/database.js';

/**
 * Find exact duplicates - transactions that match on date, description, amount
 * regardless of account_id differences
 */
async function findExactDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding exact duplicate transactions...\n');
    
    // Find duplicates based on date, description, amount (ignoring account_id)
    const duplicates = await client.query(`
      SELECT 
        date,
        TRIM(description) as description,
        amount,
        category,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY id ASC) as transaction_ids,
        ARRAY_AGG(account_id) as account_ids,
        ARRAY_AGG(user_id) as user_ids
      FROM transactions
      WHERE category = 'Servicio doméstico'
      GROUP BY date, TRIM(description), amount, category
      HAVING COUNT(*) > 1
      ORDER BY date DESC
    `);

    console.log(`📊 Found ${duplicates.rows.length} sets of duplicate transactions in "Servicio doméstico"\n`);

    if (duplicates.rows.length === 0) {
      console.log('✅ No exact duplicates found');
      
      // Let's also check for the specific transaction the user mentioned
      console.log('\n🔍 Checking for the specific transaction mentioned (Oct 16, REINTEGRO CAJERO AUTOMATICO 15.10, -270):\n');
      
      const specificCheck = await client.query(`
        SELECT 
          id,
          date,
          description,
          amount,
          account_id,
          user_id,
          category,
          bank
        FROM transactions
        WHERE category = 'Servicio doméstico'
          AND date = '2025-10-16'
          AND amount = -270
          AND description LIKE '%REINTEGRO CAJERO AUTOMATICO 15.10%'
        ORDER BY id ASC
      `);
      
      console.log(`Found ${specificCheck.rows.length} matching transactions:\n`);
      specificCheck.rows.forEach((t, idx) => {
        console.log(`${idx + 1}. ID: ${t.id}`);
        console.log(`   Date: ${t.date}`);
        console.log(`   Description: "${t.description}"`);
        console.log(`   Amount: €${t.amount}`);
        console.log(`   Account ID: ${t.account_id}`);
        console.log(`   User ID: ${t.user_id}`);
        console.log(`   Bank: ${t.bank}`);
        console.log('');
      });
      
      return;
    }

    // Show duplicates found
    duplicates.rows.forEach((dup, idx) => {
      console.log(`\n${idx + 1}. Duplicate Group:`);
      console.log(`   Date: ${dup.date}`);
      console.log(`   Description: "${dup.description}"`);
      console.log(`   Amount: €${dup.amount}`);
      console.log(`   Count: ${dup.count}`);
      console.log(`   Transaction IDs: ${dup.transaction_ids.join(', ')}`);
      console.log(`   Account IDs: ${dup.account_ids.join(', ')}`);
      console.log(`   User IDs: ${dup.user_ids.join(', ')}`);
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
findExactDuplicates()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });






