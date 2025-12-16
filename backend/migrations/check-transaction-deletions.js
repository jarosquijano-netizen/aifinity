import pool from '../config/database.js';

/**
 * Check if transactions were deleted or modified incorrectly
 * Compare transaction counts and dates
 */

async function checkTransactionDeletions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for deleted or modified transactions...\n');
    
    // Get total transaction count
    const totalCount = await client.query(
      `SELECT COUNT(*) as total FROM transactions`
    );
    console.log(`📊 Current total transactions: ${totalCount.rows[0].total}\n`);
    
    // Check transactions by month
    const byMonth = await client.query(
      `SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        COUNT(*) as count,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count,
        SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as income_total,
        SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as expense_total
       FROM transactions
       GROUP BY TO_CHAR(date, 'YYYY-MM')
       ORDER BY month DESC`
    );
    
    console.log('📊 Transactions by month:');
    byMonth.rows.forEach(row => {
      console.log(`   ${row.month}: ${row.count} total (${row.income_count} income, ${row.expense_count} expenses)`);
      if (parseFloat(row.income_total) > 0) {
        console.log(`      Income: €${parseFloat(row.income_total).toFixed(2)}`);
      }
      if (parseFloat(row.expense_total) > 0) {
        console.log(`      Expenses: €${parseFloat(row.expense_total).toFixed(2)}`);
      }
    });
    console.log('');
    
    // Check for transactions with suspicious dates (might have been changed)
    const suspiciousDates = await client.query(
      `SELECT 
        id, date, description, category, type, amount, created_at
       FROM transactions
       WHERE date > CURRENT_DATE + INTERVAL '1 month'
       OR date < '2020-01-01'
       ORDER BY date DESC
       LIMIT 20`
    );
    
    if (suspiciousDates.rows.length > 0) {
      console.log('⚠️  Transactions with suspicious dates:');
      suspiciousDates.rows.forEach(row => {
        console.log(`   ID: ${row.id} | Date: ${row.date} | Description: ${row.description?.substring(0, 50)}...`);
      });
      console.log('');
    }
    
    // Check for transactions that might have been incorrectly categorized as transfers
    const possibleNominaAsTransfer = await client.query(
      `SELECT 
        id, date, description, category, type, amount
       FROM transactions
       WHERE (
         LOWER(description) LIKE '%nomina%' OR
         LOWER(description) LIKE '%nómina%' OR
         LOWER(description) LIKE '%salario%' OR
         LOWER(description) LIKE '%sueldo%' OR
         LOWER(description) LIKE '%salary%' OR
         LOWER(description) LIKE '%payroll%'
       )
       AND category NOT LIKE '%Ingresos%'
       ORDER BY date DESC`
    );
    
    if (possibleNominaAsTransfer.rows.length > 0) {
      console.log('⚠️  Possible Nómina transactions with wrong category:');
      possibleNominaAsTransfer.rows.forEach(row => {
        console.log(`   ID: ${row.id} | Date: ${row.date} | Category: ${row.category}`);
        console.log(`   Description: ${row.description?.substring(0, 60)}...`);
        console.log(`   Amount: €${row.amount}`);
      });
      console.log('');
    }
    
    // Check for transactions that were set to computable = false incorrectly
    const nominaNonComputable = await client.query(
      `SELECT 
        id, date, description, category, type, amount, computable
       FROM transactions
       WHERE type = 'income'
       AND (
         LOWER(description) LIKE '%nomina%' OR
         LOWER(description) LIKE '%nómina%' OR
         LOWER(description) LIKE '%salario%' OR
         LOWER(description) LIKE '%sueldo%'
       )
       AND computable = false
       ORDER BY date DESC`
    );
    
    if (nominaNonComputable.rows.length > 0) {
      console.log('⚠️  Nómina transactions marked as non-computable (should be computable = true):');
      nominaNonComputable.rows.forEach(row => {
        console.log(`   ID: ${row.id} | Date: ${row.date} | Amount: €${row.amount}`);
        console.log(`   Description: ${row.description?.substring(0, 60)}...`);
      });
      console.log('');
    }
    
    // Check December specifically
    const decemberTransactions = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
        MIN(date) as earliest,
        MAX(date) as latest
       FROM transactions
       WHERE TO_CHAR(date, 'YYYY-MM') = '2025-12'`
    );
    
    console.log(`📅 December 2025 transactions: ${decemberTransactions.rows[0].total} total, ${decemberTransactions.rows[0].income_count} income`);
    console.log(`   Date range: ${decemberTransactions.rows[0].earliest} to ${decemberTransactions.rows[0].latest}\n`);
    
    // List all December income transactions
    const decemberIncome = await client.query(
      `SELECT 
        id, date, description, category, type, amount, computable
       FROM transactions
       WHERE TO_CHAR(date, 'YYYY-MM') = '2025-12'
       AND type = 'income'
       ORDER BY date DESC`
    );
    
    console.log(`💰 December 2025 income transactions (${decemberIncome.rows.length}):`);
    decemberIncome.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
      console.log(`      Category: ${row.category} | Amount: €${row.amount} | Computable: ${row.computable}`);
    });
    
    // Check if there are transactions dated November 30 that should be December
    const nov30Transactions = await client.query(
      `SELECT 
        id, date, description, category, type, amount
       FROM transactions
       WHERE date = '2025-11-30'
       AND type = 'income'
       ORDER BY id DESC`
    );
    
    if (nov30Transactions.rows.length > 0) {
      console.log(`\n⚠️  Transactions dated November 30, 2025 (might be December?):`);
      nov30Transactions.rows.forEach(row => {
        console.log(`   ID: ${row.id} | Description: ${row.description?.substring(0, 60)}...`);
        console.log(`   Category: ${row.category} | Amount: €${row.amount}`);
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('check-transaction-deletions')) {
  checkTransactionDeletions()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default checkTransactionDeletions;

