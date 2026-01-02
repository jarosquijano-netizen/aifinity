import pool from '../config/database.js';

/**
 * Ensure all account balances match the bank statement
 * This prevents recalculation from overwriting correct balances
 */

async function ensureCorrectBalances() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Ensuring correct account balances...\n');
    
    // Expected balances from bank statement (Dec 3, 2025)
    const expectedBalances = {
      'CUENTA SABADELL JAXO': 388.82,
      'AHORRO SABADELL JAXO': 58.96,
      'CUENTA SABADELL OLIVIA': 2024.30,
      'CUENTA SABADELL ABRIL': 5880.64,
      'CUENTA SABADELL JOE': 3222.15
    };
    
    // Get all accounts
    const accounts = await client.query(
      `SELECT id, name, account_type, balance, balance_source
       FROM bank_accounts
       ORDER BY name`
    );
    
    console.log('📊 Current balances:\n');
    
    const updates = [];
    
    for (const account of accounts.rows) {
      const accountName = account.name.toUpperCase();
      let expectedBalance = null;
      let matchedKey = null;
      
      // Match account
      for (const [key, value] of Object.entries(expectedBalances)) {
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
      
      const currentBalance = parseFloat(account.balance || 0);
      
      if (expectedBalance !== null) {
        const diff = currentBalance - expectedBalance;
        const status = Math.abs(diff) < 0.01 ? '✅' : '❌';
        console.log(`${status} ${account.name}: €${currentBalance.toFixed(2)} (expected: €${expectedBalance.toFixed(2)})`);
        
        if (Math.abs(diff) > 0.01) {
          updates.push({
            id: account.id,
            name: account.name,
            current: currentBalance,
            expected: expectedBalance
          });
        }
      } else {
        console.log(`   ${account.name}: €${currentBalance.toFixed(2)} (no match)`);
      }
    }
    
    if (updates.length > 0) {
      console.log(`\n🔄 Updating ${updates.length} account(s)...\n`);
      
      await client.query('BEGIN');
      
      for (const update of updates) {
        await client.query(
          `UPDATE bank_accounts 
           SET balance = $1, balance_updated_at = NOW(), balance_source = 'manual_fix'
           WHERE id = $2`,
          [update.expected, update.id]
        );
        console.log(`✅ ${update.name}: €${update.current.toFixed(2)} → €${update.expected.toFixed(2)}`);
      }
      
      await client.query('COMMIT');
      console.log('\n✅ All balances updated!');
    } else {
      console.log('\n✅ All balances are correct!');
    }
    
    console.log('\n💡 Important:');
    console.log('   - Balances are set to match bank statement (Dec 3, 2025)');
    console.log('   - Do NOT use "Recalculate Balance" - it will overwrite these correct values');
    console.log('   - If you need to update balances, use the bank statement balance directly');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('ensure-correct-balances')) {
  ensureCorrectBalances()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default ensureCorrectBalances;






