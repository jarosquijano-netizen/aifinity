import pool from '../config/database.js';

/**
 * Verify account balances match the bank statement screenshot
 * Expected balances from screenshot (Dec 3, 2025):
 * 
 * Current Accounts (Cuentas a la vista):
 * - CUENTA SABADELL JAXO: 388,82 €
 * - AHORRO SABADELL JAXO: 58,96 €
 * - CUENTA SABADELL OLIVIA: 2.024,30 €
 * - CUENTA SABADELL ABRIL: 5.880,64 €
 * - CUENTA SABADELL JOE: 3.222,15 €
 * Total: 11.574,87 €
 * 
 * Credit Cards (Tarjetas de crédito):
 * - Joe Visa Credit card: 863,54 € (deferred amount)
 * - VISA CLASSIC BSAB: 1.250,00 € (deferred amount)
 * Total: 2.113,54 €
 */

async function verifyAccountBalances() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying account balances against bank statement...\n');
    console.log('📅 Expected balances as of December 3, 2025:\n');
    
    // Expected balances from screenshot
    const expectedBalances = {
      'CUENTA SABADELL JAXO': 388.82,
      'AHORRO SABADELL JAXO': 58.96,
      'CUENTA SABADELL OLIVIA': 2024.30,
      'CUENTA SABADELL ABRIL': 5880.64,
      'CUENTA SABADELL JOE': 3222.15
    };
    
    const expectedTotal = 11574.87;
    
    // Get all accounts
    const accounts = await client.query(
      `SELECT 
        id, name, account_type, balance, exclude_from_stats, user_id
       FROM bank_accounts
       ORDER BY name`
    );
    
    console.log('📊 Current Account Balances in Database:\n');
    
    let totalBalance = 0;
    const accountMatches = [];
    
    accounts.rows.forEach(account => {
      const balance = parseFloat(account.balance || 0);
      totalBalance += balance;
      
      // Try to match account name
      const accountName = account.name.toUpperCase();
      let matched = false;
      let expectedBalance = null;
      
      for (const [expectedName, expectedValue] of Object.entries(expectedBalances)) {
        if (accountName.includes('JAXO') && expectedName.includes('JAXO')) {
          if (accountName.includes('AHORRO') && expectedName.includes('AHORRO')) {
            matched = true;
            expectedBalance = expectedValue;
            break;
          } else if (!accountName.includes('AHORRO') && !expectedName.includes('AHORRO')) {
            matched = true;
            expectedBalance = expectedValue;
            break;
          }
        } else if (accountName.includes('OLIVIA') && expectedName.includes('OLIVIA')) {
          matched = true;
          expectedBalance = expectedValue;
          break;
        } else if (accountName.includes('ABRIL') && expectedName.includes('ABRIL')) {
          matched = true;
          expectedBalance = expectedValue;
          break;
        } else if (accountName.includes('JOE') && expectedName.includes('JOE') && !accountName.includes('JAXO')) {
          matched = true;
          expectedBalance = expectedValue;
          break;
        }
      }
      
      const difference = matched ? (balance - expectedBalance).toFixed(2) : 'N/A';
      const status = matched && Math.abs(balance - expectedBalance) < 0.01 ? '✅' : 
                     matched ? '⚠️' : '  ';
      
      console.log(`${status} ${account.name}`);
      console.log(`   Balance: €${balance.toFixed(2)}`);
      if (matched) {
        console.log(`   Expected: €${expectedBalance.toFixed(2)}`);
        console.log(`   Difference: €${difference}`);
      }
      console.log(`   Type: ${account.account_type || 'N/A'} | Excluded: ${account.exclude_from_stats || false}`);
      console.log('');
      
      accountMatches.push({
        name: account.name,
        balance,
        expectedBalance: matched ? expectedBalance : null,
        matched,
        difference: matched ? parseFloat(difference) : null
      });
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total balance in database: €${totalBalance.toFixed(2)}`);
    console.log(`   Expected total: €${expectedTotal.toFixed(2)}`);
    console.log(`   Difference: €${(totalBalance - expectedTotal).toFixed(2)}\n`);
    
    // Check for missing accounts
    console.log('🔍 Checking for missing accounts:');
    const accountNames = accounts.rows.map(a => a.name.toUpperCase());
    let missingAccounts = [];
    
    for (const expectedName of Object.keys(expectedBalances)) {
      let found = false;
      for (const dbName of accountNames) {
        if (expectedName.includes('JAXO')) {
          if (expectedName.includes('AHORRO') && dbName.includes('AHORRO') && dbName.includes('JAXO')) {
            found = true;
            break;
          } else if (!expectedName.includes('AHORRO') && dbName.includes('JAXO') && !dbName.includes('AHORRO')) {
            found = true;
            break;
          }
        } else if (expectedName.includes('OLIVIA') && dbName.includes('OLIVIA')) {
          found = true;
          break;
        } else if (expectedName.includes('ABRIL') && dbName.includes('ABRIL')) {
          found = true;
          break;
        } else if (expectedName.includes('JOE') && dbName.includes('JOE') && !dbName.includes('JAXO')) {
          found = true;
          break;
        }
      }
      if (!found) {
        missingAccounts.push(expectedName);
        console.log(`   ❌ Missing: ${expectedName} (Expected: €${expectedBalances[expectedName].toFixed(2)})`);
      }
    }
    
    if (missingAccounts.length === 0) {
      console.log('   ✅ All expected accounts found\n');
    }
    
    // Check balance accuracy
    console.log('📊 Balance Accuracy:');
    let allMatch = true;
    accountMatches.forEach(acc => {
      if (acc.matched) {
        const diff = Math.abs(acc.difference);
        if (diff < 0.01) {
          console.log(`   ✅ ${acc.name}: Exact match`);
        } else {
          console.log(`   ⚠️  ${acc.name}: Off by €${diff.toFixed(2)}`);
          allMatch = false;
        }
      }
    });
    
    if (allMatch && missingAccounts.length === 0) {
      console.log('\n✅ All account balances match the bank statement!');
    } else {
      console.log('\n⚠️  Some balances don\'t match. Possible reasons:');
      console.log('   1. Transactions not yet uploaded');
      console.log('   2. Balance calculation needs update');
      console.log('   3. Account names don\'t match exactly');
      console.log('   4. Some transactions are pending');
    }
    
    // Calculate balance from transactions
    console.log('\n💰 Calculating balance from transactions:');
    const transactionBalances = await client.query(
      `SELECT 
        ba.id,
        ba.name,
        ba.balance as stored_balance,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as calculated_balance
       FROM bank_accounts ba
       LEFT JOIN transactions t ON ba.id = t.account_id
       GROUP BY ba.id, ba.name, ba.balance
       ORDER BY ba.name`
    );
    
    transactionBalances.rows.forEach(row => {
      const stored = parseFloat(row.stored_balance || 0);
      const calculated = parseFloat(row.calculated_balance || 0);
      const diff = Math.abs(stored - calculated);
      const status = diff < 0.01 ? '✅' : '⚠️';
      console.log(`   ${status} ${row.name}:`);
      console.log(`      Stored: €${stored.toFixed(2)} | Calculated: €${calculated.toFixed(2)} | Diff: €${diff.toFixed(2)}`);
    });
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('verify-account-balances')) {
  verifyAccountBalances()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default verifyAccountBalances;





