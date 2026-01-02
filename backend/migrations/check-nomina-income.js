import pool from '../config/database.js';

/**
 * Check for Nómina (salary) income transactions
 * Find missing income transactions for current month
 */

async function checkNominaIncome() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for Nómina income transactions...\n');
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;
    
    console.log(`📅 Current month: ${currentMonth} (${currentMonthNum}/${currentYear})\n`);
    
    // Get all income transactions
    const allIncome = await client.query(
      `SELECT 
        COUNT(*) as total,
        SUM(amount) as total_amount,
        MIN(date) as oldest,
        MAX(date) as newest
       FROM transactions
       WHERE type = 'income'
       AND computable = true`
    );
    
    console.log('📊 All Income Transactions (computable = true):');
    console.log(`   Total: ${allIncome.rows[0].total} transactions`);
    console.log(`   Total amount: €${parseFloat(allIncome.rows[0].total_amount || 0).toFixed(2)}`);
    console.log(`   Date range: ${allIncome.rows[0].oldest} to ${allIncome.rows[0].newest}\n`);
    
    // Get income transactions for current month
    const currentMonthIncome = await client.query(
      `SELECT 
        COUNT(*) as total,
        SUM(amount) as total_amount
       FROM transactions
       WHERE type = 'income'
       AND computable = true
       AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`
    );
    
    console.log(`📊 Income Transactions for ${currentMonth}:`);
    console.log(`   Total: ${currentMonthIncome.rows[0].total} transactions`);
    console.log(`   Total amount: €${parseFloat(currentMonthIncome.rows[0].total_amount || 0).toFixed(2)}\n`);
    
    // Get all income transactions with details
    const incomeDetails = await client.query(
      `SELECT 
        id, date, description, category, amount, computable, user_id
       FROM transactions
       WHERE type = 'income'
       ORDER BY date DESC
       LIMIT 50`
    );
    
    console.log(`📋 All Income Transactions (last 50):`);
    incomeDetails.rows.forEach((row, idx) => {
      const isCurrentMonth = row.date.toISOString().slice(0, 7) === currentMonth;
      const marker = isCurrentMonth ? '✅' : '  ';
      console.log(`${marker} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
      console.log(`      Category: ${row.category} | Amount: €${row.amount} | Computable: ${row.computable}`);
    });
    
    // Check specifically for "Nómina" or salary-related transactions
    const nominaTransactions = await client.query(
      `SELECT 
        id, date, description, category, amount, computable, user_id
       FROM transactions
       WHERE type = 'income'
       AND (
         LOWER(description) LIKE '%nomina%' OR
         LOWER(description) LIKE '%nómina%' OR
         LOWER(description) LIKE '%salario%' OR
         LOWER(description) LIKE '%sueldo%' OR
         LOWER(description) LIKE '%salary%' OR
         LOWER(description) LIKE '%payroll%' OR
         category LIKE '%Ingresos%' OR
         category LIKE '%Ingreso%'
       )
       ORDER BY date DESC`
    );
    
    console.log(`\n💰 Nómina/Salary-related Income Transactions:`);
    console.log(`   Found: ${nominaTransactions.rows.length} transactions\n`);
    
    if (nominaTransactions.rows.length > 0) {
      nominaTransactions.rows.forEach((row, idx) => {
        const isCurrentMonth = row.date.toISOString().slice(0, 7) === currentMonth;
        const marker = isCurrentMonth ? '✅ CURRENT MONTH' : '  ';
        console.log(`${marker} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 70)}...`);
        console.log(`      Category: ${row.category} | Amount: €${row.amount} | Computable: ${row.computable}`);
      });
    } else {
      console.log('   ⚠️  No Nómina transactions found!\n');
    }
    
    // Check for current month specifically
    const currentMonthNomina = await client.query(
      `SELECT 
        id, date, description, category, amount, computable, user_id
       FROM transactions
       WHERE type = 'income'
       AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
       AND (
         LOWER(description) LIKE '%nomina%' OR
         LOWER(description) LIKE '%nómina%' OR
         LOWER(description) LIKE '%salario%' OR
         LOWER(description) LIKE '%sueldo%' OR
         LOWER(description) LIKE '%salary%' OR
         LOWER(description) LIKE '%payroll%' OR
         category LIKE '%Ingresos%' OR
         category LIKE '%Ingreso%'
       )
       ORDER BY date DESC`
    );
    
    console.log(`\n📅 Nómina Transactions for ${currentMonth}:`);
    if (currentMonthNomina.rows.length > 0) {
      currentMonthNomina.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 70)}...`);
        console.log(`      Category: ${row.category} | Amount: €${row.amount} | Computable: ${row.computable}`);
      });
      console.log(`\n   ✅ Total: ${currentMonthNomina.rows.length} transaction(s)`);
      console.log(`   ✅ Total amount: €${currentMonthNomina.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2)}`);
    } else {
      console.log(`   ❌ No Nómina transactions found for ${currentMonth}`);
      console.log(`   💡 Check if:`);
      console.log(`      - The transaction was uploaded`);
      console.log(`      - The date is correct (should be in ${currentMonth})`);
      console.log(`      - The category is "Finanzas > Ingresos"`);
      console.log(`      - computable = true`);
    }
    
    // Check income by category
    const incomeByCategory = await client.query(
      `SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total
       FROM transactions
       WHERE type = 'income'
       AND computable = true
       GROUP BY category
       ORDER BY total DESC`
    );
    
    console.log(`\n📊 Income Transactions by Category:`);
    incomeByCategory.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.count} transactions, €${parseFloat(row.total).toFixed(2)}`);
    });
    
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('check-nomina-income')) {
  checkNominaIncome()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default checkNominaIncome;






