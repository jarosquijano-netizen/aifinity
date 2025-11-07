import pool from '../config/database.js';

const runMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding bank_accounts table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        account_type VARCHAR(100) DEFAULT 'General',
        color VARCHAR(7) DEFAULT '#6d4c41',
        balance DECIMAL(12, 2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'EUR',
        exclude_from_stats BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ bank_accounts table created');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
    `);
    console.log('✅ Indexes created');
    
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration().catch(console.error);










