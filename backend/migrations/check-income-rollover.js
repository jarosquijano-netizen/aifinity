import pool from '../config/database.js';

/**
 * Check for income transactions that were auto-shifted to next month
 * The system moves income transactions from days 25-31 to the next month
 */

async function checkIncomeRollover() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for income rollover (applicable_month)...\n');
    
    // Check if applicable_month column exists
    let hasApplicableMonth = false;
    try {
      const columnCheck = await client.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'transactions' 
         AND column_name = 'applicable_month'`
      );
      hasApplicableMonth = columnCheck.rows.length > 0;
    } catch (e) {
      // Column doesn't exist
    }
    
    if (hasApplicableMonth) {
      console.log('✅ applicable_month column exists\n');
      
      // Get transactions with applicable_month set
      const rolledOver = await client.query(
        `SELECT 
          id, date, description, category, type, amount, applicable_month
         FROM transactions
         WHERE applicable_month IS NOT NULL
         AND type = 'income'
         ORDER BY applicable_month DESC, date DESC`
      );
      
      console.log(`📊 Income transactions with applicable_month set: ${rolledOver.rows.length}\n`);
      
      if (rolledOver.rows.length > 0) {
        // Group by applicable_month
        const byMonth = {};
        rolledOver.rows.forEach(row => {
          const month = row.applicable_month;
          if (!byMonth[month]) {
            byMonth[month] = [];
          }
          byMonth[month].push(row);
        });
        
        console.log('📅 Rolled-over income by applicable_month:');
        Object.keys(byMonth).sort().reverse().forEach(month => {
          const transactions = byMonth[month];
          const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
          console.log(`\n   ${month}: ${transactions.length} transaction(s), Total: €${total.toFixed(2)}`);
          transactions.forEach((t, idx) => {
            console.log(`      ${idx + 1}. [Actual date: ${t.date.toISOString().slice(0, 10)}] ${t.description?.substring(0, 60)}...`);
            console.log(`         Amount: €${t.amount} | Category: ${t.category}`);
          });
        });
        
        // Check specifically for December 2025 or January 2026
        const decemberRolled = rolledOver.rows.filter(r => r.applicable_month === '2025-12');
        const januaryRolled = rolledOver.rows.filter(r => r.applicable_month === '2026-01');
        
        console.log(`\n📅 December 2025 rolled-over income: ${decemberRolled.length}`);
        if (decemberRolled.length > 0) {
          decemberRolled.forEach(t => {
            console.log(`   - [${t.date.toISOString().slice(0, 10)}] ${t.description?.substring(0, 60)}...`);
            console.log(`     Amount: €${t.amount} | Category: ${t.category}`);
          });
        }
        
        console.log(`\n📅 January 2026 rolled-over income: ${januaryRolled.length}`);
        if (januaryRolled.length > 0) {
          januaryRolled.forEach(t => {
            const isNomina = t.description?.toLowerCase().includes('nomina') || 
                            t.description?.toLowerCase().includes('nómina');
            const marker = isNomina ? '⭐ NÓMINA' : '  ';
            console.log(`   ${marker} [${t.date.toISOString().slice(0, 10)}] ${t.description?.substring(0, 60)}...`);
            console.log(`     Amount: €${t.amount} | Category: ${t.category}`);
            if (isNomina && t.date.toISOString().slice(0, 7) === '2025-12') {
              console.log(`     ⚠️  This December Nómina was rolled over to January 2026!`);
            }
          });
        }
      }
    } else {
      console.log('⚠️  applicable_month column does not exist\n');
      console.log('💡 The income rollover feature may not be active, or the column was removed.');
    }
    
    // Check for income transactions in late December (days 25-31) that might have been rolled over
    const lateDecemberIncome = await client.query(
      `SELECT 
        id, date, description, category, type, amount, ${hasApplicableMonth ? 'applicable_month' : 'NULL as applicable_month'}
       FROM transactions
       WHERE date >= '2025-12-25'
       AND date <= '2025-12-31'
       AND type = 'income'
       ORDER BY date DESC`
    );
    
    console.log(`\n💰 Income transactions in late December (Dec 25-31): ${lateDecemberIncome.rows.length}`);
    if (lateDecemberIncome.rows.length > 0) {
      lateDecemberIncome.rows.forEach((row, idx) => {
        const isNomina = row.description?.toLowerCase().includes('nomina') || 
                        row.description?.toLowerCase().includes('nómina');
        const marker = isNomina ? '⭐ NÓMINA' : '  ';
        console.log(`\n   ${marker} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
        console.log(`      Amount: €${row.amount} | Category: ${row.category}`);
        if (hasApplicableMonth && row.applicable_month) {
          console.log(`      ⚠️  Rolled over to: ${row.applicable_month}`);
        }
      });
    } else {
      console.log('   ❌ No income transactions found in late December');
      console.log('   💡 If your December Nómina was paid Dec 25-31, it might have been rolled over to January 2026');
    }
    
    // Check for any income in January 2026
    const january2026Income = await client.query(
      `SELECT 
        id, date, description, category, type, amount, ${hasApplicableMonth ? 'applicable_month' : 'NULL as applicable_month'}
       FROM transactions
       WHERE date >= '2026-01-01'
       AND date <= '2026-01-31'
       AND type = 'income'
       ORDER BY date DESC`
    );
    
    console.log(`\n💰 Income transactions in January 2026: ${january2026Income.rows.length}`);
    if (january2026Income.rows.length > 0) {
      january2026Income.rows.forEach((row, idx) => {
        const isNomina = row.description?.toLowerCase().includes('nomina') || 
                        row.description?.toLowerCase().includes('nómina');
        const marker = isNomina ? '⭐ NÓMINA' : '  ';
        console.log(`\n   ${marker} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
        console.log(`      Amount: €${row.amount} | Category: ${row.category}`);
        if (hasApplicableMonth && row.applicable_month) {
          console.log(`      Rolled over from: ${row.date.toISOString().slice(0, 7)} → ${row.applicable_month}`);
        }
      });
    }
    
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('check-income-rollover')) {
  checkIncomeRollover()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default checkIncomeRollover;





