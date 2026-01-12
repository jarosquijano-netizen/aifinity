/**
 * Question Classifier for AI Assistant
 * Categorizes user questions to provide better, more direct responses
 */

export const QUESTION_CATEGORIES = {
  PENDING_PAYMENTS: {
    keywords: [
      'pagos pendientes',
      'falta pagar',
      'qué pagos faltan',
      'pending payments',
      'qué falta pagar',
      'pagos del mes',
      'pagos recurrentes',
      'pagos fijos',
      'qué debo pagar',
      'what payments are due',
      'what do I need to pay',
      'que pagos vienen',
      'qué pagos vienen',
      'pagos que vienen',
      'pagos próximos',
      'próximos pagos',
      'upcoming payments',
      'what payments are coming',
      'que pagos tengo',
      'qué pagos tengo',
      'pagos por venir',
      'pagos a pagar',
      'que falta por pagar',
      'qué falta por pagar',
      'pagos restantes',
      'pagos del mes actual',
      'pagos de este mes'
    ],
    needsRealTimeData: true,
    responseType: 'LIST_WITH_TOTALS',
    priority: 1
  },
  
  SPENDING_CAPACITY: {
    keywords: [
      'cuánto puedo gastar',
      'tengo para gastar',
      'disponible',
      'how much can I spend',
      'cuánto tengo disponible',
      'puedo gastar',
      'dinero disponible',
      'available to spend',
      'how much money can I spend',
      'cuánto dinero tengo'
    ],
    needsRealTimeData: true,
    responseType: 'DIRECT_AMOUNT',
    priority: 1
  },
  
  AFFORDABILITY_CHECK: {
    keywords: [
      'me puedo permitir',
      'tengo presupuesto',
      'puedo gastar',
      'can I afford',
      'puedo comprar',
      'tengo suficiente',
      'do I have enough',
      'me alcanza',
      'puedo pagar',
      'can I pay for'
    ],
    needsRealTimeData: true,
    responseType: 'YES_NO_WITH_IMPACT',
    priority: 2
  },
  
  SPENDING_BREAKDOWN: {
    keywords: [
      'en qué gasto',
      'dónde va mi dinero',
      'gastos por categoría',
      'what do I spend on',
      'where does my money go',
      'spending by category',
      'gastos por categorías',
      'desglose de gastos',
      'breakdown of expenses'
    ],
    needsRealTimeData: false,
    responseType: 'CATEGORY_BREAKDOWN',
    priority: 3
  },
  
  BALANCE_INQUIRY: {
    keywords: [
      'cuánto tengo',
      'cuánto dinero tengo',
      'saldo',
      'balance',
      'how much do I have',
      'cuánto hay',
      'mi saldo',
      'my balance',
      'cuánto tengo disponible'
    ],
    needsRealTimeData: true,
    responseType: 'DIRECT_AMOUNT',
    priority: 1
  },
  
  BUDGET_STATUS: {
    keywords: [
      'presupuesto',
      'budget',
      'cómo voy con el presupuesto',
      'budget status',
      'estado del presupuesto',
      'cómo está mi presupuesto'
    ],
    needsRealTimeData: false,
    responseType: 'BUDGET_ANALYSIS',
    priority: 3
  },
  
  DEBT_ANALYSIS: {
    keywords: [
      'deuda',
      'deudas',
      'debt',
      'cuánto debo',
      'how much do I owe',
      'tarjetas de crédito',
      'credit cards',
      'deuda total',
      'total debt',
      'cuánto debo en tarjetas',
      'how much credit card debt',
      'pago mínimo',
      'minimum payment',
      'interés de tarjetas',
      'credit card interest',
      'cuándo pagaré mi deuda',
      'when will I pay off debt',
      'plan de pago',
      'debt payoff plan'
    ],
    needsRealTimeData: true,
    responseType: 'DEBT_BREAKDOWN',
    priority: 1
  },
  
  DAILY_SPENDING: {
    keywords: [
      'gastos de hoy',
      'gastos hoy',
      'spending today',
      'today\'s spending',
      'cuánto gasté hoy',
      'how much did I spend today',
      'gastos del día',
      'daily spending',
      'gastos de la semana',
      'gastos semanales',
      'weekly spending',
      'spending this week',
      'cuánto gasté esta semana',
      'how much did I spend this week',
      'gastos del mes',
      'monthly spending',
      'cuánto gasté este mes',
      'how much did I spend this month'
    ],
    needsRealTimeData: true,
    responseType: 'TIME_PERIOD_SPENDING',
    priority: 2
  },
  
  SPENDING_TRENDS: {
    keywords: [
      'tendencias de gasto',
      'spending trends',
      'cómo están mis gastos',
      'how are my expenses',
      'comparar gastos',
      'compare spending',
      'gastos vs mes pasado',
      'spending vs last month',
      'estoy gastando más',
      'am I spending more',
      'reducción de gastos',
      'reduce spending',
      'dónde puedo ahorrar',
      'where can I save',
      'gastos innecesarios',
      'unnecessary expenses'
    ],
    needsRealTimeData: false,
    responseType: 'TREND_ANALYSIS',
    priority: 3
  },
  
  SAVINGS_GOALS: {
    keywords: [
      'ahorros',
      'savings',
      'cuánto he ahorrado',
      'how much have I saved',
      'meta de ahorro',
      'savings goal',
      'cuánto necesito ahorrar',
      'how much do I need to save',
      'fondo de emergencia',
      'emergency fund',
      'cuánto debería tener ahorrado',
      'how much should I have saved',
      'ahorro mensual',
      'monthly savings'
    ],
    needsRealTimeData: true,
    responseType: 'SAVINGS_ANALYSIS',
    priority: 2
  },
  
  FINANCIAL_HEALTH: {
    keywords: [
      'salud financiera',
      'financial health',
      'cómo están mis finanzas',
      'how are my finances',
      'estado financiero',
      'financial status',
      'cómo voy financieramente',
      'how am I doing financially',
      'análisis financiero',
      'financial analysis',
      'resumen financiero',
      'financial summary'
    ],
    needsRealTimeData: false,
    responseType: 'HEALTH_CHECK',
    priority: 2
  },
  
  EXPENSE_CATEGORY: {
    keywords: [
      'gastos en',
      'spending on',
      'cuánto gasto en',
      'how much do I spend on',
      'gastos de',
      'expenses for',
      'cuánto he gastado en',
      'how much have I spent on',
      'gasto mensual en',
      'monthly spending on'
    ],
    needsRealTimeData: false,
    responseType: 'CATEGORY_SPECIFIC',
    priority: 2
  },
  
  INCOME_ANALYSIS: {
    keywords: [
      'ingresos',
      'income',
      'cuánto gano',
      'how much do I earn',
      'ingresos del mes',
      'monthly income',
      'ingresos vs gastos',
      'income vs expenses',
      'cuánto ingreso tengo',
      'how much income do I have'
    ],
    needsRealTimeData: false,
    responseType: 'INCOME_BREAKDOWN',
    priority: 2
  }
};

/**
 * Classify a user question into a category
 * @param {string} question - User's question
 * @returns {string|null} - Category name or null if no match
 */
export function classifyQuestion(question) {
  if (!question || typeof question !== 'string') {
    return null;
  }

  const questionLower = question.toLowerCase().trim();
  
  // Special patterns for better detection (high priority)
  const pendingPaymentsPatterns = [
    /pagos?\s+(que|qué|que|qué)\s+vienen/i,
    /pagos?\s+vienen/i,
    /(que|qué)\s+pagos?\s+vienen/i,
    /pagos?\s+(próximos|proximos)/i,
    /próximos?\s+pagos?/i,
    /pagos?\s+(que|qué)\s+tengo/i,
    /pagos?\s+(que|qué)\s+faltan/i,
    /(que|qué)\s+falta\s+pag/i,
    /pagos?\s+(pendientes|por venir|a pagar)/i
  ];
  
  const debtPatterns = [
    /cuánto\s+debo/i,
    /how\s+much\s+do\s+I\s+owe/i,
    /deuda\s+total/i,
    /total\s+debt/i,
    /tarjetas?\s+de\s+crédito/i,
    /credit\s+card/i,
    /cuánto\s+debo\s+en/i,
    /how\s+much\s+credit\s+card\s+debt/i
  ];
  
  const dailySpendingPatterns = [
    /gastos?\s+(de\s+)?hoy/i,
    /spending\s+today/i,
    /today'?s\s+spending/i,
    /cuánto\s+gasté\s+hoy/i,
    /how\s+much\s+did\s+I\s+spend\s+today/i,
    /gastos?\s+del\s+día/i,
    /daily\s+spending/i
  ];
  
  const weeklySpendingPatterns = [
    /gastos?\s+(de\s+)?la\s+semana/i,
    /weekly\s+spending/i,
    /spending\s+this\s+week/i,
    /cuánto\s+gasté\s+esta\s+semana/i,
    /how\s+much\s+did\s+I\s+spend\s+this\s+week/i
  ];
  
  // Check patterns in priority order
  for (const pattern of pendingPaymentsPatterns) {
    if (pattern.test(questionLower)) {
      return 'PENDING_PAYMENTS';
    }
  }
  
  for (const pattern of debtPatterns) {
    if (pattern.test(questionLower)) {
      return 'DEBT_ANALYSIS';
    }
  }
  
  for (const pattern of dailySpendingPatterns) {
    if (pattern.test(questionLower)) {
      return 'DAILY_SPENDING';
    }
  }
  
  for (const pattern of weeklySpendingPatterns) {
    if (pattern.test(questionLower)) {
      return 'DAILY_SPENDING'; // Weekly is also daily spending category
    }
  }
  
  // Score each category based on keyword matches
  const categoryScores = {};
  
  for (const [categoryName, category] of Object.entries(QUESTION_CATEGORIES)) {
    let score = 0;
    
    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (questionLower.includes(keywordLower)) {
        // Exact match gets higher score
        if (questionLower === keywordLower) {
          score += 10;
        } else if (questionLower.startsWith(keywordLower) || questionLower.endsWith(keywordLower)) {
          score += 3; // Partial match at start/end
        } else {
          score += 1; // Contains keyword
        }
      }
    }
    
    if (score > 0) {
      categoryScores[categoryName] = {
        score,
        priority: category.priority,
        category: categoryName
      };
    }
  }
  
  // If no matches, return null
  if (Object.keys(categoryScores).length === 0) {
    return null;
  }
  
  // Sort by priority first, then by score
  const sortedCategories = Object.values(categoryScores).sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority; // Lower priority number = higher priority
    }
    return b.score - a.score; // Higher score = better match
  });
  
  return sortedCategories[0].category;
}

/**
 * Check if a question should use a template response instead of AI
 * @param {string} category - Question category
 * @param {string} question - Original question
 * @returns {boolean}
 */
export function shouldUseTemplate(category, question) {
  // For very specific questions with clear data, use templates
  const templateCategories = ['PENDING_PAYMENTS', 'SPENDING_CAPACITY', 'BALANCE_INQUIRY'];
  
  if (templateCategories.includes(category)) {
    // If question is very specific (short, direct), use template
    const questionLower = question.toLowerCase().trim();
    const directQuestions = [
      'cuánto puedo gastar',
      'how much can I spend',
      'qué pagos faltan',
      'what payments are due',
      'cuánto tengo',
      'how much do I have',
      'pagos pendientes',
      'pending payments',
      'que pagos vienen',
      'qué pagos vienen',
      'pagos que vienen',
      'próximos pagos',
      'que pagos tengo',
      'qué pagos tengo'
    ];
    
    // Check for direct questions
    if (directQuestions.some(dq => questionLower === dq || questionLower.includes(dq))) {
      return true;
    }
    
    // For PENDING_PAYMENTS, also use template if question is short and contains "pagos"
    if (category === 'PENDING_PAYMENTS' && questionLower.length < 30 && 
        (questionLower.includes('pagos') || questionLower.includes('payments'))) {
      return true;
    }
    
    return false;
  }
  
  return false;
}

export default {
  QUESTION_CATEGORIES,
  classifyQuestion,
  shouldUseTemplate
};
