import pool from '../config/database.js';

/**
 * Fix credit card balance - it was incorrectly set to positive
 * Credit cards should have negative balances (debt)
 */

async function fixCreditCardBalance() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing credit card balance...\n');
    
    // Get the credit card
    const creditCard = await client.query(
      `SELECT id, name, balance, account_type
       FROM bank_accounts
       WHERE name LIKE '%JOE_0012%' AND account_type = 'credit'`
    );
    
    if (creditCard.rows.length === 0) {
      console.log('❌ Credit card not found');
      return;
    }
    
    const card = creditCard.rows[0];
    console.log(`📊 Current credit card: ${card.name}`);
    console.log(`   Current balance: €${parseFloat(card.balance).toFixed(2)}`);
    console.log(`   Type: ${card.account_type}\n`);
    
    // Credit cards should have negative balances (debt)
    // From the screenshot, we don't have the exact credit card balance
    // But we know it should be negative. Let's check transactions to calculate it
    
    const transactions = await client.query(
      `SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as calculated_balance
       FROM transactions
       WHERE account_id = $1 AND computable = true`,
      [card.id]
    );
    
    const calculatedBalance = parseFloat(transactions.rows[0]?.calculated_balance || 0);
    console.log(`💰 Calculated balance from transactions: €${calculatedBalance.toFixed(2)}\n`);
    
    // From the screenshot, credit cards show "Importe Aplazado" (deferred amount)
    // Joe Visa Credit card: €863.54
    // This is debt, so balance should be negative: -€863.54
    
    const correctBalance = -863.54;
    
    console.log(`🔄 Updating balance to: €${correctBalance.toFixed(2)} (from bank statement)\n`);
    
    await client.query(
      `UPDATE bank_accounts 
       SET balance = $1, balance_updated_at = NOW(), balance_source = 'manual_fix'
       WHERE id = $2`,
      [correctBalance, card.id]
    );
    
    console.log(`✅ Updated credit card balance: €${parseFloat(card.balance).toFixed(2)} → €${correctBalance.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('fix-credit-card-balance')) {
  fixCreditCardBalance()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default fixCreditCardBalance;






