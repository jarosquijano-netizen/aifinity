import pool from '../config/database.js';

/**
 * Check for missing Nómina transactions and suggest when to expect them
 */

async function checkMissingNomina() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for missing Nómina transactions...\n');
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    
    console.log(`📅 Current date: ${currentDate.toISOString().slice(0, 10)}`);
    console.log(`📅 Current month: ${currentMonth}/${currentYear}\n`);
    
    // Get all Nómina transactions
    const allNomina = await client.query(
      `SELECT 
        date,
        description,
        category,
        amount,
        TO_CHAR(date, 'YYYY-MM') as month
       FROM transactions
       WHERE type = 'income'
       AND (
         LOWER(description) LIKE '%nomina%' OR
         LOWER(description) LIKE '%nómina%' OR
         LOWER(description) LIKE '%salario%' OR
         LOWER(description) LIKE '%sueldo%' OR
         LOWER(description) LIKE '%salary%' OR
         LOWER(description) LIKE '%payroll%' OR
         category LIKE '%Ingresos%'
       )
       AND computable = true
       ORDER BY date DESC`
    );
    
    console.log(`💰 Found ${allNomina.rows.length} Nómina transactions:\n`);
    
    if (allNomina.rows.length > 0) {
      // Group by month
      const byMonth = {};
      allNomina.rows.forEach(row => {
        const month = row.month;
        if (!byMonth[month]) {
          byMonth[month] = [];
        }
        byMonth[month].push(row);
      });
      
      // Show by month
      Object.keys(byMonth).sort().reverse().forEach(month => {
        const transactions = byMonth[month];
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        console.log(`📅 ${month}: ${transactions.length} transaction(s), Total: €${total.toFixed(2)}`);
        transactions.forEach((t, idx) => {
          console.log(`   ${idx + 1}. [${t.date.toISOString().slice(0, 10)}] ${t.description?.substring(0, 60)}...`);
          console.log(`      Amount: €${t.amount}`);
        });
        console.log('');
      });
      
      // Check current month
      const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      const hasCurrentMonth = byMonth[currentMonthStr];
      
      if (!hasCurrentMonth) {
        console.log(`⚠️  NO NÓMINA FOUND FOR ${currentMonthStr}\n`);
        console.log('💡 Possible reasons:');
        console.log('   1. December Nómina hasn\'t been paid yet');
        console.log('   2. December Nómina hasn\'t been uploaded to the system');
        console.log('   3. Transaction date is incorrect (check if dated November)');
        console.log('   4. Transaction was categorized incorrectly\n');
        
        // Check if there are any income transactions for current month
        const currentMonthIncome = await client.query(
          `SELECT COUNT(*) as count
           FROM transactions
           WHERE type = 'income'
           AND computable = true
           AND TO_CHAR(date, 'YYYY-MM') = $1`,
          [currentMonthStr]
        );
        
        console.log(`📊 Other income transactions for ${currentMonthStr}: ${currentMonthIncome.rows[0].count}`);
        
        if (parseInt(currentMonthIncome.rows[0].count) > 0) {
          const otherIncome = await client.query(
            `SELECT date, description, category, amount
             FROM transactions
             WHERE type = 'income'
             AND computable = true
             AND TO_CHAR(date, 'YYYY-MM') = $1
             ORDER BY date DESC`,
            [currentMonthStr]
          );
          
          console.log('\n📋 Other income transactions this month:');
          otherIncome.rows.forEach((row, idx) => {
            console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
            console.log(`      Category: ${row.category} | Amount: €${row.amount}`);
          });
        }
      } else {
        console.log(`✅ Nómina found for ${currentMonthStr}`);
        const total = hasCurrentMonth.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        console.log(`   Total: €${total.toFixed(2)}`);
      }
    } else {
      console.log('❌ No Nómina transactions found at all!');
      console.log('💡 You may need to upload your bank statements.');
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('check-missing-nomina')) {
  checkMissingNomina()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default checkMissingNomina;





