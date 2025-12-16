import pool from '../config/database.js';

/**
 * Fix account balances to match bank statement (Dec 3, 2025)
 * 
 * Expected balances:
 * - CUENTA SABADELL JAXO: €388.82
 * - AHORRO SABADELL JAXO: €58.96
 * - CUENTA SABADELL OLIVIA: €2,024.30
 * - CUENTA SABADELL ABRIL: €5,880.64
 * - CUENTA SABADELL JOE: €3,222.15
 */

async function fixAccountBalances() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing account balances to match bank statement...\n');
    
    // Expected balances from bank statement
    const expectedBalances = {
      'CUENTA SABADELL JAXO': 388.82,
      'AHORRO SABADELL JAXO': 58.96,
      'CUENTA SABADELL OLIVIA': 2024.30,
      'CUENTA SABADELL ABRIL': 5880.64,
      'CUENTA SABADELL JOE': 3222.15
    };
    
    // Get all accounts (exclude credit cards - they have different balance logic)
    const accounts = await client.query(
      `SELECT id, name, account_type, balance, user_id
       FROM bank_accounts
       WHERE account_type != 'credit'
       ORDER BY name`
    );
    
    console.log('📊 Current accounts:\n');
    accounts.rows.forEach(acc => {
      console.log(`   ${acc.name}: €${parseFloat(acc.balance || 0).toFixed(2)}`);
    });
    console.log('');
    
    // Match accounts and update balances
    const updates = [];
    
    for (const account of accounts.rows) {
      const accountName = account.name.toUpperCase();
      let matchedBalance = null;
      let matchedKey = null;
      
      // Try to match account name
      for (const [expectedName, expectedBalance] of Object.entries(expectedBalances)) {
        if (expectedName.includes('JAXO')) {
          if (expectedName.includes('AHORRO')) {
            if (accountName.includes('AHORRO') && accountName.includes('JAXO')) {
              matchedBalance = expectedBalance;
              matchedKey = expectedName;
              break;
            }
          } else {
            if (accountName.includes('JAXO') && !accountName.includes('AHORRO')) {
              matchedBalance = expectedBalance;
              matchedKey = expectedName;
              break;
            }
          }
        } else if (expectedName.includes('OLIVIA')) {
          if (accountName.includes('OLIVIA')) {
            matchedBalance = expectedBalance;
            matchedKey = expectedName;
            break;
          }
        } else if (expectedName.includes('ABRIL')) {
          if (accountName.includes('ABRIL')) {
            matchedBalance = expectedBalance;
            matchedKey = expectedName;
            break;
          }
        } else if (expectedName.includes('JOE') && !expectedName.includes('JAXO')) {
          if (accountName.includes('JOE') && !accountName.includes('JAXO') && !accountName.includes('ING')) {
            matchedBalance = expectedBalance;
            matchedKey = expectedName;
            break;
          }
        }
      }
      
      if (matchedBalance !== null) {
        const currentBalance = parseFloat(account.balance || 0);
        const difference = matchedBalance - currentBalance;
        
        if (Math.abs(difference) > 0.01) {
          updates.push({
            id: account.id,
            name: account.name,
            currentBalance,
            newBalance: matchedBalance,
            difference,
            matchedKey
          });
        }
      }
    }
    
    if (updates.length === 0) {
      console.log('✅ All balances already match!\n');
      return;
    }
    
    console.log(`📝 Found ${updates.length} accounts to update:\n`);
    updates.forEach(update => {
      console.log(`   ${update.name}:`);
      console.log(`      Current: €${update.currentBalance.toFixed(2)}`);
      console.log(`      New: €${update.newBalance.toFixed(2)}`);
      console.log(`      Difference: €${update.difference.toFixed(2)}`);
      console.log(`      Matched to: ${update.matchedKey}`);
      console.log('');
    });
    
    // Ask for confirmation (in production, you'd want user confirmation)
    console.log('🔄 Updating balances...\n');
    
    await client.query('BEGIN');
    
    for (const update of updates) {
      await client.query(
        `UPDATE bank_accounts 
         SET balance = $1, balance_updated_at = NOW(), balance_source = 'manual_fix'
         WHERE id = $2`,
        [update.newBalance, update.id]
      );
      console.log(`✅ Updated ${update.name}: €${update.currentBalance.toFixed(2)} → €${update.newBalance.toFixed(2)}`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ All balances updated successfully!');
    
    // Verify
    console.log('\n🔍 Verifying updated balances:\n');
    const verifyAccounts = await client.query(
      `SELECT id, name, balance
       FROM bank_accounts
       WHERE id = ANY($1::int[])
       ORDER BY name`,
      [updates.map(u => u.id)]
    );
    
    verifyAccounts.rows.forEach(acc => {
      const update = updates.find(u => u.id === acc.id);
      const newBalance = parseFloat(acc.balance);
      const expected = update.newBalance;
      const status = Math.abs(newBalance - expected) < 0.01 ? '✅' : '⚠️';
      console.log(`${status} ${acc.name}: €${newBalance.toFixed(2)} (expected: €${expected.toFixed(2)})`);
    });
    
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('fix-account-balances')) {
  fixAccountBalances()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default fixAccountBalances;

