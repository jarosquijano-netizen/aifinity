import pool from './config/database.js';

async function checkIncomeLogic() {
  try {
    // Get all income transactions
    const result = await pool.query(`
      SELECT 
        id,
        date,
        description,
        amount,
        applicable_month,
        EXTRACT(DAY FROM date) as day_of_month,
        TO_CHAR(date, 'YYYY-MM') as transaction_month
      FROM transactions
      WHERE user_id = 1
        AND type = 'income'
      ORDER BY date DESC
      LIMIT 20
    `);
    
    console.log('\n💰 Income Transactions Analysis:\n');
    console.log('='.repeat(120));
    console.log(`${'Date'.padEnd(12)} ${'Day'.padEnd(5)} ${'Transaction Month'.padEnd(18)} ${'Applicable Month'.padEnd(18)} ${'Amount'.padEnd(12)} ${'Description'.substring(0, 40)}`);
    console.log('='.repeat(120));
    
    let shiftedCount = 0;
    let normalCount = 0;
    
    result.rows.forEach((row) => {
      const shifted = row.applicable_month && row.applicable_month !== row.transaction_month;
      const marker = shifted ? '🔄' : '  ';
      
      if (shifted) shiftedCount++;
      else normalCount++;
      
      console.log(
        `${marker} ${row.date.toISOString().split('T')[0].padEnd(12)} ` +
        `${row.day_of_month.toString().padEnd(5)} ` +
        `${row.transaction_month.padEnd(18)} ` +
        `${(row.applicable_month || row.transaction_month).padEnd(18)} ` +
        `€${parseFloat(row.amount).toFixed(2).padStart(10)} ` +
        `${row.description.substring(0, 40)}`
      );
    });
    
    console.log('='.repeat(120));
    console.log(`\n📊 Summary:`);
    console.log(`   Income transactions with auto-shift (día ≥25): ${shiftedCount}`);
    console.log(`   Income transactions normal (día <25): ${normalCount}`);
    console.log(`\n🔄 Auto-shift explanation:`);
    console.log(`   Salaries received on days 25-31 are applied to the NEXT month`);
    console.log(`   Detection criteria:`);
    console.log(`     - Day of month: 25-31`);
    console.log(`     - Amount range: €1,200 - €15,000 (typical salary range)`);
    console.log(`     - Or keywords: nómina, salary, sueldo, paga extra, etc.`);
    console.log(`   Example: Salary on Oct 28 → Counted for November budget\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkIncomeLogic();

