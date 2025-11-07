import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Diagnose income calculation issues
 */
async function diagnoseIncome() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Diagnosing income calculation issues...\n');
    
    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    console.log(`📅 Current month: ${currentMonth}\n`);
    
    // Get user ID 1 (main user)
    const userId = 1;
    
    // Check all income transactions for user_id = 1
    console.log('💰 All income transactions for user_id = 1:');
    const allIncome = await client.query(
      `SELECT 
         id, 
         date, 
         applicable_month,
         description,
         amount,
         computable,
         account_id,
         TO_CHAR(date, 'YYYY-MM') as date_month
       FROM transactions
       WHERE user_id = $1
       AND type = 'income'
       ORDER BY date DESC
       LIMIT 50`,
      [userId]
    );
    
    console.log(`Found ${allIncome.rows.length} income transactions:\n`);
    allIncome.rows.forEach((t, i) => {
      console.log(`${i + 1}. ID: ${t.id}, Date: ${t.date}, Applicable Month: ${t.applicable_month || 'NULL'}, Amount: €${t.amount}, Computable: ${t.computable}, Account: ${t.account_id}`);
      console.log(`   Description: ${t.description?.substring(0, 60)}...`);
    });
    console.log('');
    
    // Calculate total income (all time)
    const totalIncome = await client.query(
      `SELECT SUM(amount) as total
       FROM transactions
       WHERE user_id = $1
       AND type = 'income'
       AND computable = true`,
      [userId]
    );
    console.log(`📊 Total income (all time, computable=true): €${parseFloat(totalIncome.rows[0]?.total || 0).toFixed(2)}\n`);
    
    // Calculate income for current month using summary logic
    const currentMonthIncome = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_income
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = $1
       AND (t.account_id IS NULL OR ba.id IS NOT NULL)
       AND t.type = 'income'
       AND t.computable = true
       AND (
         (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
         OR
         (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
       )
       AND t.amount > 0`,
      [userId, currentMonth]
    );
    console.log(`📊 Current month income (${currentMonth}): €${parseFloat(currentMonthIncome.rows[0]?.actual_income || 0).toFixed(2)}\n`);
    
    // Check income by applicable_month
    console.log('📊 Income grouped by applicable_month:');
    const incomeByMonth = await client.query(
      `SELECT 
         COALESCE(applicable_month, TO_CHAR(date, 'YYYY-MM')) as month,
         SUM(amount) as total,
         COUNT(*) as count
       FROM transactions
       WHERE user_id = $1
       AND type = 'income'
       AND computable = true
       GROUP BY COALESCE(applicable_month, TO_CHAR(date, 'YYYY-MM'))
       ORDER BY month DESC`,
      [userId]
    );
    
    incomeByMonth.rows.forEach(row => {
      console.log(`   ${row.month}: €${parseFloat(row.total || 0).toFixed(2)} (${row.count} transactions)`);
    });
    console.log('');
    
    // Check for transactions with future applicable_month
    console.log('🔮 Transactions with applicable_month in the future:');
    const futureIncome = await client.query(
      `SELECT 
         id,
         date,
         applicable_month,
         description,
         amount
       FROM transactions
       WHERE user_id = $1
       AND type = 'income'
       AND applicable_month IS NOT NULL
       AND applicable_month > $2
       ORDER BY applicable_month DESC`,
      [userId, currentMonth]
    );
    
    if (futureIncome.rows.length > 0) {
      console.log(`Found ${futureIncome.rows.length} transactions with future applicable_month:\n`);
      futureIncome.rows.forEach(t => {
        console.log(`   ID: ${t.id}, Date: ${t.date}, Applicable Month: ${t.applicable_month}, Amount: €${t.amount}`);
        console.log(`   Description: ${t.description?.substring(0, 60)}...`);
      });
    } else {
      console.log('   None found');
    }
    console.log('');
    
    // Check for orphaned transactions (account_id pointing to non-existent account)
    console.log('🔗 Checking for orphaned transactions:');
    const orphaned = await client.query(
      `SELECT t.id, t.date, t.description, t.amount, t.account_id
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = $1
       AND t.type = 'income'
       AND t.account_id IS NOT NULL
       AND ba.id IS NULL
       LIMIT 10`,
      [userId]
    );
    
    if (orphaned.rows.length > 0) {
      console.log(`⚠️ Found ${orphaned.rows.length} orphaned income transactions:\n`);
      orphaned.rows.forEach(t => {
        console.log(`   ID: ${t.id}, Account ID: ${t.account_id}, Amount: €${t.amount}`);
      });
    } else {
      console.log('   ✅ No orphaned transactions found');
    }
    console.log('');
    
    // Check accounts
    console.log('🏦 User accounts:');
    const accounts = await client.query(
      `SELECT id, name, account_type, user_id
       FROM bank_accounts
       WHERE user_id = $1
       ORDER BY name`,
      [userId]
    );
    
    console.log(`Found ${accounts.rows.length} accounts:\n`);
    accounts.rows.forEach(a => {
      console.log(`   ID: ${a.id}, Name: ${a.name}, Type: ${a.account_type}, User ID: ${a.user_id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseIncome().catch(console.error);

