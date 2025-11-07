import pool from '../config/database.js';

async function addAccountToTransactions() {
  const client = await pool.connect();
  
  try {
    console.log('Adding account_id column to transactions table...');
    
    await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL
    `);
    
    console.log('✅ Successfully added account_id column to transactions');
  } catch (error) {
    console.error('Error adding column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addAccountToTransactions();










