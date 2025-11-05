/**
 * Enhanced AI Service for AiFinity.app
 * Integrates financial AI prompts with Claude API
 */

import { 
  FINANCIAL_SYSTEM_PROMPT, 
  buildFinancialPrompt,
  formatFinancialContext,
  generateFollowUpSuggestions 
} from './financial-ai-prompts.js';

// ============================================================================
// CLAUDE API CONFIGURATION
// ============================================================================

const CLAUDE_CONFIG = {
  apiUrl: 'https://api.anthropic.com/v1/messages',
  model: 'claude-sonnet-4-20250514', // Latest Claude model
  maxTokens: 4096,
  temperature: 0.7, // Balance between creativity and consistency
  apiVersion: '2023-06-01'
};

// ============================================================================
// ENHANCED AI SERVICE CLASS
// ============================================================================

export class EnhancedAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Main method to get financial advice from Claude
   * @param {string} userMessage - User's question
   * @param {object} financialData - User's transaction data
   * @param {string} timeRange - Time period for analysis
   * @param {string} language - Language preference (en/es)
   */
  async getFinancialAdvice(userMessage, financialData, timeRange, language = 'en') {
    try {
      // Build enhanced prompt with financial context
      const systemPrompt = FINANCIAL_SYSTEM_PROMPT;
      const userPrompt = buildFinancialPrompt(userMessage, financialData, timeRange || 'all', language);

      // Call Claude API
      const response = await this.callClaudeAPI(systemPrompt, userPrompt);

      // Generate follow-up suggestions
      const suggestions = generateFollowUpSuggestions(userMessage, financialData);

      return {
        success: true,
        response: response,
        suggestions: suggestions
      };

    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackResponse: this.getFallbackResponse(userMessage, language)
      };
    }
  }

  /**
   * Call Claude API with enhanced error handling
   */
  async callClaudeAPI(systemPrompt, userPrompt) {
    const response = await fetch(CLAUDE_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': CLAUDE_CONFIG.apiVersion
      },
      body: JSON.stringify({
        model: CLAUDE_CONFIG.model,
        max_tokens: CLAUDE_CONFIG.maxTokens,
        temperature: CLAUDE_CONFIG.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const errorMsg = errorData.error?.message || response.statusText;
      
      // Provide more specific error messages
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your API key in Settings.');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a moment.');
      } else if (errorMsg.includes('insufficient_quota')) {
        throw new Error('API quota exceeded. Please check your API account credits.');
      }
      
      throw new Error(`Claude API Error: ${response.status} - ${errorMsg}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Invalid Claude API response structure:', data);
      throw new Error('Invalid response format from Claude API');
    }
    
    return data.content[0].text;
  }

  /**
   * Fallback response when API fails
   */
  getFallbackResponse(userMessage, language) {
    if (language === 'es') {
      return `Lo siento, no puedo procesar tu pregunta en este momento debido a un error técnico. 
      
Por favor, intenta:
- Verificar tu conexión a internet
- Reformular tu pregunta
- Intentar de nuevo en unos momentos

Mientras tanto, puedes explorar tus datos en el dashboard para obtener información sobre tus finanzas.`;
    }

    return `I apologize, but I'm unable to process your question right now due to a technical issue.
    
Please try:
- Checking your internet connection
- Rephrasing your question
- Trying again in a few moments

In the meantime, you can explore your dashboard to get insights about your finances.`;
  }
}

// ============================================================================
// API ENDPOINT INTEGRATION
// ============================================================================

export async function handleAIChatRequest(req, res, db) {
  try {
    const { message, timePeriod, language = 'en' } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user's API key from database
    const apiKeyResult = await db.query(
      `SELECT api_key FROM ai_config 
       WHERE user_id = $1 AND provider = 'claude' AND is_active = true`,
      [userId]
    );

    if (apiKeyResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Claude API key not configured. Please add your API key in settings.'
      });
    }

    const apiKey = apiKeyResult.rows[0].api_key;

    // Fetch user's financial data
    const financialData = await fetchUserFinancialData(db, userId, timePeriod);

    // Log financial data for debugging (especially account balances)
    console.log('🔍 Financial Data for AI:', {
      userId,
      transactionCount: financialData.summary?.allTime?.transactionCount || 0,
      accountCount: financialData.accounts?.length || 0,
      totalAccountsBalance: financialData.accounts?.reduce((sum, acc) => {
        if (acc.type === 'credit') return sum;
        return sum + (acc.balance || 0);
      }, 0) || 0,
      hasAccounts: financialData.accounts && financialData.accounts.length > 0,
      accountNames: financialData.accounts?.map(a => a.name) || []
    });

    // Initialize AI service
    const aiService = new EnhancedAIService(apiKey);

    // Get AI response
    const response = await aiService.getFinancialAdvice(
      message,
      financialData,
      timePeriod || 'all',
      language
    );

    if (!response.success) {
      return res.status(500).json({
        error: response.error || 'Failed to get AI response',
        fallbackResponse: response.fallbackResponse
      });
    }

    // Save to chat history
    await db.query(
      `INSERT INTO ai_chat_history (user_id, provider, user_message, ai_response)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'claude', message, response.response]
    ).catch(err => {
      console.error('Failed to save chat history:', err);
      // Don't fail the request if history save fails
    });

    return res.json({
      response: response.response,
      provider: 'claude',
      suggestions: response.suggestions || []
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({
      error: 'Failed to get AI response',
      message: error.message
    });
  }
}

/**
 * Fetch user's financial data for AI analysis
 */
async function fetchUserFinancialData(db, userId, timePeriod = null) {
  try {
    // Build date filter based on time period
    let dateFilter = '';
    
    if (timePeriod === 'day') {
      dateFilter = `AND DATE_TRUNC('day', date) = DATE_TRUNC('day', CURRENT_DATE)`;
    } else if (timePeriod === 'week') {
      dateFilter = `AND date >= DATE_TRUNC('week', CURRENT_DATE)`;
    } else if (timePeriod === 'month') {
      dateFilter = `AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (timePeriod === 'year') {
      dateFilter = `AND DATE_TRUNC('year', date) = DATE_TRUNC('year', CURRENT_DATE)`;
    }

    // Get comprehensive summary data (all time periods)
    const summaryAllResult = await db.query(
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
    const summaryFilteredResult = await db.query(
      `SELECT 
         SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as total_income,
         SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as total_expenses,
         COUNT(*) as transaction_count
       FROM transactions 
       WHERE (user_id IS NULL OR user_id = $1) ${dateFilter}`,
      [userId]
    );

    // Get current month data
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthDate = currentMonth + '-01';
    const currentMonthIncomeResult = await db.query(
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
    const currentMonthExpensesResult = await db.query(
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
    const budgetResult = await db.query(
      `SELECT category, amount, spent 
       FROM budgets 
       WHERE user_id = $1 OR user_id IS NULL`,
      [userId]
    );

    // Get all transactions by category (filtered by time period)
    const categoriesResult = await db.query(
      `SELECT category, type, SUM(amount) as total, COUNT(*) as count
       FROM transactions 
       WHERE (user_id IS NULL OR user_id = $1) 
       AND computable = true
       ${dateFilter}
       GROUP BY category, type 
       ORDER BY total DESC`,
      [userId]
    );

    // Get all accounts
    const accountsResult = await db.query(
      `SELECT id, name, account_type, balance, credit_limit, exclude_from_stats
       FROM accounts 
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY account_type, name`,
      [userId]
    );

    // Get recent transactions (last 10 to reduce token usage)
    const recentTransactionsResult = await db.query(
      `SELECT id, date, description, category, type, amount, bank, computable
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1)
       ${dateFilter}
       ORDER BY date DESC, id DESC
       LIMIT 10`,
      [userId]
    );

    // Get monthly trends (last 6 months)
    const trendsResult = await db.query(
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
    const settingsResult = await db.query(
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
        allTime: {
          totalIncome: parseFloat(summaryAll.total_income || 0),
          totalExpenses: parseFloat(summaryAll.total_expenses || 0),
          netBalance: parseFloat(summaryAll.total_income || 0) - parseFloat(summaryAll.total_expenses || 0),
          transactionCount: parseInt(summaryAll.transaction_count || 0),
          oldestTransactionDate: summaryAll.oldest_transaction_date,
          newestTransactionDate: summaryAll.newest_transaction_date
        },
        filtered: {
          totalIncome: parseFloat(summaryFiltered.total_income || 0),
          totalExpenses: parseFloat(summaryFiltered.total_expenses || 0),
          netBalance: parseFloat(summaryFiltered.total_income || 0) - parseFloat(summaryFiltered.total_expenses || 0),
          transactionCount: parseInt(summaryFiltered.transaction_count || 0)
        },
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
        description: t.description ? t.description.substring(0, 100) : '',
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
      trends: []
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  EnhancedAIService,
  handleAIChatRequest
};

