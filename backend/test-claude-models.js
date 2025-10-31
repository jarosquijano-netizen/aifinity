#!/usr/bin/env node
/**
 * Test Different Claude Models
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Common Claude models
const MODELS_TO_TEST = [
  'claude-3-5-sonnet-20240620',  // Claude 3.5 Sonnet (June 2024)
  'claude-3-5-sonnet-latest',    // Latest 3.5 Sonnet
  'claude-3-opus-20240229',      // Claude 3 Opus
  'claude-3-sonnet-20240229',    // Claude 3 Sonnet
  'claude-3-haiku-20240307',     // Claude 3 Haiku
];

async function testClaudeModels() {
  console.log('🧪 Testing Claude Models...\n');

  try {
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

    for (const model of MODELS_TO_TEST) {
      console.log(`\n🔄 Testing: ${model}`);
      
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 50,
            messages: [
              {
                role: 'user',
                content: 'Di "Hola" en español'
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ SUCCESS: ${model}`);
          console.log(`   Response: "${data.content[0].text}"`);
          console.log(`   Tokens: ${JSON.stringify(data.usage)}`);
          console.log(`\n   🎯 USE THIS MODEL: ${model}\n`);
          return model; // Return the first working model
        } else {
          const error = await response.json();
          console.log(`   ❌ FAILED: ${error.error?.type || 'unknown error'}`);
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
      }
    }

    console.log('\n❌ No working models found. Check your API key.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testClaudeModels();

