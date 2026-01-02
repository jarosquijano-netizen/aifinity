import pool from '../config/database.js';

/**
 * Find all December 2025 income transactions
 */

async function findDecemberIncome() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding December 2025 income transactions...\n');
    
    // Get all December 2025 transactions
    const decemberAll = await client.query(
      `SELECT 
        id, date, description, category, type, amount, computable
       FROM transactions
       WHERE DATE_TRUNC('month', date) = '2025-12-01'::date
       ORDER BY date DESC, id DESC`
    );
    
    console.log(`📊 All December 2025 transactions: ${decemberAll.rows.length}\n`);
    
    if (decemberAll.rows.length > 0) {
      console.log('📋 December 2025 transactions:');
      decemberAll.rows.forEach((row, idx) => {
        const typeIcon = row.type === 'income' ? '💰' : '💸';
        const computableIcon = row.computable === false ? '🚫' : '✅';
        console.log(`${typeIcon} ${computableIcon} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
        console.log(`      Category: ${row.category} | Amount: €${row.amount} | Type: ${row.type}`);
      });
    }
    
    // Get December income specifically
    const decemberIncome = await client.query(
      `SELECT 
        id, date, description, category, type, amount, computable
       FROM transactions
       WHERE DATE_TRUNC('month', date) = '2025-12-01'::date
       AND type = 'income'
       ORDER BY date DESC, id DESC`
    );
    
    console.log(`\n💰 December 2025 INCOME transactions: ${decemberIncome.rows.length}\n`);
    
    if (decemberIncome.rows.length > 0) {
      decemberIncome.rows.forEach((row, idx) => {
        const computableIcon = row.computable === false ? '🚫 (excluded)' : '✅ (included)';
        console.log(`${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 70)}...`);
        console.log(`   Category: ${row.category} | Amount: €${row.amount} | ${computableIcon}`);
      });
      
      const totalIncome = decemberIncome.rows
        .filter(r => r.computable !== false)
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);
      
      console.log(`\n✅ Total computable income for December: €${totalIncome.toFixed(2)}`);
    } else {
      console.log('❌ No income transactions found for December 2025');
      console.log('\n💡 Possible reasons:');
      console.log('   1. December Nómina hasn\'t been uploaded yet');
      console.log('   2. Transaction date is incorrect (check if it\'s dated November instead)');
      console.log('   3. Transaction was categorized incorrectly');
      console.log('\n📋 Your last Nómina was:');
      
      // Get last Nómina
      const lastNomina = await client.query(
        `SELECT date, description, category, amount
         FROM transactions
         WHERE type = 'income'
         AND (
           LOWER(description) LIKE '%nomina%' OR
           LOWER(description) LIKE '%nómina%' OR
           category LIKE '%Ingresos%'
         )
         ORDER BY date DESC
         LIMIT 1`
      );
      
      if (lastNomina.rows.length > 0) {
        const nomina = lastNomina.rows[0];
        console.log(`   Date: ${nomina.date.toISOString().slice(0, 10)}`);
        console.log(`   Description: ${nomina.description?.substring(0, 70)}...`);
        console.log(`   Amount: €${nomina.amount}`);
        console.log(`   Category: ${nomina.category}`);
      }
    }
    
    // Check if there are any transactions dated in the future (might be December)
    const futureTransactions = await client.query(
      `SELECT 
        COUNT(*) as count,
        MIN(date) as earliest,
        MAX(date) as latest
       FROM transactions
       WHERE date > CURRENT_DATE`
    );
    
    if (parseInt(futureTransactions.rows[0].count) > 0) {
      console.log(`\n⚠️  Found ${futureTransactions.rows[0].count} transactions dated in the future:`);
      console.log(`   Date range: ${futureTransactions.rows[0].earliest} to ${futureTransactions.rows[0].latest}`);
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('find-december-income')) {
  findDecemberIncome()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default findDecemberIncome;






