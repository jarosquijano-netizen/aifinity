import pool from './config/database.js';

async function testFullUpload() {
  const client = await pool.connect();
  
  try {
    console.log('\n🧪 Testing FULL upload flow...\n');
    
    const userId = 1; // Your user ID
    const transactions = [
      {
        bank: 'Test Bank',
        date: '2024-10-30',
        category: 'Food & Dining',
        description: 'Test Transaction',
        amount: 50.00,
        type: 'expense',
        computable: true
      }
    ];
    const account_id = null;
    const lastBalance = null;
    
    console.log('✅ Step 1: BEGIN transaction');
    await client.query('BEGIN');
    
    console.log('✅ Step 2: Get common income patterns');
    const commonIncomes = await client.query(
      `SELECT DISTINCT description, COUNT(*) as count
       FROM transactions
       WHERE type = 'income'
       AND (user_id IS NULL OR user_id = $1)
       GROUP BY description
       HAVING COUNT(*) >= 2
       ORDER BY count DESC
       LIMIT 10`,
      [userId]
    );
    console.log(`   Found ${commonIncomes.rows.length} common income patterns`);
    
    const recurringIncomeDescriptions = commonIncomes.rows.map(r => r.description.toLowerCase());
    
    for (const transaction of transactions) {
      const { bank, date, category, description, amount, type, computable } = transaction;
      
      console.log(`\n✅ Step 3: Check for duplicates`);
      const duplicateCheck = await client.query(
        `SELECT id FROM transactions 
         WHERE date = $1 
         AND description = $2 
         AND amount = $3 
         AND COALESCE(account_id, 0) = COALESCE($4, 0)
         AND (user_id IS NULL OR user_id = $5)
         LIMIT 1`,
        [date, description, amount, account_id, userId]
      );
      console.log(`   Duplicates found: ${duplicateCheck.rows.length}`);
      
      if (duplicateCheck.rows.length > 0) {
        console.log('   Skipping duplicate');
        continue;
      }
      
      console.log(`✅ Step 4: INSERT transaction`);
      const result = await client.query(
        `INSERT INTO transactions (user_id, bank, date, category, description, amount, type, account_id, computable, applicable_month)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [userId, bank, date, category, description, amount, type, account_id, computable, null]
      );
      console.log(`   Inserted transaction ID: ${result.rows[0].id}`);
    }
    
    console.log('\n✅ Step 5: COMMIT transaction');
    await client.query('COMMIT');
    
    console.log('\n✅ FULL UPLOAD FLOW WORKS!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR at:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    console.error('Hint:', error.hint);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testFullUpload();

