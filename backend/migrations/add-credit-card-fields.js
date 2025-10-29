import pool from '../config/database.js';

async function addCreditCardFields() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding credit card fields to bank_accounts...');
    
    await client.query(`
      DO $$ 
      BEGIN
        -- Add credit_limit column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='bank_accounts' AND column_name='credit_limit'
        ) THEN
          ALTER TABLE bank_accounts ADD COLUMN credit_limit DECIMAL(12, 2);
        END IF;
        
        -- Add statement_day column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='bank_accounts' AND column_name='statement_day'
        ) THEN
          ALTER TABLE bank_accounts ADD COLUMN statement_day INTEGER;
        END IF;
        
        -- Add due_day column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='bank_accounts' AND column_name='due_day'
        ) THEN
          ALTER TABLE bank_accounts ADD COLUMN due_day INTEGER;
        END IF;
      END $$;
    `);
    
    console.log('✅ Credit card fields added successfully!');
    console.log('   - credit_limit (for tracking credit limits)');
    console.log('   - statement_day (day of month statement closes)');
    console.log('   - due_day (day of month payment is due)');
  } catch (error) {
    console.error('❌ Error adding credit card fields:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
addCreditCardFields()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });


