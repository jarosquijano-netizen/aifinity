import pool from '../config/database.js';

/**
 * Check all account balances in detail
 */

async function checkAllAccountBalances() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking all account balances...\n');
    
    // Get all accounts
    const accounts = await client.query(
      `SELECT 
        id, name, account_type, balance, balance_updated_at, balance_source, exclude_from_stats
       FROM bank_accounts
       ORDER BY name`
    );
    
    console.log('📊 All Account Balances:\n');
    
    accounts.rows.forEach(account => {
      const balance = parseFloat(account.balance || 0);
      const updatedAt = account.balance_updated_at ? new Date(account.balance_updated_at).toISOString().slice(0, 16).replace('T', ' ') : 'Never';
      const source = account.balance_source || 'unknown';
      const excluded = account.exclude_from_stats ? ' (Excluded)' : '';
      
      console.log(`📋 ${account.name}`);
      console.log(`   Type: ${account.account_type}`);
      console.log(`   Balance: €${balance.toFixed(2)}${excluded}`);
      console.log(`   Last Updated: ${updatedAt}`);
      console.log(`   Source: ${source}`);
      
      // Calculate from transactions
      const transactions = client.query(
        `SELECT 
          COUNT(*) as count,
          SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as calculated
         FROM transactions
         WHERE account_id = $1 AND computable = true`,
        [account.id]
      ).then(result => {
        const calc = result.rows[0];
        const calculated = parseFloat(calc.calculated || 0);
        const diff = balance - calculated;
        console.log(`   Transactions: ${calc.count} | Calculated: €${calculated.toFixed(2)} | Diff: €${diff.toFixed(2)}`);
      }).catch(err => {
        console.log(`   Error calculating: ${err.message}`);
      });
      
      console.log('');
    });
    
    // Expected balances from bank statement
    const expected = {
      'CUENTA SABADELL JAXO': 388.82,
      'AHORRO SABADELL JAXO': 58.96,
      'CUENTA SABADELL OLIVIA': 2024.30,
      'CUENTA SABADELL ABRIL': 5880.64,
      'CUENTA SABADELL JOE': 3222.15
    };
    
    console.log('\n📊 Expected vs Actual:\n');
    
    for (const account of accounts.rows) {
      const accountName = account.name.toUpperCase();
      let expectedBalance = null;
      let matchedKey = null;
      
      // Match account
      for (const [key, value] of Object.entries(expected)) {
        if (key.includes('JAXO')) {
          if (key.includes('AHORRO')) {
            if (accountName.includes('AHORRO') && accountName.includes('JAXO')) {
              expectedBalance = value;
              matchedKey = key;
              break;
            }
          } else {
            if (accountName.includes('JAXO') && !accountName.includes('AHORRO')) {
              expectedBalance = value;
              matchedKey = key;
              break;
            }
          }
        } else if (key.includes('OLIVIA') && accountName.includes('OLIVIA')) {
          expectedBalance = value;
          matchedKey = key;
          break;
        } else if (key.includes('ABRIL') && accountName.includes('ABRIL')) {
          expectedBalance = value;
          matchedKey = key;
          break;
        } else if (key.includes('JOE') && !key.includes('JAXO')) {
          if (accountName.includes('JOE') && !accountName.includes('JAXO') && !accountName.includes('ING')) {
            expectedBalance = value;
            matchedKey = key;
            break;
          }
        }
      }
      
      if (expectedBalance !== null) {
        const actual = parseFloat(account.balance || 0);
        const diff = actual - expectedBalance;
        const status = Math.abs(diff) < 0.01 ? '✅' : '❌';
        console.log(`${status} ${account.name}:`);
        console.log(`   Expected: €${expectedBalance.toFixed(2)}`);
        console.log(`   Actual: €${actual.toFixed(2)}`);
        console.log(`   Difference: €${diff.toFixed(2)}`);
        console.log('');
      }
    }
    
    console.log('✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('check-all-account-balances')) {
  checkAllAccountBalances()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default checkAllAccountBalances;





