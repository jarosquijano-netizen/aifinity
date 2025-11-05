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
    const { message, timePeriod } = req.body; // timePeriod: 'day', 'week', 'month', 'year', or null for all
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

    // Fetch user's comprehensive financial data for context
    const financialData = await getUserFinancialContext(userId, timePeriod);

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

// Helper function to get user's comprehensive financial context
async function getUserFinancialContext(userId, timePeriod = null) {
  try {
    // Build date filter based on time period
    let dateFilter = '';
    let dateParams = [];
    
    if (timePeriod === 'day') {
      dateFilter = `AND DATE_TRUNC('day', date) = DATE_TRUNC('day', CURRENT_DATE)`;
    } else if (timePeriod === 'week') {
      dateFilter = `AND date >= DATE_TRUNC('week', CURRENT_DATE)`;
    } else if (timePeriod === 'month') {
      dateFilter = `AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (timePeriod === 'year') {
      dateFilter = `AND DATE_TRUNC('year', date) = DATE_TRUNC('year', CURRENT_DATE)`;
    }
    // If timePeriod is null or 'all', no date filter is applied (get all data)

    // Get comprehensive summary data (all time periods)
    const summaryAllResult = await pool.query(
      `SELECT 
         SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as total_income,
         SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as total_expenses,
         COUNT(*) as transaction_count,
         MIN(date) as oldest_transaction_date,
         MAX(date) as newest_transaction_date
       FROM transactions 
       WHERE (user_id IS NULL OR user_id = $1)`,
      [userId]
    );

    // Get filtered summary data (based on time period)
    const summaryFilteredResult = await pool.query(
      `SELECT 
         SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as total_income,
         SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as total_expenses,
         COUNT(*) as transaction_count
       FROM transactions 
       WHERE (user_id IS NULL OR user_id = $1) ${dateFilter}`,
      dateParams.length > 0 ? [userId, ...dateParams] : [userId]
    );

    // Get current month data
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthDate = currentMonth + '-01';
    const currentMonthIncomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_income
       FROM transactions
       WHERE type = 'income'
       AND computable = true
       AND (user_id IS NULL OR user_id = $1)
       AND (
         (applicable_month IS NOT NULL AND applicable_month = $2)
         OR
         (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $2)
       )
       AND amount > 0`,
      [userId, currentMonth]
    );
    const currentMonthExpensesResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_expenses
       FROM transactions
       WHERE type = 'expense'
       AND computable = true
       AND (user_id IS NULL OR user_id = $1)
       AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
       AND amount > 0`,
      [userId, currentMonthDate]
    );

    // Get all budget data
    const budgetResult = await pool.query(
      `SELECT category, amount, spent 
       FROM budgets 
       WHERE user_id = $1`,
      [userId]
    );

    // Get all transactions by category (filtered by time period)
    const categoriesResult = await pool.query(
      `SELECT category, type, SUM(amount) as total, COUNT(*) as count
       FROM transactions 
       WHERE (user_id IS NULL OR user_id = $1) 
       AND computable = true
       ${dateFilter}
       GROUP BY category, type 
       ORDER BY total DESC`,
      dateParams.length > 0 ? [userId, ...dateParams] : [userId]
    );

    // Get all accounts
    const accountsResult = await pool.query(
      `SELECT id, name, account_type, balance, credit_limit, exclude_from_stats
       FROM accounts 
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY account_type, name`,
      [userId]
    );

    // Get recent transactions (last 20)
    const recentTransactionsResult = await pool.query(
      `SELECT id, date, description, category, type, amount, bank, computable
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1)
       ${dateFilter}
       ORDER BY date DESC, id DESC
       LIMIT 20`,
      dateParams.length > 0 ? [userId, ...dateParams] : [userId]
    );

    // Get monthly trends (last 6 months)
    const trendsResult = await pool.query(
      `SELECT 
         TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') as month,
         SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as income,
         SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as expenses
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1)
       AND date >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM')
       ORDER BY month DESC`,
      [userId]
    );

    // Get settings (expected income)
    const settingsResult = await pool.query(
      `SELECT expected_monthly_income
       FROM settings
       WHERE user_id = $1 OR user_id IS NULL
       LIMIT 1`,
      [userId]
    );

    const summaryAll = summaryAllResult.rows[0] || {};
    const summaryFiltered = summaryFilteredResult.rows[0] || {};
    const currentMonthIncome = parseFloat(currentMonthIncomeResult.rows[0]?.actual_income || 0);
    const currentMonthExpenses = parseFloat(currentMonthExpensesResult.rows[0]?.actual_expenses || 0);
    const budgets = budgetResult.rows || [];
    const categories = categoriesResult.rows || [];
    const accounts = accountsResult.rows || [];
    const recentTransactions = recentTransactionsResult.rows || [];
    const trends = trendsResult.rows || [];
    const expectedIncome = parseFloat(settingsResult.rows[0]?.expected_monthly_income || 0);

    return {
      timePeriod: timePeriod || 'all',
      summary: {
        // All-time totals
        allTime: {
          totalIncome: parseFloat(summaryAll.total_income || 0),
          totalExpenses: parseFloat(summaryAll.total_expenses || 0),
          netBalance: parseFloat(summaryAll.total_income || 0) - parseFloat(summaryAll.total_expenses || 0),
          transactionCount: parseInt(summaryAll.transaction_count || 0),
          oldestTransactionDate: summaryAll.oldest_transaction_date,
          newestTransactionDate: summaryAll.newest_transaction_date
        },
        // Filtered totals (based on time period)
        filtered: {
          totalIncome: parseFloat(summaryFiltered.total_income || 0),
          totalExpenses: parseFloat(summaryFiltered.total_expenses || 0),
          netBalance: parseFloat(summaryFiltered.total_income || 0) - parseFloat(summaryFiltered.total_expenses || 0),
          transactionCount: parseInt(summaryFiltered.transaction_count || 0)
        },
        // Current month totals
        currentMonth: {
          income: currentMonthIncome,
          expenses: currentMonthExpenses,
          netBalance: currentMonthIncome - currentMonthExpenses,
          expectedIncome: expectedIncome
        }
      },
      budgets: budgets.map(b => ({
        category: b.category,
        budget: parseFloat(b.amount),
        spent: parseFloat(b.spent),
        remaining: parseFloat(b.amount) - parseFloat(b.spent),
        usagePercent: parseFloat(b.amount) > 0 ? (parseFloat(b.spent) / parseFloat(b.amount)) * 100 : 0
      })),
      categories: categories.map(c => ({
        category: c.category,
        type: c.type,
        total: parseFloat(c.total),
        count: parseInt(c.count)
      })),
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.account_type,
        balance: parseFloat(a.balance || 0),
        creditLimit: parseFloat(a.credit_limit || 0),
        excludeFromStats: a.exclude_from_stats
      })),
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        type: t.type,
        amount: parseFloat(t.amount),
        bank: t.bank,
        computable: t.computable
      })),
      trends: trends.map(t => ({
        month: t.month,
        income: parseFloat(t.income || 0),
        expenses: parseFloat(t.expenses || 0),
        netBalance: parseFloat(t.income || 0) - parseFloat(t.expenses || 0)
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
          content: `You are an expert financial advisor assistant with access to comprehensive financial data. Analyze the following data carefully:

${JSON.stringify(financialData, null, 2)}

Key capabilities:
- Analyze data by time period (day, week, month, year, or all-time)
- Compare current period vs historical trends
- Identify spending patterns and anomalies
- Provide budget recommendations
- Analyze account balances and credit utilization
- Suggest actionable improvements

The data includes:
- Summary: All-time totals, filtered totals (by time period), and current month data
- Budgets: Budget vs actual spending by category
- Categories: Spending breakdown by category and type
- Accounts: All bank accounts, credit cards, and their balances
- Recent Transactions: Latest 20 transactions
- Trends: Monthly income/expense trends for last 6 months

Always:
- Use Euro (€) for currency
- Be specific with numbers and percentages
- Reference the time period being analyzed
- Provide actionable recommendations
- Compare current performance to historical trends when relevant`
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
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an expert financial advisor assistant with access to comprehensive financial data. Analyze the following data carefully:

${JSON.stringify(financialData, null, 2)}

Key capabilities:
- Analyze data by time period (day, week, month, year, or all-time)
- Compare current period vs historical trends
- Identify spending patterns and anomalies
- Provide budget recommendations
- Analyze account balances and credit utilization
- Suggest actionable improvements

The data includes:
- Summary: All-time totals, filtered totals (by time period), and current month data
- Budgets: Budget vs actual spending by category
- Categories: Spending breakdown by category and type
- Accounts: All bank accounts, credit cards, and their balances
- Recent Transactions: Latest 20 transactions
- Trends: Monthly income/expense trends for last 6 months

User question: ${userMessage}

Always:
- Use Euro (€) for currency
- Be specific with numbers and percentages
- Reference the time period being analyzed
- Provide actionable recommendations
- Compare current performance to historical trends when relevant`
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
          text: `You are an expert financial advisor assistant with access to comprehensive financial data. Analyze the following data carefully:

${JSON.stringify(financialData, null, 2)}

Key capabilities:
- Analyze data by time period (day, week, month, year, or all-time)
- Compare current period vs historical trends
- Identify spending patterns and anomalies
- Provide budget recommendations
- Analyze account balances and credit utilization
- Suggest actionable improvements

The data includes:
- Summary: All-time totals, filtered totals (by time period), and current month data
- Budgets: Budget vs actual spending by category
- Categories: Spending breakdown by category and type
- Accounts: All bank accounts, credit cards, and their balances
- Recent Transactions: Latest 20 transactions
- Trends: Monthly income/expense trends for last 6 months

User question: ${userMessage}

Always:
- Use Euro (€) for currency
- Be specific with numbers and percentages
- Reference the time period being analyzed
- Provide actionable recommendations
- Compare current performance to historical trends when relevant`
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

