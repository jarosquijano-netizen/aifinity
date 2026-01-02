import pool from '../config/database.js';

/**
 * Diagnose why calculated balances don't match stored balances
 * This helps identify missing transactions or calculation issues
 */

async function diagnoseBalanceMismatch() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Diagnosing balance mismatches...\n');
    
    // Get all accounts
    const accounts = await client.query(
      `SELECT id, name, account_type, balance
       FROM bank_accounts
       WHERE account_type != 'credit'
       ORDER BY name`
    );
    
    console.log('📊 Balance Analysis:\n');
    
    for (const account of accounts.rows) {
      const storedBalance = parseFloat(account.balance || 0);
      
      // Calculate balance from transactions
      const transactions = await client.query(
        `SELECT 
          COUNT(*) as count,
          SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as calculated_balance,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
         FROM transactions
         WHERE account_id = $1 AND computable = true`,
        [account.id]
      );
      
      const calc = transactions.rows[0];
      const calculatedBalance = parseFloat(calc.calculated_balance || 0);
      const difference = storedBalance - calculatedBalance;
      
      console.log(`📋 ${account.name}:`);
      console.log(`   Stored balance: €${storedBalance.toFixed(2)}`);
      console.log(`   Calculated balance: €${calculatedBalance.toFixed(2)}`);
      console.log(`   Difference: €${difference.toFixed(2)}`);
      console.log(`   Transactions: ${calc.count} (Income: €${parseFloat(calc.total_income || 0).toFixed(2)}, Expenses: €${parseFloat(calc.total_expenses || 0).toFixed(2)})`);
      
      if (Math.abs(difference) > 1) {
        console.log(`   ⚠️  Large difference detected!`);
        
        // Check for missing transactions
        const recentTransactions = await client.query(
          `SELECT date, description, type, amount
           FROM transactions
           WHERE account_id = $1
           ORDER BY date DESC
           LIMIT 5`,
          [account.id]
        );
        
        if (recentTransactions.rows.length > 0) {
          console.log(`   Recent transactions:`);
          recentTransactions.rows.forEach(t => {
            console.log(`      [${t.date.toISOString().slice(0, 10)}] ${t.type}: €${parseFloat(t.amount).toFixed(2)} - ${t.description?.substring(0, 40)}...`);
          });
        }
      }
      console.log('');
    }
    
    console.log('💡 Possible reasons for mismatches:');
    console.log('   1. Missing transactions (not uploaded yet)');
    console.log('   2. Initial balance not set correctly');
    console.log('   3. Some transactions marked as computable = false');
    console.log('   4. Balance was manually set and doesn\'t match transactions');
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('diagnose-balance-mismatch')) {
  diagnoseBalanceMismatch()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default diagnoseBalanceMismatch;






