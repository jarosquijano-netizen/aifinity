import pool from '../config/database.js';

/**
 * Comprehensive duplicate finder - checks all categories including variations
 */
async function findAllDuplicatesComprehensive() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Comprehensive duplicate check...\n');
    
    // Check for "Servicio doméstico" with variations
    const servicioVariations = await client.query(`
      SELECT 
        category,
        COUNT(*) as count
      FROM transactions
      WHERE LOWER(category) LIKE '%servicio%domestico%'
         OR LOWER(category) LIKE '%servicio%doméstico%'
      GROUP BY category
      ORDER BY category
    `);
    
    console.log('📊 Transactions in "Servicio doméstico" variations:');
    servicioVariations.rows.forEach(row => {
      console.log(`   "${row.category}": ${row.count} transactions`);
    });
    console.log('');
    
    // Check for duplicates across all "servicio domestico" variations
    const allServicio = await client.query(`
      SELECT 
        id,
        date,
        description,
        amount,
        category,
        account_id,
        user_id,
        TRIM(REGEXP_REPLACE(description, '\\s+', ' ', 'g')) as normalized_desc,
        ABS(amount) as abs_amount
      FROM transactions
      WHERE LOWER(category) LIKE '%servicio%domestico%'
         OR LOWER(category) LIKE '%servicio%doméstico%'
      ORDER BY date DESC, id ASC
    `);
    
    console.log(`📊 Total transactions in servicio domestico variations: ${allServicio.rows.length}\n`);
    
    // Group by date, normalized description, and absolute amount
    const grouped = new Map();
    
    allServicio.rows.forEach(transaction => {
      const key = `${transaction.date}|${transaction.normalized_desc}|${transaction.abs_amount}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(transaction);
    });
    
    // Find duplicates
    const duplicates = [];
    grouped.forEach((transactions, key) => {
      if (transactions.length > 1) {
        transactions.sort((a, b) => a.id - b.id);
        duplicates.push({
          date: transactions[0].date,
          description: transactions[0].normalized_desc,
          amount: transactions[0].amount,
          count: transactions.length,
          keepId: transactions[0].id,
          deleteIds: transactions.slice(1).map(t => t.id),
          transactions: transactions
        });
      }
    });
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found in servicio domestico variations\n');
    } else {
      console.log(`⚠️  Found ${duplicates.length} duplicate groups:\n`);
      duplicates.forEach((dup, idx) => {
        console.log(`${idx + 1}. Date: ${dup.date}`);
        console.log(`   Description: "${dup.description}"`);
        console.log(`   Amount: €${dup.amount}`);
        console.log(`   Count: ${dup.count}`);
        console.log(`   Keeping ID: ${dup.keepId}`);
        console.log(`   Deleting IDs: ${dup.deleteIds.join(', ')}`);
        console.log('');
      });
    }
    
    // Also check ALL transactions for duplicates (not just servicio domestico)
    console.log('\n🔍 Checking ALL transactions for duplicates (all categories)...\n');
    
    const allDuplicates = await client.query(`
      SELECT 
        date,
        TRIM(REGEXP_REPLACE(description, '\\s+', ' ', 'g')) as normalized_desc,
        ABS(amount) as abs_amount,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY id ASC) as ids
      FROM transactions
      GROUP BY date, TRIM(REGEXP_REPLACE(description, '\\s+', ' ', 'g')), ABS(amount)
      HAVING COUNT(*) > 1
      ORDER BY date DESC
      LIMIT 20
    `);
    
    console.log(`📊 Found ${allDuplicates.rows.length} duplicate groups across all categories (showing first 20):\n`);
    
    allDuplicates.rows.forEach((dup, idx) => {
      console.log(`${idx + 1}. Date: ${dup.date}`);
      console.log(`   Description: "${dup.normalized_desc?.substring(0, 50)}..."`);
      console.log(`   Amount: €${dup.abs_amount}`);
      console.log(`   Count: ${dup.count}`);
      console.log(`   IDs: ${dup.ids.join(', ')}`);
      console.log('');
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
findAllDuplicatesComprehensive()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });







