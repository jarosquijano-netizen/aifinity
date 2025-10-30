import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres:KEyEBzoOCmqdvHBNReryrKfXnotrpIRq@maglev.proxy.rlwy.net:31201/railway';

async function runAllMissingMigrations() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('\n✅ Connected to production database\n');

    // 1. Create AI tables
    console.log('📦 Creating AI tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_config (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        api_key TEXT NOT NULL,
        api_key_preview VARCHAR(20),
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, provider)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_config_user_id ON ai_config(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_config_active ON ai_config(user_id, is_active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_chat_user_id ON ai_chat_history(user_id)`);
    
    console.log('✅ AI tables created\n');

    // 2. Create budget table (for user-specific budgets)
    console.log('📦 Creating budget table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(12, 2) DEFAULT 0,
        color VARCHAR(7) DEFAULT '#6d4c41',
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, category)
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_budget_user_id ON budget(user_id)`);
    
    console.log('✅ Budget table created\n');

    // 3. Create budgets view (for AI queries)
    console.log('📦 Creating budgets view...');
    await client.query(`
      CREATE OR REPLACE VIEW budgets AS
      SELECT 
        b.user_id,
        b.category,
        b.amount,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as spent
      FROM budget b
      LEFT JOIN transactions t ON t.user_id = b.user_id 
        AND t.category = b.category 
        AND t.computable = true
      GROUP BY b.user_id, b.category, b.amount
    `);
    
    console.log('✅ Budgets view created\n');

    // 4. Add account_id column to transactions if missing
    console.log('📦 Checking transactions table...');
    const checkAccountId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'account_id'
    `);

    if (checkAccountId.rows.length === 0) {
      console.log('   Adding account_id column...');
      await client.query(`
        ALTER TABLE transactions 
        ADD COLUMN account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)`);
      console.log('   ✅ account_id column added');
    } else {
      console.log('   ✅ account_id column already exists');
    }

    // 5. Add is_computable column if missing (for excluding transfers)
    const checkComputable = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'is_computable'
    `);

    if (checkComputable.rows.length === 0) {
      console.log('   Adding is_computable column...');
      await client.query(`
        ALTER TABLE transactions 
        ADD COLUMN is_computable BOOLEAN DEFAULT true
      `);
      console.log('   ✅ is_computable column added');
    } else {
      console.log('   ✅ is_computable column already exists');
    }
    
    console.log('\n✅ All migrations completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runAllMissingMigrations()
  .then(() => {
    console.log('🎉 Database is now ready!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

