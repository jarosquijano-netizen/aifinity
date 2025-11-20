import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';
import { handleAIChatRequest } from '../src/enhanced-ai-service.js';

const router = express.Router();

// All routes use optional auth (to match other routes)
router.use(optionalAuth);

// Get AI configuration for the user
router.get('/config', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    // Get AI configs for the current user
    let result;
    if (userId) {
      // User is logged in - get their configs
      result = await pool.query(
        `SELECT id, provider, api_key_preview, is_active, created_at, updated_at 
         FROM ai_config 
         WHERE user_id = $1
         ORDER BY is_active DESC, created_at DESC`,
        [userId]
      );
    } else {
      // If not logged in, get only shared configs (user_id IS NULL)
      result = await pool.query(
        `SELECT id, provider, api_key_preview, is_active, created_at, updated_at 
         FROM ai_config 
         WHERE user_id IS NULL
         ORDER BY is_active DESC, created_at DESC`
      );
    }

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
    const { message, timePeriod, language = 'en' } = req.body; // language: 'en' or 'es'
    const userId = req.user?.id || req.user?.userId || null;
    const hasAuthHeader = req.headers['authorization'];

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get active AI configuration
    
    let configResult;
    if (userId || hasAuthHeader) {
      if (userId) {
        configResult = await pool.query(
          'SELECT provider, api_key FROM ai_config WHERE (user_id = $1 OR user_id IS NULL) AND is_active = true ORDER BY user_id DESC NULLS LAST LIMIT 1',
          [userId]
        );
      } else {
        // userId is null but has auth header - get ALL active configs
        configResult = await pool.query(
          'SELECT provider, api_key FROM ai_config WHERE is_active = true ORDER BY user_id DESC NULLS LAST LIMIT 1'
        );
      }
    } else {
      configResult = await pool.query(
        'SELECT provider, api_key FROM ai_config WHERE user_id IS NULL AND is_active = true'
      );
    }

    if (configResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'No active AI configuration found. Please configure an AI provider in Settings.' 
      });
    }

    const { provider, api_key } = configResult.rows[0];

    // Use enhanced service for Claude
    if (provider === 'claude') {
      // Attach database connection for enhanced service
      req.db = pool;
      return await handleAIChatRequest(req, res, pool);
    }

    // Fallback to existing implementations for OpenAI and Gemini
    // Fetch user's comprehensive financial data for context
    const financialData = await getUserFinancialContext(userId, timePeriod);
    
    // Validate financial data
    if (!financialData) {
      console.error('Failed to fetch financial data for user:', userId);
      return res.status(500).json({ 
        error: 'Failed to load financial data. Please try again.' 
      });
    }

    // Call appropriate AI API based on provider
    let aiResponse;
    try {
      if (provider === 'openai') {
        aiResponse = await callOpenAI(api_key, message, financialData, language);
      } else if (provider === 'gemini') {
        aiResponse = await callGemini(api_key, message, financialData, language);
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
      const errorMessage = aiError.message || 'Unknown error';
      console.error('Error details:', errorMessage);
      
      // Provide more specific error messages
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return res.status(500).json({ 
          error: 'Invalid API key. Please check your API key in Settings.' 
        });
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        return res.status(500).json({ 
          error: 'API rate limit exceeded. Please try again in a moment.' 
        });
      } else if (errorMessage.includes('529') || errorMessage.includes('overloaded')) {
        return res.status(500).json({ 
          error: 'Claude API is currently overloaded. Please try again in a few moments.' 
        });
      } else if (errorMessage.includes('insufficient_quota')) {
        return res.status(500).json({ 
          error: 'API quota exceeded. Please check your API account credits.' 
        });
      }
      
      return res.status(500).json({ 
        error: `Failed to get AI response: ${errorMessage}. Please check your API key and try again.` 
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
    let accountsResult;
    try {
      accountsResult = await pool.query(
        `SELECT id, name, account_type, balance, credit_limit, exclude_from_stats
         FROM bank_accounts 
         WHERE user_id = $1 OR user_id IS NULL
         ORDER BY account_type, name`,
        [userId]
      );
    } catch (error) {
      // If bank_accounts doesn't exist, try accounts table (fallback)
      if (error.message.includes('does not exist')) {
        console.log('⚠️ bank_accounts table not found, trying accounts table...');
        try {
          accountsResult = await pool.query(
            `SELECT id, name, account_type, balance, credit_limit, exclude_from_stats
             FROM accounts 
             WHERE user_id = $1 OR user_id IS NULL
             ORDER BY account_type, name`,
            [userId]
          );
        } catch (error2) {
          console.log('⚠️ accounts table also not found, returning empty accounts array');
          accountsResult = { rows: [] };
        }
      } else {
        throw error;
      }
    }

    // Get recent transactions (last 10 to reduce token usage)
    const recentTransactionsResult = await pool.query(
      `SELECT id, date, description, category, type, amount, bank, computable
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1)
       ${dateFilter}
       ORDER BY date DESC, id DESC
       LIMIT 10`,
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

    // Get settings (expected income) - make it optional in case table doesn't exist
    let settingsResult;
    try {
      settingsResult = await pool.query(
        `SELECT expected_monthly_income
         FROM settings
         WHERE user_id = $1 OR user_id IS NULL
         LIMIT 1`,
        [userId]
      );
    } catch (error) {
      // If settings table doesn't exist, return empty result
      if (error.message.includes('does not exist')) {
        console.log('⚠️ settings table not found, using default expected income of 0');
        settingsResult = { rows: [] };
      } else {
        throw error;
      }
    }

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
      categories: categories.slice(0, 20).map(c => ({
        category: c.category || 'Uncategorized',
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
      recentTransactions: recentTransactions.slice(0, 10).map(t => ({
        id: t.id,
        date: t.date ? new Date(t.date).toISOString().split('T')[0] : null,
        description: t.description ? t.description.substring(0, 100) : '', // Limit description length
        category: t.category || 'Uncategorized',
        type: t.type,
        amount: parseFloat(t.amount),
        bank: t.bank || 'Unknown',
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
    console.error('Error stack:', error.stack);
    
    // Return minimal valid data structure instead of null
    return {
      timePeriod: timePeriod || 'all',
      summary: {
        allTime: { totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 },
        filtered: { totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 },
        currentMonth: { income: 0, expenses: 0, netBalance: 0, expectedIncome: 0 }
      },
      budgets: [],
      categories: [],
      accounts: [],
      recentTransactions: [],
      trends: [],
      error: 'Failed to load some financial data'
    };
  }
}

// AI Provider API Calls
async function callOpenAI(apiKey, userMessage, financialData, language = 'en') {
  const languageInstruction = language === 'es' 
    ? 'IMPORTANT: Respond ONLY in Spanish (Español). Use Spanish for all your responses, numbers, and explanations.'
    : 'IMPORTANT: Respond ONLY in English. Use English for all your responses, numbers, and explanations.';
  
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
          content: `You are an expert financial advisor assistant. Analyze the user's financial data and provide helpful advice.

Financial Data Summary:
- All-time: Income €${financialData.summary.allTime.totalIncome.toFixed(2)}, Expenses €${financialData.summary.allTime.totalExpenses.toFixed(2)}, Net €${financialData.summary.allTime.netBalance.toFixed(2)}, ${financialData.summary.allTime.transactionCount} transactions
- Current Month: Income €${financialData.summary.currentMonth.income.toFixed(2)}, Expenses €${financialData.summary.currentMonth.expenses.toFixed(2)}, Net €${financialData.summary.currentMonth.netBalance.toFixed(2)}
- Filtered Period (${financialData.timePeriod}): Income €${financialData.summary.filtered.totalIncome.toFixed(2)}, Expenses €${financialData.summary.filtered.totalExpenses.toFixed(2)}, Net €${financialData.summary.filtered.netBalance.toFixed(2)}, ${financialData.summary.filtered.transactionCount} transactions
- Expected Monthly Income: €${financialData.summary.currentMonth.expectedIncome.toFixed(2)}
- ${financialData.categories.length} spending categories
- ${financialData.accounts.length} accounts (${financialData.accounts.filter(a => a.type === 'credit').length} credit cards)
- ${financialData.recentTransactions.length} recent transactions
- ${financialData.trends.length} months of trend data
- ${financialData.budgets.length} budget categories

Top Spending Categories:
${financialData.categories.slice(0, 5).map((c, i) => `${i + 1}. ${c.category}: €${c.total.toFixed(2)} (${c.count} transactions)`).join('\n')}

Budget Status:
${financialData.budgets.length > 0 ? financialData.budgets.map(b => `- ${b.category}: Budget €${b.budget.toFixed(2)}, Spent €${b.spent.toFixed(2)}, Remaining €${b.remaining.toFixed(2)}, Usage ${b.usagePercent.toFixed(1)}%`).join('\n') : 'No budgets configured'}

Account Balances:
${financialData.accounts.length > 0 ? financialData.accounts.map(a => `- ${a.name} (${a.type}): €${a.balance.toFixed(2)}${a.type === 'credit' ? `, Limit €${a.creditLimit.toFixed(2)}` : ''}`).join('\n') : 'No accounts configured'}

Recent Transactions (last ${financialData.recentTransactions.length}):
${financialData.recentTransactions.length > 0 ? financialData.recentTransactions.slice(0, 5).map(t => `- ${t.date}: ${t.description.substring(0, 50)} - €${t.amount.toFixed(2)} (${t.category})`).join('\n') : 'No recent transactions'}

IMPORTANT: If values are €0.00, this means no transactions were recorded for that period, not that data is missing. Always provide analysis based on what IS available, even if some values are zero. Compare current month to expected income and provide actionable advice.

Guidelines:
- Use Euro (€) for currency
- Be specific with numbers and percentages
- Reference the time period being analyzed (${financialData.timePeriod})
- Provide actionable recommendations
- Compare current performance to historical trends when relevant
- If user asks about budget, analyze budget vs actual spending
- If user asks about spending, analyze categories and trends

${languageInstruction}`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error response:', errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid OpenAI API response structure:', data);
    throw new Error('Invalid response format from OpenAI API');
  }
  
  return data.choices[0].message.content;
}

// Claude API calls now handled by enhanced-ai-service.js
// This function is kept for backward compatibility but won't be used for Claude
async function callClaude(apiKey, userMessage, financialData, language = 'en') {
  // This function is deprecated - Claude now uses enhanced-ai-service.js
  throw new Error('Claude API calls should use enhanced-ai-service.js');
}

async function callGemini(apiKey, userMessage, financialData, language = 'en') {
  const languageInstruction = language === 'es' 
    ? 'IMPORTANTE: Responde SOLO en Español. Usa español para todas tus respuestas, números y explicaciones.'
    : 'IMPORTANT: Respond ONLY in English. Use English for all your responses, numbers, and explanations.';
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are an expert financial advisor assistant. Analyze the user's financial data and provide helpful advice.

Financial Data Summary:
- All-time: Income €${financialData.summary.allTime.totalIncome.toFixed(2)}, Expenses €${financialData.summary.allTime.totalExpenses.toFixed(2)}, Net €${financialData.summary.allTime.netBalance.toFixed(2)}, ${financialData.summary.allTime.transactionCount} transactions
- Current Month: Income €${financialData.summary.currentMonth.income.toFixed(2)}, Expenses €${financialData.summary.currentMonth.expenses.toFixed(2)}, Net €${financialData.summary.currentMonth.netBalance.toFixed(2)}
- Filtered Period (${financialData.timePeriod}): Income €${financialData.summary.filtered.totalIncome.toFixed(2)}, Expenses €${financialData.summary.filtered.totalExpenses.toFixed(2)}, Net €${financialData.summary.filtered.netBalance.toFixed(2)}, ${financialData.summary.filtered.transactionCount} transactions
- Expected Monthly Income: €${financialData.summary.currentMonth.expectedIncome.toFixed(2)}
- ${financialData.categories.length} spending categories
- ${financialData.accounts.length} accounts (${financialData.accounts.filter(a => a.type === 'credit').length} credit cards)
- ${financialData.recentTransactions.length} recent transactions
- ${financialData.trends.length} months of trend data
- ${financialData.budgets.length} budget categories

Top Spending Categories:
${financialData.categories.slice(0, 5).map((c, i) => `${i + 1}. ${c.category}: €${c.total.toFixed(2)} (${c.count} transactions)`).join('\n')}

Budget Status:
${financialData.budgets.length > 0 ? financialData.budgets.map(b => `- ${b.category}: Budget €${b.budget.toFixed(2)}, Spent €${b.spent.toFixed(2)}, Remaining €${b.remaining.toFixed(2)}, Usage ${b.usagePercent.toFixed(1)}%`).join('\n') : 'No budgets configured'}

Account Balances:
${financialData.accounts.length > 0 ? financialData.accounts.map(a => `- ${a.name} (${a.type}): €${a.balance.toFixed(2)}${a.type === 'credit' ? `, Limit €${a.creditLimit.toFixed(2)}` : ''}`).join('\n') : 'No accounts configured'}

Recent Transactions (last ${financialData.recentTransactions.length}):
${financialData.recentTransactions.length > 0 ? financialData.recentTransactions.slice(0, 5).map(t => `- ${t.date}: ${t.description.substring(0, 50)} - €${t.amount.toFixed(2)} (${t.category})`).join('\n') : 'No recent transactions'}

IMPORTANT: If values are €0.00, this means no transactions were recorded for that period, not that data is missing. Always provide analysis based on what IS available, even if some values are zero. Compare current month to expected income and provide actionable advice.

User question: ${userMessage}

Guidelines:
- Use Euro (€) for currency
- Be specific with numbers and percentages
- Reference the time period being analyzed (${financialData.timePeriod})
- Provide actionable recommendations
- Compare current performance to historical trends when relevant
- If user asks about budget, analyze budget vs actual spending
- If user asks about spending, analyze categories and trends

${languageInstruction}`
        }]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error response:', errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
    console.error('Invalid Gemini API response structure:', data);
    throw new Error('Invalid response format from Gemini API');
  }
  
  return data.candidates[0].content.parts[0].text;
}

export default router;

