import pool from '../config/database.js';

/**
 * Find duplicates more flexibly - check for transactions with same date and description pattern
 */
async function findServicioDuplicatesFlexible() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding duplicate transactions flexibly...\n');
    
    // Check for transactions with "REINTEGRO CAJERO AUTOMATICO 15.10" on Oct 16
    const check1 = await client.query(`
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
        AND (description LIKE '%REINTEGRO CAJERO AUTOMATICO 15.10%' 
             OR description LIKE '%REINTEGRO CAJERO AUTOMATICO%15.10%')
      ORDER BY id ASC
    `);
    
    console.log(`📊 Transactions on Oct 16 with "REINTEGRO CAJERO AUTOMATICO 15.10": ${check1.rows.length}\n`);
    
    check1.rows.forEach((t, idx) => {
      console.log(`${idx + 1}. ID: ${t.id}`);
      console.log(`   Date: ${t.date}`);
      console.log(`   Description: "${t.description}"`);
      console.log(`   Amount: €${t.amount}`);
      console.log(`   Account ID: ${t.account_id}`);
      console.log(`   Bank: ${t.bank}`);
      console.log('');
    });
    
    // Also check for any duplicates in Servicio doméstico with same date and similar amounts
    const check2 = await client.query(`
      SELECT 
        date,
        TRIM(description) as clean_desc,
        ABS(amount) as abs_amount,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY id ASC) as ids,
        ARRAY_AGG(amount) as amounts
      FROM transactions
      WHERE category = 'Servicio doméstico'
      GROUP BY date, TRIM(description), ABS(amount)
      HAVING COUNT(*) > 1
      ORDER BY date DESC
    `);
    
    console.log(`\n📊 Duplicate groups (same date + description + absolute amount): ${check2.rows.length}\n`);
    
    check2.rows.forEach((dup, idx) => {
      console.log(`${idx + 1}. Date: ${dup.date}`);
      console.log(`   Description: "${dup.clean_desc}"`);
      console.log(`   Amount: €${dup.abs_amount}`);
      console.log(`   Count: ${dup.count}`);
      console.log(`   IDs: ${dup.ids.join(', ')}`);
      console.log(`   Amounts: ${dup.amounts.join(', ')}`);
      console.log('');
    });
    
    // If we found duplicates, offer to delete them
    if (check2.rows.length > 0) {
      const allIdsToDelete = [];
      check2.rows.forEach(dup => {
        const ids = dup.ids;
        // Keep the first (oldest) ID, delete the rest
        allIdsToDelete.push(...ids.slice(1));
      });
      
      console.log(`\n🗑️  Would delete ${allIdsToDelete.length} duplicate transaction(s)`);
      console.log(`   IDs to delete: ${allIdsToDelete.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run check
findServicioDuplicatesFlexible()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });







