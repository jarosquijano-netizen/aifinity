import pool from './backend/config/database.js';

async function fixCreditCard() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 FORCE FIXING Credit Card...\n');
    
    // Update the credit card directly
    const result = await client.query(`
      UPDATE bank_accounts 
      SET balance = -1251.36,
          credit_limit = 2000
      WHERE id = 10
      RETURNING *
    `);
    
    if (result.rows.length > 0) {
      const card = result.rows[0];
      console.log('✅ FIXED! Credit card updated:');
      console.log('   Name:', card.name);
      console.log('   Balance:', card.balance);
      console.log('   Credit Limit:', card.credit_limit);
      
      const debt = Math.abs(parseFloat(card.balance));
      const util = (debt / card.credit_limit * 100).toFixed(1);
      const available = card.credit_limit - debt;
      
      console.log('\n💳 Dashboard should now show:');
      console.log('   Debt: €' + debt.toFixed(2));
      console.log('   Utilization: ' + util + '%');
      console.log('   Available: €' + available.toFixed(2));
      console.log('   Limit: €' + card.credit_limit.toFixed(0));
      
      console.log('\n✅ NOW REFRESH YOUR DASHBOARD (F5)!');
    } else {
      console.log('❌ Account 10 not found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixCreditCard();


