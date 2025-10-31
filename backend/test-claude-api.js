#!/usr/bin/env node
/**
 * Test Claude API Connection
 * 
 * Usage: node backend/test-claude-api.js YOUR_CLAUDE_API_KEY
 */

async function testClaudeAPI(apiKey) {
  console.log('🧪 Testing Claude API Connection...\n');

  try {
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
            content: 'Say "Hello, I am working!" in Spanish.'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Claude API Error:', response.status);
      console.error('Error details:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('✅ Claude API is working!');
    console.log('\n📨 Response from Claude:');
    console.log(data.content[0].text);
    console.log('\n💡 Model used:', data.model);
    console.log('🔢 Tokens used:', data.usage);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Get API key from command line or environment
const apiKey = process.argv[2] || process.env.CLAUDE_API_KEY;

if (!apiKey) {
  console.error('❌ Error: No API key provided');
  console.log('\nUsage:');
  console.log('  node backend/test-claude-api.js YOUR_CLAUDE_API_KEY');
  console.log('  OR');
  console.log('  CLAUDE_API_KEY=your_key node backend/test-claude-api.js');
  process.exit(1);
}

// Hide most of the key in output
const maskedKey = `${apiKey.substring(0, 7)}...${apiKey.slice(-4)}`;
console.log(`🔑 Using API Key: ${maskedKey}\n`);

testClaudeAPI(apiKey)
  .then(success => {
    process.exit(success ? 0 : 1);
  });

