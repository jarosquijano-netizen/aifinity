/**
 * Enhanced Financial AI System for AiFinity.app
 * Optimized for Claude API with financial expertise
 */

// ============================================================================
// SYSTEM PROMPT - Core Financial Knowledge
// ============================================================================

export const FINANCIAL_SYSTEM_PROMPT = `You are a professional financial advisor AI assistant integrated into AiFinity.app, a personal finance management platform. Your role is to provide clear, actionable, and personalized financial advice based on the user's transaction data.

## Your Expertise:
- Personal budgeting and expense management
- Savings strategies and financial planning
- Debt management and reduction strategies
- Investment basics and wealth building
- Tax optimization (general guidance)
- Financial goal setting and tracking
- Credit score improvement
- Emergency fund planning
- Cash flow management

## Your Approach:
- **Data-Driven**: Base recommendations on actual transaction patterns
- **Practical**: Provide actionable steps, not just theory
- **Personalized**: Tailor advice to the user's specific financial situation
- **Educational**: Explain the "why" behind recommendations
- **Non-Judgmental**: Be supportive and constructive
- **Realistic**: Consider the user's income and lifestyle constraints

## Communication Style:
- Use clear, simple language (avoid excessive financial jargon)
- Be concise but thorough
- Use bullet points for actionable recommendations
- Include specific numbers and percentages when relevant
- Be encouraging and positive while being honest about challenges

## Important Constraints:
- Do NOT provide specific investment product recommendations
- Do NOT give tax advice requiring a licensed professional
- Do NOT make assumptions about the user's complete financial picture
- Always remind users to consult professionals for major financial decisions
- Focus on the data provided, acknowledge what you don't know`;

// ============================================================================
// CATEGORY SPENDING BENCHMARKS (% of after-tax income)
// ============================================================================

export const CATEGORY_BENCHMARKS = {
  'Housing': { min: 25, max: 35, description: 'Rent/mortgage, utilities, insurance' },
  'Transportation': { min: 10, max: 15, description: 'Car payment, gas, insurance, public transit' },
  'Food & Dining': { min: 10, max: 15, description: 'Groceries and restaurants combined' },
  'Groceries': { min: 6, max: 10, description: 'Home cooking and essentials' },
  'Restaurants': { min: 5, max: 8, description: 'Dining out and takeout' },
  'Supermercado': { min: 6, max: 10, description: 'Groceries (Spanish)' },
  'Restaurantes': { min: 5, max: 8, description: 'Restaurants (Spanish)' },
  'Healthcare': { min: 5, max: 10, description: 'Insurance, copays, prescriptions' },
  'Insurance': { min: 10, max: 15, description: 'All insurance types' },
  'Utilities': { min: 5, max: 10, description: 'Electric, gas, water, internet, phone' },
  'Entertainment': { min: 2, max: 5, description: 'Hobbies, movies, events' },
  'Personal Care': { min: 2, max: 4, description: 'Haircuts, cosmetics, gym' },
  'Clothing': { min: 2, max: 5, description: 'Apparel and accessories' },
  'Subscriptions': { min: 1, max: 3, description: 'Streaming, software, memberships' },
  'Savings': { min: 20, max: 30, description: 'Emergency fund, retirement, investments' },
  'Debt Payment': { min: 0, max: 15, description: 'Beyond minimum payments' }
};

// ============================================================================
// FINANCIAL DATA FORMATTER
// ============================================================================

export function formatFinancialContext(data, timeRange) {
  let context = '';
  
  // ⭐ START WITH ACCOUNT BALANCES - Most important for "how much money" questions
  if (data.accounts && data.accounts.length > 0) {
    context += `\n## ⭐ YOUR CURRENT MONEY - Account Balances\n\n`;
    let totalBalance = 0;
    let totalSavings = 0;
    let totalChecking = 0;
    let totalCreditDebt = 0;
    
    data.accounts.forEach(acc => {
      if (acc.type === 'credit') {
        const debt = Math.abs(acc.balance || 0);
        totalCreditDebt += debt;
      } else if (acc.type === 'savings') {
        totalSavings += (acc.balance || 0);
        totalBalance += (acc.balance || 0);
      } else if (acc.type === 'checking') {
        totalChecking += (acc.balance || 0);
        totalBalance += (acc.balance || 0);
      } else {
        totalBalance += (acc.balance || 0);
      }
    });
    
    context += `**⭐ TOTAL AVAILABLE MONEY: €${totalBalance.toFixed(2)}**\n\n`;
    if (totalChecking > 0) {
      context += `- Checking Accounts: €${totalChecking.toFixed(2)}\n`;
    }
    if (totalSavings > 0) {
      context += `- Savings Accounts: €${totalSavings.toFixed(2)}\n`;
    }
    if (totalCreditDebt > 0) {
      context += `- Credit Card Debt: €${totalCreditDebt.toFixed(2)}\n`;
    }
    context += `- Net Worth (Accounts - Credit Debt): €${(totalBalance - totalCreditDebt).toFixed(2)}\n\n`;
    
    context += `**Individual Accounts:**\n`;
    data.accounts.forEach(acc => {
      if (acc.type === 'credit') {
        const utilization = acc.creditLimit > 0
          ? ((Math.abs(acc.balance || 0) / acc.creditLimit) * 100).toFixed(1)
          : 0;
        context += `- ${acc.name} (Credit Card): €${Math.abs(acc.balance || 0).toFixed(2)} debt / €${(acc.creditLimit || 0).toFixed(2)} limit (${utilization}%)\n`;
      } else {
        context += `- ${acc.name} (${acc.type}): €${(acc.balance || 0).toFixed(2)}\n`;
      }
    });
    context += '\n';
  } else if (data.summary && data.summary.allTime && data.summary.allTime.transactionCount > 0) {
    // If no accounts configured but there are transactions, mention this
    context += `\n## ⚠️ Account Balances\n\n`;
    context += `No accounts configured in the system. However, you have ${data.summary.allTime.transactionCount} transactions recorded.\n`;
    context += `💡 To see your actual account balances, configure your accounts in the Accounts section.\n\n`;
  }
  
  // Time period header
  context += `\n## Time Period: ${timeRange || 'all'}\n\n`;
  
  // Summary Overview
  context += `📊 **Financial Overview:**\n`;
  context += `- All-time Income: €${data.summary.allTime.totalIncome.toFixed(2)}\n`;
  context += `- All-time Expenses: €${data.summary.allTime.totalExpenses.toFixed(2)}\n`;
  context += `- All-time Net Balance: €${data.summary.allTime.netBalance.toFixed(2)}\n`;
  context += `- Total Transactions: ${data.summary.allTime.transactionCount}\n`;
  
  if (data.summary.allTime.transactionCount > 0) {
    context += `- ✅ Data Available: ${data.summary.allTime.transactionCount} transactions recorded\n`;
    if (data.summary.allTime.oldestTransactionDate) {
      const oldestDate = new Date(data.summary.allTime.oldestTransactionDate).toLocaleDateString();
      const newestDate = new Date(data.summary.allTime.newestTransactionDate).toLocaleDateString();
      context += `- Date Range: ${oldestDate} to ${newestDate}\n`;
    }
  }
  context += '\n';
  
  // Filtered Period Summary
  if (timeRange && timeRange !== 'all') {
    context += `📅 **Period Analysis (${timeRange}):**\n`;
    context += `- Income: €${data.summary.filtered.totalIncome.toFixed(2)}\n`;
    context += `- Expenses: €${data.summary.filtered.totalExpenses.toFixed(2)}\n`;
    context += `- Net Balance: €${data.summary.filtered.netBalance.toFixed(2)}\n`;
    context += `- Transactions: ${data.summary.filtered.transactionCount}\n\n`;
  }
  
  // Current Month Summary
  context += `💰 **Current Month:**\n`;
  context += `- Income: €${data.summary.currentMonth.income.toFixed(2)}\n`;
  if (data.summary.currentMonth.expectedIncome > 0) {
    const incomeRatio = data.summary.currentMonth.expectedIncome > 0
      ? (data.summary.currentMonth.income / data.summary.currentMonth.expectedIncome * 100).toFixed(1)
      : 0;
    context += `- Expected Income: €${data.summary.currentMonth.expectedIncome.toFixed(2)} (${incomeRatio}% received)\n`;
  }
  context += `- Expenses: €${data.summary.currentMonth.expenses.toFixed(2)}\n`;
  context += `- Net Balance: €${data.summary.currentMonth.netBalance.toFixed(2)}\n`;
  
  // Calculate savings rate
  const savingsRate = data.summary.currentMonth.income > 0
    ? ((data.summary.currentMonth.netBalance / data.summary.currentMonth.income) * 100).toFixed(1)
    : 0;
  context += `- Savings Rate: ${savingsRate}%\n`;
  context += `- Status: ${parseFloat(savingsRate) >= 20 ? '✅ Healthy' : parseFloat(savingsRate) >= 10 ? '⚠️ Fair' : '⚠️ Needs Improvement'}\n\n`;
  
  // Top Spending Categories (limit to top 5 to reduce tokens)
  if (data.categories && data.categories.length > 0) {
    context += `📈 **Top Spending Categories:**\n`;
    data.categories.slice(0, 5).forEach((cat, i) => {
      const percentage = data.summary.currentMonth.expenses > 0
        ? ((cat.total / data.summary.currentMonth.expenses) * 100).toFixed(1)
        : 0;
      const benchmark = CATEGORY_BENCHMARKS[cat.category] || null;
      let status = '';
      if (benchmark && data.summary.currentMonth.income > 0) {
        const incomePct = ((cat.total / data.summary.currentMonth.income) * 100);
        if (incomePct > benchmark.max) {
          status = ' ⚠️ Above benchmark';
        } else if (incomePct < benchmark.min) {
          status = ' ✅ Below benchmark';
        } else {
          status = ' ✓ Normal';
        }
      }
      context += `${i + 1}. ${cat.category}: €${cat.total.toFixed(2)} (${percentage}% of expenses, ${((cat.total / data.summary.currentMonth.income) * 100).toFixed(1)}% of income)${status}\n`;
    });
    context += '\n';
  }
  
  // Budget Status (limit to top 5 budgets by spent amount to reduce tokens)
  if (data.budgets && data.budgets.length > 0) {
    context += `🎯 **Budget Tracking (Top 5):**\n`;
    // Sort by spent amount (descending) and take top 5
    const topBudgets = [...data.budgets]
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
    topBudgets.forEach(budget => {
      const status = budget.usagePercent >= 100 ? '⚠️ Over' : budget.usagePercent >= 80 ? '⚡ Near Limit' : '✅ On Track';
      context += `- ${budget.category}: €${budget.spent.toFixed(2)}/€${budget.budget.toFixed(2)} (${budget.usagePercent.toFixed(1)}%) ${status}\n`;
    });
    context += '\n';
  }
  
  // Monthly Trends (limit to 3 months to reduce tokens)
  if (data.trends && data.trends.length > 0) {
    context += `📊 **Monthly Trends (last 3 months):**\n`;
    data.trends.slice(0, 3).forEach(trend => {
      context += `- ${trend.month}: Income €${trend.income.toFixed(2)}, Expenses €${trend.expenses.toFixed(2)}, Net €${trend.netBalance.toFixed(2)}\n`;
    });
    context += '\n';
  }
  
  // Recent Transactions (limit to 3 to reduce tokens - account balances already shown at top)
  if (data.recentTransactions && data.recentTransactions.length > 0) {
    context += `📝 **Recent Transactions:**\n`;
    data.recentTransactions.slice(0, 3).forEach(t => {
      context += `- ${t.date}: ${t.description.substring(0, 50)} - €${t.amount.toFixed(2)} (${t.category || 'Uncategorized'})\n`;
    });
    context += '\n';
  }
  
  return context;
}

// ============================================================================
// LANGUAGE-SPECIFIC PROMPTS
// ============================================================================

const ENGLISH_PROMPTS = {
  tone: 'Use a friendly, professional tone in English',
  currency: 'EUR',
  dateFormat: 'DD/MM/YYYY'
};

const SPANISH_PROMPTS = {
  tone: 'Use a friendly, professional tone in Spanish',
  currency: 'EUR',
  dateFormat: 'DD/MM/YYYY'
};

// ============================================================================
// DYNAMIC PROMPT BUILDER
// ============================================================================

export function buildFinancialPrompt(userMessage, financialData, timeRange, language = 'en') {
  const lang = language === 'es' ? SPANISH_PROMPTS : ENGLISH_PROMPTS;
  
  // Format financial data summary
  const dataContext = formatFinancialContext(financialData, timeRange);
  
  // Build complete prompt
  const prompt = `${FINANCIAL_SYSTEM_PROMPT}

## User's Financial Data:
${dataContext}

## User's Question:
"${userMessage}"

## Instructions:
- Analyze the financial data provided above
- Give personalized, specific advice based on actual numbers from the user's data
- Use the user's real spending patterns and amounts
- Compare spending to benchmarks when relevant
- Be actionable: provide 3-5 concrete steps they can take
- Be encouraging but honest about challenges
- Use ${language === 'es' ? 'Spanish' : 'English'} language
- Format with clear sections and bullet points for readability
- Include specific euro amounts in recommendations
- End with 1-2 immediate action items

## CRITICAL: Data Interpretation Rules

**⚠️ VERY IMPORTANT - READ THIS FIRST:**

1. **CHECK TRANSACTION COUNT FIRST**: If "Total Transactions" > 0, the user HAS DATA - you MUST analyze it
2. **DO NOT SAY "NO DATA"** if transaction count > 0 - even if some values are €0.00
3. **USE THE ACTUAL NUMBERS PROVIDED** - don't assume data is missing
4. **FOR "HOW MUCH MONEY" QUESTIONS**: 
   - Check "⭐ Total Available Money" section first
   - If account balances exist, USE THOSE NUMBERS (they show actual money in bank accounts)
   - Account balances show CURRENT money, not historical transactions
5. **FOR SPENDING CATEGORY QUESTIONS**:
   - Use the "📈 Top Spending Categories" section
   - Provide specific amounts and percentages from the data
   - Compare to benchmarks when available
   - If categories list is empty BUT transaction count > 0, mention that transactions exist but need categorization
6. **Transaction summaries show income/expense FLOWS, not current balances**
7. **If all values are €0.00 AND transaction count is 0**, then say no transactions recorded
8. **If transaction count > 0**, analyze the data provided - don't ask them to add data

**Example Response Structure:**
- Start with a summary of what you found in their data
- Use specific numbers from the data (e.g., "You spent €1,234 in Restaurants this month")
- Provide actionable recommendations based on their actual spending
- If data shows categories, list them with amounts
- If data shows no categories but transactions exist, explain how to categorize

Please provide a comprehensive financial analysis and advice based on the ACTUAL DATA PROVIDED ABOVE:`;

  return prompt;
}

// ============================================================================
// RESPONSE ENHANCEMENT HELPERS
// ============================================================================

export function generateFollowUpSuggestions(userMessage, financialData) {
  const suggestions = [];
  const msgLower = userMessage.toLowerCase();

  // Context-aware suggestions
  if (msgLower.includes('save') || msgLower.includes('saving') || msgLower.includes('ahorro')) {
    suggestions.push("What's the best savings strategy for my situation?");
    suggestions.push("How much should I have in my emergency fund?");
    suggestions.push("How can I increase my savings rate?");
  } else if (msgLower.includes('budget') || msgLower.includes('presupuesto')) {
    suggestions.push("How can I stick to my budget better?");
    suggestions.push("Which categories should I focus on reducing?");
    suggestions.push("How can I optimize my spending?");
  } else if (msgLower.includes('debt') || msgLower.includes('deuda')) {
    suggestions.push("Should I use the avalanche or snowball method?");
    suggestions.push("How can I find extra money for debt payments?");
    suggestions.push("What's my debt payoff timeline?");
  } else if (msgLower.includes('expense') || msgLower.includes('spend') || msgLower.includes('gasto')) {
    suggestions.push("How can I reduce my expenses?");
    suggestions.push("What are my biggest spending categories?");
    suggestions.push("Where can I cut costs?");
  } else {
    // Generic suggestions based on data
    const savingsRate = financialData.summary?.currentMonth?.income > 0
      ? ((financialData.summary.currentMonth.netBalance / financialData.summary.currentMonth.income) * 100)
      : 0;
    
    if (savingsRate < 15) {
      suggestions.push("How can I increase my savings rate?");
    }
    if (financialData.categories && financialData.categories[0]) {
      suggestions.push(`How can I reduce my ${financialData.categories[0].category} expenses?`);
    }
    suggestions.push("What are my biggest financial opportunities?");
    suggestions.push("How does my spending compare to averages?");
  }

  return suggestions.slice(0, 3); // Return top 3
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  FINANCIAL_SYSTEM_PROMPT,
  CATEGORY_BENCHMARKS,
  buildFinancialPrompt,
  formatFinancialContext,
  generateFollowUpSuggestions
};

