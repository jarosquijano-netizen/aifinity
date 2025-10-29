import pool from '../config/database.js';

async function addAccountTypes() {
  try {
    console.log('Adding account types and updating schema...');

    // Add account_type enum if not exists
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE account_type_enum AS ENUM ('checking', 'savings', 'investment', 'credit');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Check if account_type column exists, if not add it
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='bank_accounts' AND column_name='account_type'
        ) THEN
          ALTER TABLE bank_accounts ADD COLUMN account_type VARCHAR(50) DEFAULT 'checking';
        END IF;
      END $$;
    `);

    // Update existing accounts to have default type
    await pool.query(`
      UPDATE bank_accounts 
      SET account_type = 'checking' 
      WHERE account_type IS NULL;
    `);

    console.log('✅ Account types added successfully');
  } catch (error) {
    console.error('❌ Error adding account types:', error);
    throw error;
  }
}

// Run migration
addAccountTypes()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

export default addAccountTypes;



