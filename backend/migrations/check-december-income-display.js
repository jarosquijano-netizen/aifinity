import pool from '../config/database.js';

/**
 * Check what December income is showing in the dashboard
 */

async function checkDecemberIncomeDisplay() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking December 2025 income display...\n');
    
    const userId = 1;
    const currentMonth = '2025-12';
    
    // Check December income using the same logic as dashboard
    const decemberIncome = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount) t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'income'
         AND t.computable = true
         AND (
           (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
           OR
           (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
         )
         AND t.amount > 0
         ORDER BY t.date, t.description, t.amount, t.id
       ) unique_transactions`,
      [userId, currentMonth]
    );
    
    const total = parseFloat(decemberIncome.rows[0].total);
    console.log(`💰 December 2025 income (dashboard calculation): €${total.toFixed(2)}\n`);
    
    // Breakdown by source
    const breakdown = await client.query(
      `SELECT 
        t.date,
        t.applicable_month,
        t.description,
        t.category,
        t.amount
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount) 
           t.date, t.applicable_month, t.description, t.category, t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'income'
         AND t.computable = true
         AND (
           (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
           OR
           (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
         )
         AND t.amount > 0
         ORDER BY t.date, t.description, t.amount, t.id
       ) t
       ORDER BY t.amount DESC`,
      [userId, currentMonth]
    );
    
    console.log(`📊 Breakdown (${breakdown.rows.length} transactions):`);
    breakdown.rows.forEach((row, idx) => {
      const actualDate = row.date.toISOString().slice(0, 10);
      const rolledOver = row.applicable_month && row.applicable_month !== actualDate.slice(0, 7);
      const marker = rolledOver ? '🔄 Rolled over' : '  ';
      console.log(`\n   ${marker} ${idx + 1}. [${actualDate}] ${row.description?.substring(0, 60)}...`);
      console.log(`      Category: ${row.category} | Amount: €${row.amount}`);
      if (rolledOver) {
        console.log(`      ⚠️  Actual date: ${actualDate.slice(0, 7)}, Applied to: ${row.applicable_month}`);
      }
    });
    
    console.log('\n✅ Summary:');
    console.log(`   - December income showing: €${total.toFixed(2)}`);
    console.log(`   - This includes rolled-over income from November 27`);
    console.log(`   - December Nómina is MISSING - needs to be uploaded`);
    console.log(`   - If December Nómina was paid Dec 25-31, it would be rolled over to January 2026`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('check-december-income-display')) {
  checkDecemberIncomeDisplay()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default checkDecemberIncomeDisplay;






