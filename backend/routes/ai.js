import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get AI configuration for the user
router.get('/config', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, provider, api_key_preview, is_active, created_at, updated_at 
       FROM ai_config 
       WHERE user_id = $1 
       ORDER BY is_active DESC, created_at DESC`,
      [req.user.id || req.user.userId]
    );

    res.json({ configs: result.rows });
  } catch (error) {
    console.error('Get AI config error:', error);
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

// Save or update AI configuration
router.post('/config', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }

    // Validate provider
    const validProviders = ['openai', 'claude', 'gemini'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid provider. Must be one of: openai, claude, gemini' });
    }

    // Create a preview of the API key (show only last 4 characters)
    const apiKeyPreview = `****${apiKey.slice(-4)}`;

    // Deactivate all other configs for this user
    await pool.query(
      'UPDATE ai_config SET is_active = false WHERE user_id = $1',
      [userId]
    );

    // Check if config already exists for this provider
    const existingConfig = await pool.query(
      'SELECT id FROM ai_config WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );

    let result;
    if (existingConfig.rows.length > 0) {
      // Update existing config
      result = await pool.query(
        `UPDATE ai_config 
         SET api_key = $1, api_key_preview = $2, is_active = true, updated_at = NOW() 
         WHERE user_id = $3 AND provider = $4 
         RETURNING id, provider, api_key_preview, is_active`,
        [apiKey, apiKeyPreview, userId, provider]
      );
    } else {
      // Insert new config
      result = await pool.query(
        `INSERT INTO ai_config (user_id, provider, api_key, api_key_preview, is_active) 
         VALUES ($1, $2, $3, $4, true) 
         RETURNING id, provider, api_key_preview, is_active`,
        [userId, provider, apiKey, apiKeyPreview]
      );
    }

    res.json({
      message: 'AI configuration saved successfully',
      config: result.rows[0]
    });
  } catch (error) {
    console.error('Save AI config error:', error);
    res.status(500).json({ error: 'Failed to save AI configuration' });
  }
});

// Delete AI configuration
router.delete('/config/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    const result = await pool.query(
      'DELETE FROM ai_config WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Delete AI config error:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// Set active AI provider
router.post('/config/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;

    // Deactivate all configs for this user
    await pool.query(
      'UPDATE ai_config SET is_active = false WHERE user_id = $1',
      [userId]
    );

    // Activate the selected config
    const result = await pool.query(
      `UPDATE ai_config 
       SET is_active = true, updated_at = NOW() 
       WHERE id = $1 AND user_id = $2 
       RETURNING id, provider, api_key_preview, is_active`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({
      message: 'Configuration activated successfully',
      config: result.rows[0]
    });
  } catch (error) {
    console.error('Activate AI config error:', error);
    res.status(500).json({ error: 'Failed to activate configuration' });
  }
});

// Chat with AI - Financial Q&A
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get active AI configuration
    const configResult = await pool.query(
      'SELECT provider, api_key FROM ai_config WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'No active AI configuration found. Please configure an AI provider in Settings.' 
      });
    }

    const { provider, api_key } = configResult.rows[0];

    // Fetch user's financial data for context
    const financialData = await getUserFinancialContext(userId);

    // Call appropriate AI API based on provider
    let aiResponse;
    try {
      if (provider === 'openai') {
        aiResponse = await callOpenAI(api_key, message, financialData);
      } else if (provider === 'claude') {
        aiResponse = await callClaude(api_key, message, financialData);
      } else if (provider === 'gemini') {
        aiResponse = await callGemini(api_key, message, financialData);
      } else {
        return res.status(400).json({ error: 'Unsupported AI provider' });
      }

      // Store chat history
      await pool.query(
        `INSERT INTO ai_chat_history (user_id, provider, user_message, ai_response) 
         VALUES ($1, $2, $3, $4)`,
        [userId, provider, message, aiResponse]
      );

      res.json({
        response: aiResponse,
        provider: provider
      });
    } catch (aiError) {
      console.error('AI API Error:', aiError);
      return res.status(500).json({ 
        error: 'Failed to get AI response. Please check your API key is valid.' 
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// Get chat history
router.get('/chat/history', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(
      `SELECT id, provider, user_message, ai_response, created_at 
       FROM ai_chat_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ history: result.rows.reverse() }); // Reverse to show oldest first
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Helper function to get user's financial context
async function getUserFinancialContext(userId) {
  try {
    // Get summary data
    const summaryResult = await pool.query(
      `SELECT 
         SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
         SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
         COUNT(*) as transaction_count
       FROM transactions 
       WHERE user_id = $1 AND date >= NOW() - INTERVAL '30 days'`,
      [userId]
    );

    // Get budget data
    const budgetResult = await pool.query(
      `SELECT category, amount, spent 
       FROM budgets 
       WHERE user_id = $1`,
      [userId]
    );

    // Get top categories
    const categoriesResult = await pool.query(
      `SELECT category, SUM(amount) as total 
       FROM transactions 
       WHERE user_id = $1 AND type = 'expense' AND date >= NOW() - INTERVAL '30 days'
       GROUP BY category 
       ORDER BY total DESC 
       LIMIT 5`,
      [userId]
    );

    const summary = summaryResult.rows[0] || {};
    const budgets = budgetResult.rows || [];
    const topCategories = categoriesResult.rows || [];

    return {
      summary: {
        totalIncome: parseFloat(summary.total_income || 0),
        totalExpenses: parseFloat(summary.total_expenses || 0),
        netBalance: parseFloat(summary.total_income || 0) - parseFloat(summary.total_expenses || 0),
        transactionCount: parseInt(summary.transaction_count || 0)
      },
      budgets: budgets.map(b => ({
        category: b.category,
        budget: parseFloat(b.amount),
        spent: parseFloat(b.spent),
        remaining: parseFloat(b.amount) - parseFloat(b.spent)
      })),
      topCategories: topCategories.map(c => ({
        category: c.category,
        total: parseFloat(c.total)
      }))
    };
  } catch (error) {
    console.error('Error fetching financial context:', error);
    return null;
  }
}

// AI Provider API Calls
async function callOpenAI(apiKey, userMessage, financialData) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful financial advisor assistant. You have access to the user's financial data:
${JSON.stringify(financialData, null, 2)}

Provide helpful, accurate financial advice based on this data. Be concise and actionable. Always use Euro (€) for currency.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(apiKey, userMessage, financialData) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a helpful financial advisor assistant. You have access to the user's financial data:
${JSON.stringify(financialData, null, 2)}

User question: ${userMessage}

Provide helpful, accurate financial advice based on this data. Be concise and actionable. Always use Euro (€) for currency.`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callGemini(apiKey, userMessage, financialData) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a helpful financial advisor assistant. You have access to the user's financial data:
${JSON.stringify(financialData, null, 2)}

User question: ${userMessage}

Provide helpful, accurate financial advice based on this data. Be concise and actionable. Always use Euro (€) for currency.`
        }]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export default router;

