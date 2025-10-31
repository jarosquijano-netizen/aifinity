#!/usr/bin/env node
/**
 * Test User's Claude API Key from Database
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testUserClaudeKey() {
  console.log('🔍 Testing user Claude API key...\n');

  try {
    // Get the active Claude API key
    const result = await pool.query(`
      SELECT api_key 
      FROM ai_config 
      WHERE provider = 'claude' AND is_active = true
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No active Claude API key found');
      return;
    }

    const apiKey = result.rows[0].api_key;
    const maskedKey = `${apiKey.substring(0, 7)}...${apiKey.slice(-4)}`;
    console.log(`🔑 Testing API Key: ${maskedKey}\n`);

    // Test with Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Responde en español: ¿Estás funcionando correctamente?'
          }
        ]
      })
    });

    console.log(`📡 Response Status: ${response.status}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Claude API Error:');
      console.error(errorText);
      console.log('\n💡 Possible solutions:');
      console.log('   1. Verify your API key at: https://console.anthropic.com/');
      console.log('   2. Generate a new API key if needed');
      console.log('   3. Update in Settings > AI Configuration\n');
      return;
    }

    const data = await response.json();
    console.log('✅ Claude API is working!\n');
    console.log('📨 Claude Response:');
    console.log(`   "${data.content[0].text}"\n`);
    console.log(`💡 Model: ${data.model}`);
    console.log(`🔢 Tokens: ${JSON.stringify(data.usage)}\n`);
    console.log('✅ Your API key is valid and working!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testUserClaudeKey();

