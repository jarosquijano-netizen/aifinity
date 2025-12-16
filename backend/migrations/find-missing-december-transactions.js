import pool from '../config/database.js';

/**
 * Find missing December transactions
 * Check for transactions that might have been incorrectly dated or categorized
 */

async function findMissingDecemberTransactions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Searching for missing December transactions...\n');
    
    // Check all transactions from late November to early December
    const lateNovEarlyDec = await client.query(
      `SELECT 
        id, date, description, category, type, amount, computable
       FROM transactions
       WHERE date >= '2025-11-25'
       AND date <= '2025-12-05'
       ORDER BY date DESC, id DESC`
    );
    
    console.log(`📊 Transactions from Nov 25 - Dec 5: ${lateNovEarlyDec.rows.length}\n`);
    
    // Group by date
    const byDate = {};
    lateNovEarlyDec.rows.forEach(row => {
      const dateStr = row.date.toISOString().slice(0, 10);
      if (!byDate[dateStr]) {
        byDate[dateStr] = [];
      }
      byDate[dateStr].push(row);
    });
    
    console.log('📅 Transactions by date:');
    Object.keys(byDate).sort().reverse().forEach(date => {
      const transactions = byDate[date];
      const income = transactions.filter(t => t.type === 'income');
      const expenses = transactions.filter(t => t.type === 'expense');
      console.log(`\n   ${date}: ${transactions.length} transactions (${income.length} income, ${expenses.length} expenses)`);
      
      // Show income transactions
      if (income.length > 0) {
        console.log(`      💰 Income:`);
        income.forEach(t => {
          const isNomina = t.description?.toLowerCase().includes('nomina') || 
                          t.description?.toLowerCase().includes('nómina') ||
                          t.description?.toLowerCase().includes('salario') ||
                          t.description?.toLowerCase().includes('sueldo');
          const marker = isNomina ? '⭐ NÓMINA' : '  ';
          console.log(`         ${marker} ${t.description?.substring(0, 60)}...`);
          console.log(`            Category: ${t.category} | Amount: €${t.amount} | Computable: ${t.computable}`);
        });
      }
    });
    
    // Check specifically for Nómina-like transactions in late November
    const possibleDecemberNomina = await client.query(
      `SELECT 
        id, date, description, category, type, amount, computable
       FROM transactions
       WHERE date >= '2025-11-25'
       AND date <= '2025-12-05'
       AND type = 'income'
       AND (
         LOWER(description) LIKE '%nomina%' OR
         LOWER(description) LIKE '%nómina%' OR
         LOWER(description) LIKE '%salario%' OR
         LOWER(description) LIKE '%sueldo%' OR
         LOWER(description) LIKE '%salary%' OR
         LOWER(description) LIKE '%payroll%' OR
         LOWER(description) LIKE '%majorica%' OR
         LOWER(description) LIKE '%freightos%'
       )
       ORDER BY date DESC`
    );
    
    console.log(`\n💰 Possible December Nómina transactions (Nov 25 - Dec 5): ${possibleDecemberNomina.rows.length}`);
    if (possibleDecemberNomina.rows.length > 0) {
      possibleDecemberNomina.rows.forEach((row, idx) => {
        const dateStr = row.date.toISOString().slice(0, 10);
        const isDecember = dateStr.startsWith('2025-12');
        const marker = isDecember ? '✅ December' : '⚠️  November';
        console.log(`\n   ${marker} ${idx + 1}. [${dateStr}] ${row.description?.substring(0, 70)}...`);
        console.log(`      Category: ${row.category} | Amount: €${row.amount} | Computable: ${row.computable}`);
        if (!isDecember && parseFloat(row.amount) > 2000) {
          console.log(`      ⚠️  This might be your December Nómina dated incorrectly!`);
        }
      });
    }
    
    // Check for large income transactions that might be Nómina
    const largeIncome = await client.query(
      `SELECT 
        id, date, description, category, type, amount, computable
       FROM transactions
       WHERE date >= '2025-11-25'
       AND date <= '2025-12-05'
       AND type = 'income'
       AND amount > 2000
       ORDER BY date DESC`
    );
    
    console.log(`\n💰 Large income transactions (>€2000) from Nov 25 - Dec 5: ${largeIncome.rows.length}`);
    if (largeIncome.rows.length > 0) {
      largeIncome.rows.forEach((row, idx) => {
        const dateStr = row.date.toISOString().slice(0, 10);
        const isDecember = dateStr.startsWith('2025-12');
        const marker = isDecember ? '✅ December' : '⚠️  November';
        console.log(`\n   ${marker} ${idx + 1}. [${dateStr}] ${row.description?.substring(0, 70)}...`);
        console.log(`      Category: ${row.category} | Amount: €${row.amount} | Computable: ${row.computable}`);
      });
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   - Total transactions in database: 876`);
    console.log(`   - December transactions: 24 (1 income, 23 expenses)`);
    console.log(`   - November transactions: 369 (39 income, 330 expenses)`);
    console.log(`   - October transactions: 474 (46 income, 428 expenses)`);
    
    console.log('\n💡 If December Nómina is missing:');
    console.log('   1. Check if it was uploaded but dated November 30');
    console.log('   2. Check if it was marked as a duplicate and skipped');
    console.log('   3. Check if it was categorized incorrectly');
    console.log('   4. You may need to re-upload your December bank statement');
    
    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('find-missing-december-transactions')) {
  findMissingDecemberTransactions()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default findMissingDecemberTransactions;





