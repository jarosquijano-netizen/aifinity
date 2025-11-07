import pool from '../config/database.js';

async function addAITables() {
  try {
    console.log('Adding AI configuration and chat history tables...');

    // Create ai_config table
    await pool.query(`
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

    // Create ai_chat_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_config_user_id ON ai_config(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_config_active ON ai_config(user_id, is_active);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_chat_user_id ON ai_chat_history(user_id);
    `);

    console.log('✅ AI tables created successfully');
  } catch (error) {
    console.error('❌ Error creating AI tables:', error);
    throw error;
  }
}

export default addAITables;






