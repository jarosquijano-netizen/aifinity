import pool from '../config/database.js';

const runMigration = async () => {
  const client = await pool.connect();
  try {
    console.log('🚀 Adding Salt Edge integration columns...');

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS saltedge_customer_id VARCHAR(100);
    `);
    console.log('✅ users.saltedge_customer_id added');

    await client.query(`
      ALTER TABLE bank_accounts
        ADD COLUMN IF NOT EXISTS saltedge_connection_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS saltedge_account_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS saltedge_provider_code VARCHAR(100),
        ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
    `);
    console.log('✅ bank_accounts Salt Edge columns added');

    await client.query(`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS saltedge_transaction_id VARCHAR(100) UNIQUE,
        ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL;
    `);
    console.log('✅ transactions Salt Edge columns added');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_saltedge_id
        ON transactions(saltedge_transaction_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_accounts_saltedge_connection
        ON bank_accounts(saltedge_connection_id);
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
