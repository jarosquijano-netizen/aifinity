#!/usr/bin/env node
/**
 * Check AI Configuration in Database
 * 
 * This script checks if the user has configured any AI API keys
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkAIConfig() {
  console.log('🔍 Checking AI Configuration...\n');

  try {
    // Check if ai_config table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ai_config'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ ai_config table does not exist!');
      console.log('💡 Run migrations first: node backend/migrations/run-all-missing.js\n');
      return;
    }

    console.log('✅ ai_config table exists\n');

    // Get all AI configurations
    const result = await pool.query(`
      SELECT 
        ac.id,
        u.email,
        ac.provider,
        ac.api_key_preview,
        ac.is_active,
        ac.created_at,
        ac.updated_at
      FROM ai_config ac
      JOIN users u ON ac.user_id = u.id
      ORDER BY u.email, ac.is_active DESC, ac.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('⚠️  No AI configurations found');
      console.log('\n📝 To configure AI:');
      console.log('   1. Go to https://aifinity.app');
      console.log('   2. Login');
      console.log('   3. Go to Settings tab');
      console.log('   4. Configure your Claude API key\n');
      return;
    }

    console.log(`✅ Found ${result.rows.length} AI configuration(s):\n`);

    const userConfigs = {};
    result.rows.forEach(config => {
      if (!userConfigs[config.email]) {
        userConfigs[config.email] = [];
      }
      userConfigs[config.email].push(config);
    });

    Object.keys(userConfigs).forEach(email => {
      console.log(`👤 User: ${email}`);
      userConfigs[email].forEach(config => {
        const activeIcon = config.is_active ? '🟢' : '⚪';
        console.log(`   ${activeIcon} ${config.provider.toUpperCase()}`);
        console.log(`      API Key: ${config.api_key_preview}`);
        console.log(`      Status: ${config.is_active ? 'ACTIVE' : 'Inactive'}`);
        console.log(`      Configured: ${new Date(config.created_at).toLocaleString()}`);
        console.log('');
      });
    });

    // Check chat history
    const historyResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM ai_chat_history
    `);

    const chatCount = parseInt(historyResult.rows[0].count);
    console.log(`💬 Total chat messages: ${chatCount}`);

    if (chatCount > 0) {
      const recentChats = await pool.query(`
        SELECT 
          u.email,
          ach.provider,
          ach.user_message,
          LEFT(ach.ai_response, 50) as response_preview,
          ach.created_at
        FROM ai_chat_history ach
        JOIN users u ON ach.user_id = u.id
        ORDER BY ach.created_at DESC
        LIMIT 5
      `);

      console.log('\n📜 Recent chats:');
      recentChats.rows.forEach(chat => {
        console.log(`   ${chat.email} (${chat.provider})`);
        console.log(`   Q: ${chat.user_message}`);
        console.log(`   A: ${chat.response_preview}...`);
        console.log(`   ${new Date(chat.created_at).toLocaleString()}\n`);
      });
    }

    console.log('\n✅ AI Configuration check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkAIConfig();

