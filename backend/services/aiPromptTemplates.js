/**
 * AI Prompt Templates
 * Specific prompts for different question categories to get direct, actionable responses
 */

export const AI_PROMPTS = {
  
  /**
   * Prompt for pending payments questions
   */
  PENDING_PAYMENTS: (data, language = 'es') => {
    const dateStr = new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US');
    
    // Ensure data structure exists
    const pending = data?.pending || [];
    const balance = data?.balance || 0;
    const totalAmount = data?.totalAmount || 0;
    
    if (language === 'es') {
      return `
Actúa como un asistente financiero directo y práctico. El usuario pregunta qué pagos le faltan por hacer.

DATOS ACTUALES:
- Fecha: ${dateStr}
- Saldo disponible: €${balance.toFixed(2)}
- Pagos pendientes identificados: ${pending.length}

${pending.length > 0 ? `
PAGOS RECURRENTES PENDIENTES:
${pending.map((p, i) => {
  const daysText = p.daysUntil > 0 
    ? `(faltan ${p.daysUntil} días)` 
    : p.daysUntil === 0 
    ? `(hoy)` 
    : `(vencido hace ${Math.abs(p.daysUntil)} días)`;
  return `${i+1}. ${p.description}: €${(p.amount || 0).toFixed(2)} ${daysText}`;
}).join('\n')}

Total pendiente: €${totalAmount.toFixed(2)}
` : `
No se han identificado pagos recurrentes pendientes para este mes.
`}

INSTRUCCIONES CRÍTICAS:
- NO des un resumen general ni expliques la metodología
- NO hagas un análisis financiero completo
- Responde DIRECTAMENTE con la lista de pagos pendientes
- Formato: "Faltan X pagos este mes: [lista] Total: €XXX"
- Sé conversacional y claro
- Si no hay pagos pendientes, di "¡Todo pagado! 🎉 No tienes pagos recurrentes pendientes este mes."
- Usa emojis para hacer la respuesta más amigable
- Si hay pagos vencidos, menciónalo claramente
- NO incluyas recomendaciones generales sobre presupuesto o ahorro
- SOLO responde sobre los pagos pendientes

RESPUESTA:`;
    } else {
      return `
Act as a direct and practical financial assistant. The user is asking what payments they still need to make.

CURRENT DATA:
- Date: ${dateStr}
- Available balance: €${data.balance?.toFixed(2) || '0.00'}
- Pending payments identified: ${data.pending?.length || 0}

${data.pending && data.pending.length > 0 ? `
RECURRING PENDING PAYMENTS:
${data.pending.map((p, i) => {
  const daysText = p.daysUntil > 0 
    ? `(due in ${p.daysUntil} days)` 
    : p.daysUntil === 0 
    ? `(due today)` 
    : `(overdue by ${Math.abs(p.daysUntil)} days)`;
  return `${i+1}. ${p.description}: €${p.amount.toFixed(2)} ${daysText}`;
}).join('\n')}

Total pending: €${data.totalAmount?.toFixed(2) || '0.00'}
` : `
No recurring pending payments identified for this month.
`}

CRITICAL INSTRUCTIONS:
- Do NOT give a general summary or explain the methodology
- Respond DIRECTLY with the list of pending payments
- Format: "You have X pending payments this month: [list] Total: €XXX"
- Be conversational and clear
- If no pending payments, say "All paid! 🎉"
- Use emojis to make the response friendlier
- If there are overdue payments, mention it clearly

RESPONSE:`;
    }
  },

  /**
   * Prompt for spending capacity questions
   */
  SPENDING_CAPACITY: (data, language = 'es') => {
    if (language === 'es') {
      return `
El usuario pregunta cuánto puede gastar HOY.

DATOS:
- Saldo actual: €${data.currentBalance?.toFixed(2) || '0.00'}
- Pagos pendientes: €${data.pendingPayments?.toFixed(2) || '0.00'}
- Buffer de seguridad: €${data.safetyBuffer?.toFixed(2) || '0.00'}
- Días que quedan del mes: ${data.daysRemaining || 0}
- Disponible total: €${data.totalAvailable?.toFixed(2) || '0.00'}
- Recomendación diaria: €${data.dailyRecommended?.toFixed(2) || '0.00'}

INSTRUCCIONES:
- Responde con EL NÚMERO primero (destácalo)
- Explica brevemente por qué (pagos pendientes, días restantes)
- Da una recomendación práctica y específica
- Formato: "Hoy puedes gastar aproximadamente €XXX. [Explicación breve]. [Consejo práctico]"
- NO hagas un análisis largo
- Sé positivo pero realista
- Si el monto es muy bajo, sugiere revisar gastos o esperar ingresos

RESPUESTA:`;
    } else {
      return `
The user is asking how much they can spend TODAY.

DATA:
- Current balance: €${data.currentBalance?.toFixed(2) || '0.00'}
- Pending payments: €${data.pendingPayments?.toFixed(2) || '0.00'}
- Safety buffer: €${data.safetyBuffer?.toFixed(2) || '0.00'}
- Days remaining in month: ${data.daysRemaining || 0}
- Total available: €${data.totalAvailable?.toFixed(2) || '0.00'}
- Daily recommendation: €${data.dailyRecommended?.toFixed(2) || '0.00'}

INSTRUCTIONS:
- Respond with THE NUMBER first (highlight it)
- Briefly explain why (pending payments, remaining days)
- Give a practical and specific recommendation
- Format: "Today you can spend approximately €XXX. [Brief explanation]. [Practical advice]"
- Do NOT make a long analysis
- Be positive but realistic
- If the amount is very low, suggest reviewing expenses or waiting for income

RESPONSE:`;
    }
  },

  /**
   * Prompt for affordability check questions
   */
  AFFORDABILITY_CHECK: (question, data, language = 'es') => {
    if (language === 'es') {
      return `
El usuario pregunta: "${question}"

CONTEXTO:
- Disponible para gastar: €${data.totalAvailable?.toFixed(2) || '0.00'}
- Recomendación diaria: €${data.dailyRecommended?.toFixed(2) || '0.00'}
- Pagos pendientes: €${data.pendingPayments?.toFixed(2) || '0.00'}
- Días restantes del mes: ${data.daysRemaining || 0}
${data.requestedAmount ? `- Monto solicitado: €${data.requestedAmount.toFixed(2)}` : ''}
${data.canAfford !== undefined ? `- ¿Puede permitírselo?: ${data.canAfford ? 'Sí' : 'No'}` : ''}

INSTRUCCIONES:
- Responde SÍ o NO primero (destácalo)
- Explica el impacto específico con números concretos
- Da alternativa si es NO (cuándo podría permitírselo, cómo ahorrar)
- Sé humano y empático
- Formato: "Sí/No. [Razón específica con números]. [Impacto/Alternativa]"
- Si es NO, sugiere opciones concretas

RESPUESTA:`;
    } else {
      return `
The user asks: "${question}"

CONTEXT:
- Available to spend: €${data.totalAvailable?.toFixed(2) || '0.00'}
- Daily recommendation: €${data.dailyRecommended?.toFixed(2) || '0.00'}
- Pending payments: €${data.pendingPayments?.toFixed(2) || '0.00'}
- Days remaining in month: ${data.daysRemaining || 0}
${data.requestedAmount ? `- Requested amount: €${data.requestedAmount.toFixed(2)}` : ''}
${data.canAfford !== undefined ? `- Can afford?: ${data.canAfford ? 'Yes' : 'No'}` : ''}

INSTRUCTIONS:
- Respond YES or NO first (highlight it)
- Explain the specific impact with concrete numbers
- Give an alternative if NO (when they could afford it, how to save)
- Be human and empathetic
- Format: "Yes/No. [Specific reason with numbers]. [Impact/Alternative]"
- If NO, suggest concrete options

RESPONSE:`;
    }
  },

  /**
   * Prompt for balance inquiry questions
   */
  BALANCE_INQUIRY: (data, language = 'es') => {
    if (language === 'es') {
      return `
El usuario pregunta cuánto dinero tiene disponible.

DATOS:
- Saldo total en cuentas: €${data.currentBalance?.toFixed(2) || '0.00'}
- Pagos pendientes: €${data.pendingPayments?.toFixed(2) || '0.00'}
- Disponible después de pagos: €${data.totalAvailable?.toFixed(2) || '0.00'}

INSTRUCCIONES:
- Responde con el saldo disponible de forma clara y directa
- Formato: "Tienes €XXX disponibles. [Breve contexto si es relevante]"
- Si hay pagos pendientes, menciónalo brevemente
- Sé positivo y claro

RESPUESTA:`;
    } else {
      return `
The user is asking how much money they have available.

DATA:
- Total account balance: €${data.currentBalance?.toFixed(2) || '0.00'}
- Pending payments: €${data.pendingPayments?.toFixed(2) || '0.00'}
- Available after payments: €${data.totalAvailable?.toFixed(2) || '0.00'}

INSTRUCTIONS:
- Respond with the available balance clearly and directly
- Format: "You have €XXX available. [Brief context if relevant]"
- If there are pending payments, mention it briefly
- Be positive and clear

RESPONSE:`;
    }
  },

  /**
   * Prompt for debt analysis questions
   */
  DEBT_ANALYSIS: (data, language = 'es') => {
    if (language === 'es') {
      return `
El usuario pregunta sobre su deuda y tarjetas de crédito.

DATOS DE DEUDA:
- Deuda total: €${data.totalDebt?.toFixed(2) || '0.00'}
- Límite de crédito total: €${data.totalCreditLimit?.toFixed(2) || '0.00'}
- Crédito disponible: €${data.totalAvailableCredit?.toFixed(2) || '0.00'}
- Utilización: ${data.overallUtilization?.toFixed(1) || '0'}%
- Número de tarjetas: ${data.cardCount || 0}
- Pago mínimo estimado: €${data.minimumPayments?.toFixed(2) || '0.00'}
- Interés mensual estimado: €${data.monthlyInterestCost?.toFixed(2) || '0.00'}
- Interés anual estimado: €${data.annualInterestCost?.toFixed(2) || '0.00'}

${data.creditCards && data.creditCards.length > 0 ? `
TARJETAS DE CRÉDITO:
${data.creditCards.map((card, i) => 
  `${i+1}. ${card.name}: €${card.debt.toFixed(2)} deuda / €${card.creditLimit.toFixed(2)} límite (${card.utilization.toFixed(1)}% usado)`
).join('\n')}
` : ''}

${data.payoffScenarios ? `
ESCENARIOS DE PAGO:
- Pago mínimo (€${data.payoffScenarios.minimumPayment?.monthlyPayment?.toFixed(2) || '0.00'}/mes): ${data.payoffScenarios.minimumPayment?.months || 0} meses, total €${data.payoffScenarios.minimumPayment?.totalPaid?.toFixed(2) || '0.00'}
- Doble mínimo (€${data.payoffScenarios.doubleMinimum?.monthlyPayment?.toFixed(2) || '0.00'}/mes): ${data.payoffScenarios.doubleMinimum?.months || 0} meses, total €${data.payoffScenarios.doubleMinimum?.totalPaid?.toFixed(2) || '0.00'}
- Agresivo (€${data.payoffScenarios.aggressive?.monthlyPayment?.toFixed(2) || '0.00'}/mes): ${data.payoffScenarios.aggressive?.months || 0} meses, total €${data.payoffScenarios.aggressive?.totalPaid?.toFixed(2) || '0.00'}
` : ''}

INSTRUCCIONES:
- Responde DIRECTAMENTE sobre la situación de deuda
- Muestra números específicos y claros
- Explica el impacto de los intereses
- Da recomendaciones prácticas para pagar la deuda
- Si la utilización es alta (>70%), advierte claramente
- Sugiere estrategias de pago (avalancha o bola de nieve)
- Sé empático pero directo sobre la situación

RESPUESTA:`;
    } else {
      return `
The user is asking about their debt and credit cards.

DEBT DATA:
- Total debt: €${data.totalDebt?.toFixed(2) || '0.00'}
- Total credit limit: €${data.totalCreditLimit?.toFixed(2) || '0.00'}
- Available credit: €${data.totalAvailableCredit?.toFixed(2) || '0.00'}
- Utilization: ${data.overallUtilization?.toFixed(1) || '0'}%
- Number of cards: ${data.cardCount || 0}
- Estimated minimum payment: €${data.minimumPayments?.toFixed(2) || '0.00'}
- Estimated monthly interest: €${data.monthlyInterestCost?.toFixed(2) || '0.00'}
- Estimated annual interest: €${data.annualInterestCost?.toFixed(2) || '0.00'}

${data.creditCards && data.creditCards.length > 0 ? `
CREDIT CARDS:
${data.creditCards.map((card, i) => 
  `${i+1}. ${card.name}: €${card.debt.toFixed(2)} debt / €${card.creditLimit.toFixed(2)} limit (${card.utilization.toFixed(1)}% used)`
).join('\n')}
` : ''}

${data.payoffScenarios ? `
PAYOFF SCENARIOS:
- Minimum payment (€${data.payoffScenarios.minimumPayment?.monthlyPayment?.toFixed(2) || '0.00'}/month): ${data.payoffScenarios.minimumPayment?.months || 0} months, total €${data.payoffScenarios.minimumPayment?.totalPaid?.toFixed(2) || '0.00'}
- Double minimum (€${data.payoffScenarios.doubleMinimum?.monthlyPayment?.toFixed(2) || '0.00'}/month): ${data.payoffScenarios.doubleMinimum?.months || 0} months, total €${data.payoffScenarios.doubleMinimum?.totalPaid?.toFixed(2) || '0.00'}
- Aggressive (€${data.payoffScenarios.aggressive?.monthlyPayment?.toFixed(2) || '0.00'}/month): ${data.payoffScenarios.aggressive?.months || 0} months, total €${data.payoffScenarios.aggressive?.totalPaid?.toFixed(2) || '0.00'}
` : ''}

INSTRUCTIONS:
- Respond DIRECTLY about the debt situation
- Show specific and clear numbers
- Explain the impact of interest
- Give practical recommendations to pay off debt
- If utilization is high (>70%), warn clearly
- Suggest payment strategies (avalanche or snowball)
- Be empathetic but direct about the situation

RESPONSE:`;
    }
  },

  /**
   * Prompt for daily/weekly/monthly spending questions
   */
  DAILY_SPENDING: (data, language = 'es') => {
    if (language === 'es') {
      return `
El usuario pregunta sobre sus gastos en un período específico (hoy, esta semana, este mes).

DATOS:
- Período: ${data.period || 'período específico'}
- Gastos totales: €${data.totalSpending?.toFixed(2) || '0.00'}
- Número de transacciones: ${data.transactionCount || 0}
- Promedio diario: €${data.dailyAverage?.toFixed(2) || '0.00'}
- Día más caro: €${data.maxDaySpending?.toFixed(2) || '0.00'}

${data.topCategories && data.topCategories.length > 0 ? `
TOP CATEGORÍAS DE GASTO:
${data.topCategories.slice(0, 5).map((cat, i) => 
  `${i+1}. ${cat.category}: €${cat.total.toFixed(2)}`
).join('\n')}
` : ''}

INSTRUCCIONES:
- Responde con el monto total gastado en el período
- Compara con períodos anteriores si es relevante
- Identifica las categorías principales de gasto
- Da contexto sobre si el gasto es normal o alto
- Sé específico con números y porcentajes

RESPUESTA:`;
    } else {
      return `
The user is asking about their spending in a specific period (today, this week, this month).

DATA:
- Period: ${data.period || 'specific period'}
- Total spending: €${data.totalSpending?.toFixed(2) || '0.00'}
- Number of transactions: ${data.transactionCount || 0}
- Daily average: €${data.dailyAverage?.toFixed(2) || '0.00'}
- Most expensive day: €${data.maxDaySpending?.toFixed(2) || '0.00'}

${data.topCategories && data.topCategories.length > 0 ? `
TOP SPENDING CATEGORIES:
${data.topCategories.slice(0, 5).map((cat, i) => 
  `${i+1}. ${cat.category}: €${cat.total.toFixed(2)}`
).join('\n')}
` : ''}

INSTRUCTIONS:
- Respond with the total amount spent in the period
- Compare with previous periods if relevant
- Identify main spending categories
- Give context on whether spending is normal or high
- Be specific with numbers and percentages

RESPONSE:`;
    }
  },

  /**
   * Prompt for spending breakdown questions
   */
  SPENDING_BREAKDOWN: (data, language = 'es') => {
    if (language === 'es') {
      return `
El usuario pregunta en qué gasta su dinero o dónde va su dinero.

DATOS:
- Gastos del mes actual: €${data.summary?.currentMonth?.expenses?.toFixed(2) || '0.00'}
- Top categorías de gasto:
${data.categories && data.categories.length > 0 
  ? data.categories.slice(0, 10).map((c, i) => 
      `  ${i+1}. ${c.category}: €${c.total.toFixed(2)} (${c.count} transacciones)`
    ).join('\n')
  : '  No hay categorías disponibles'
}

INSTRUCCIONES:
- Lista las categorías principales de gasto con montos específicos
- Muestra porcentajes del total de gastos
- Identifica las categorías más grandes
- Da recomendaciones específicas sobre dónde reducir gastos
- Formato claro con números y porcentajes

RESPUESTA:`;
    } else {
      return `
The user is asking what they spend their money on or where their money goes.

DATA:
- Current month expenses: €${data.summary?.currentMonth?.expenses?.toFixed(2) || '0.00'}
- Top spending categories:
${data.categories && data.categories.length > 0 
  ? data.categories.slice(0, 10).map((c, i) => 
      `  ${i+1}. ${c.category}: €${c.total.toFixed(2)} (${c.count} transactions)`
    ).join('\n')
  : '  No categories available'
}

INSTRUCTIONS:
- List the main spending categories with specific amounts
- Show percentages of total expenses
- Identify the largest categories
- Give specific recommendations on where to reduce spending
- Clear format with numbers and percentages

RESPONSE:`;
    }
  }
};

/**
 * Get the appropriate prompt for a category
 * @param {string} category - Question category
 * @param {object} data - Context data
 * @param {string} question - Original question (for affordability checks)
 * @param {string} language - Language preference
 * @returns {string} - Formatted prompt
 */
export function getPromptForCategory(category, data, question = '', language = 'es') {
  switch (category) {
    case 'PENDING_PAYMENTS':
      return AI_PROMPTS.PENDING_PAYMENTS(data, language);
    
    case 'SPENDING_CAPACITY':
      return AI_PROMPTS.SPENDING_CAPACITY(data, language);
    
    case 'AFFORDABILITY_CHECK':
      return AI_PROMPTS.AFFORDABILITY_CHECK(question, data, language);
    
    case 'BALANCE_INQUIRY':
      return AI_PROMPTS.BALANCE_INQUIRY(data, language);
    
    case 'SPENDING_BREAKDOWN':
      return AI_PROMPTS.SPENDING_BREAKDOWN(data, language);
    
    case 'DEBT_ANALYSIS':
      return AI_PROMPTS.DEBT_ANALYSIS(data, language);
    
    case 'DAILY_SPENDING':
      return AI_PROMPTS.DAILY_SPENDING(data, language);
    
    case 'SPENDING_TRENDS':
    case 'SAVINGS_GOALS':
    case 'FINANCIAL_HEALTH':
    case 'EXPENSE_CATEGORY':
    case 'INCOME_ANALYSIS':
    case 'BUDGET_STATUS':
      // These use the financial data directly, so return null to use default prompt
      return null;
    
    default:
      return null;
  }
}

export default {
  AI_PROMPTS,
  getPromptForCategory
};
