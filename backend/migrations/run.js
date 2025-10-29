import pool from '../config/database.js';

const runMigrations = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running database migrations...');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');
    
    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bank VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        category VARCHAR(100),
        description TEXT,
        amount DECIMAL(12, 2) NOT NULL,
        type VARCHAR(20) CHECK (type IN ('income', 'expense')),
        computable BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Transactions table created');
    
    // Add computable column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='transactions' AND column_name='computable'
        ) THEN
          ALTER TABLE transactions ADD COLUMN computable BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `);
    console.log('✅ Computable field ensured');
    
    // Create summaries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS summaries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        month VARCHAR(7) NOT NULL,
        total_income DECIMAL(12, 2) DEFAULT 0,
        total_expenses DECIMAL(12, 2) DEFAULT 0,
        net_balance DECIMAL(12, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, month)
      );
    `);
    console.log('✅ Summaries table created');
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
    `);
    console.log('✅ Indexes created');
    
    // Add balance tracking fields to bank_accounts
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='bank_accounts') THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='bank_accounts' AND column_name='balance_updated_at'
          ) THEN
            ALTER TABLE bank_accounts ADD COLUMN balance_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='bank_accounts' AND column_name='balance_source'
          ) THEN
            ALTER TABLE bank_accounts ADD COLUMN balance_source VARCHAR(20) DEFAULT 'manual';
          END IF;
        END IF;
      END $$;
    `);
    console.log('✅ Balance tracking fields ensured');
    
    // Create user_settings table for expected income and other settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY DEFAULT 0,
        expected_monthly_income DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User settings table created');
    
    // Insert default settings for anonymous user
    await client.query(`
      INSERT INTO user_settings (user_id, expected_monthly_income)
      VALUES (0, 0)
      ON CONFLICT (user_id) DO NOTHING
    `);
    console.log('✅ Default user settings created');
    
    // Add applicable_month to transactions table for income shifting
    const applicableMonthColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'applicable_month'
    `);
    
    if (applicableMonthColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE transactions 
        ADD COLUMN applicable_month VARCHAR(7)
      `);
      console.log('✅ Added applicable_month column to transactions');
    } else {
      console.log('✅ applicable_month column already exists');
    }
    
    console.log('✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

runMigrations().catch(console.error);



