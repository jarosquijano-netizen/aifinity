import pool from '../config/database.js';

/**
 * Check if transactions are being incorrectly skipped as duplicates
 * This helps identify if December transactions were skipped
 */

async function checkDuplicateSkipping() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for duplicate skipping issues...\n');
    
    // Check for transactions with same date, description, amount but different accounts
    const potentialDuplicates = await client.query(
      `SELECT 
        date, description, amount, COUNT(*) as count,
        array_agg(DISTINCT account_id) as account_ids,
        array_agg(id) as transaction_ids
       FROM transactions
       WHERE date >= '2025-11-25'
       GROUP BY date, description, amount
       HAVING COUNT(*) > 1
       ORDER BY date DESC, count DESC`
    );
    
    console.log(`⚠️  Transactions with same date/description/amount (potential duplicates): ${potentialDuplicates.rows.length}\n`);
    
    if (potentialDuplicates.rows.length > 0) {
      console.log('📋 Potential duplicate groups:');
      potentialDuplicates.rows.slice(0, 10).forEach((row, idx) => {
        console.log(`\n   ${idx + 1}. Date: ${row.date.toISOString().slice(0, 10)} | Amount: €${row.amount}`);
        console.log(`      Description: ${row.description?.substring(0, 60)}...`);
        console.log(`      Count: ${row.count} | Account IDs: ${row.account_ids.join(', ')}`);
        console.log(`      Transaction IDs: ${row.transaction_ids.join(', ')}`);
      });
    }
    
    // Check specifically for Nómina transactions
    const nominaTransactions = await client.query(
      `SELECT 
        id, date, description, category, amount, account_id, user_id
       FROM transactions
       WHERE (
         LOWER(description) LIKE '%nomina%' OR
         LOWER(description) LIKE '%nómina%' OR
         LOWER(description) LIKE '%salario%' OR
         LOWER(description) LIKE '%sueldo%'
       )
       ORDER BY date DESC`
    );
    
    console.log(`\n💰 All Nómina transactions: ${nominaTransactions.rows.length}\n`);
    nominaTransactions.rows.forEach((row, idx) => {
      const dateStr = row.date.toISOString().slice(0, 10);
      const isDecember = dateStr.startsWith('2025-12');
      const marker = isDecember ? '✅ December' : '  ';
      console.log(`${marker} ${idx + 1}. [${dateStr}] ${row.description?.substring(0, 60)}...`);
      console.log(`      ID: ${row.id} | Category: ${row.category} | Amount: €${row.amount} | Account ID: ${row.account_id}`);
    });
    
    // Check if there are transactions that should be December but are dated November
    console.log(`\n🔍 Checking for November-dated transactions that might be December...\n`);
    
    const lateNovemberIncome = await client.query(
      `SELECT 
        id, date, description, category, amount, account_id
       FROM transactions
       WHERE date >= '2025-11-27'
       AND date <= '2025-11-30'
       AND type = 'income'
       AND amount > 2000
       ORDER BY date DESC, amount DESC`
    );
    
    console.log(`💰 Large income transactions (Nov 27-30, >€2000): ${lateNovemberIncome.rows.length}`);
    lateNovemberIncome.rows.forEach((row, idx) => {
      console.log(`\n   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 70)}...`);
      console.log(`      Category: ${row.category} | Amount: €${row.amount} | Account ID: ${row.account_id}`);
      console.log(`      ⚠️  If this should be December, update the date!`);
    });
    
    console.log('\n✅ Check complete!');
    console.log('\n💡 Recommendations:');
    console.log('   1. If December Nómina is missing, re-upload your December bank statement');
    console.log('   2. Check if transactions dated Nov 27-30 should actually be December');
    console.log('   3. The recategorization script did NOT delete transactions - it only updated categories');
    console.log('   4. If transactions were skipped, they were likely marked as duplicates during upload');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('check-duplicate-skipping')) {
  checkDuplicateSkipping()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default checkDuplicateSkipping;





