import pool from './config/database.js';

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Transactions Table Columns:\n');
    result.rows.forEach((c, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${c.column_name.padEnd(25)} ${c.data_type.padEnd(20)} ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('\n');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();

