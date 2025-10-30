import pool from './config/database.js';

async function verify() {
  try {
    // Columns we're trying to INSERT
    const insertColumns = [
      'user_id',
      'bank', 
      'date',
      'category',
      'description',
      'amount',
      'type',
      'account_id',
      'computable',
      'applicable_month'
    ];
    
    // Get actual columns
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position
    `);
    
    const actualColumns = result.rows.map(r => r.column_name);
    
    console.log('\n📋 Verification:\n');
    console.log('Columns we are trying to INSERT:');
    insertColumns.forEach(col => {
      const exists = actualColumns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });
    
    console.log('\nActual table columns:');
    actualColumns.forEach(col => {
      const used = insertColumns.includes(col);
      console.log(`  ${used ? '✅' : '⚠️ '} ${col}`);
    });
    
    console.log('\n');
    
    // Try a test insert
    console.log('🧪 Testing INSERT statement...\n');
    const testResult = await pool.query(
      `INSERT INTO transactions (user_id, bank, date, category, description, amount, type, account_id, computable, applicable_month)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [1, 'Test', '2024-10-30', 'Test', 'Test transaction', 10.00, 'expense', null, true, null]
    );
    
    console.log('✅ INSERT works! Transaction ID:', testResult.rows[0].id);
    
    // Clean up test transaction
    await pool.query('DELETE FROM transactions WHERE id = $1', [testResult.rows[0].id]);
    console.log('✅ Test transaction cleaned up');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    console.error('Hint:', error.hint);
  } finally {
    await pool.end();
  }
}

verify();

