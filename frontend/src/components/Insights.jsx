import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, Info, Loader, DollarSign, PieChart, Target, Shield, Calendar, MessageCircle, Send, Bot, User, Sparkles, X, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { getSummary, getBudgetOverview, getTrends, sendAIChat, getAIChatHistory, getAccounts, getSettings } from '../utils/api';
import api from '../utils/api';

function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    financial: true,
    creditCards: true,
    expenses: true,
    global: true,
    budget: true,
    emergency: true,
    projections: true
  });

  // Chatbot state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await getAIChatHistory(20);
        const history = response.history.map(msg => ([
          { role: 'user', content: msg.user_message, timestamp: msg.created_at },
          { role: 'assistant', content: msg.ai_response, provider: msg.provider, timestamp: msg.created_at }
        ])).flat();
        setChatMessages(history);
      } catch (err) {
        console.error('Failed to load chat history:', err);
        // Silently fail - chat will just start empty
      }
    };
    
    loadChatHistory();
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (showChat && chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const [summary, budget, trends, accountsData, settings] = await Promise.all([
        getSummary(),
        api.get(`/budget/overview?month=${currentMonth}`).catch(() => ({ data: { totals: { budget: 0, spent: 0 }, categories: [] } })),
        getTrends(),
        getAccounts().catch(() => ({ accounts: [] })),
        getSettings().catch(() => ({ expectedMonthlyIncome: 0 }))
      ]);

      setData({
        summary,
        budget: budget.data,
        trends: trends,
        accounts: accountsData.accounts || [],
        expectedIncome: settings.expectedMonthlyIncome || 0
      });
    } catch (err) {
      setError('Failed to load financial data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="w-6 h-6 text-success" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-orange-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-primary" />;
      default:
        return <Lightbulb className="w-6 h-6 text-gray-500" />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-success';
      case 'warning':
        return 'bg-orange-50 border-orange-500';
      case 'info':
        return 'bg-blue-50 border-primary';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-danger">{error || 'No data available'}</p>
      </div>
    );
  }

  // Calculate financial metrics
  const actualIncome = data.summary.actualIncome || 0; // Actual income del mes actual
  const actualExpenses = data.summary.actualExpenses || data.summary.totalExpenses; // Actual expenses del mes actual
  const actualNetBalance = data.summary.actualNetBalance !== undefined ? data.summary.actualNetBalance : (actualIncome - actualExpenses);
  const monthlyIncome = data.summary.totalIncome; // Total histórico
  const monthlyExpenses = actualExpenses; // Usar expenses del mes actual
  const netBalance = actualNetBalance; // Usar balance del mes actual
  const savingsRate = actualIncome > 0 ? ((actualNetBalance / actualIncome) * 100) : 0;
  const budgetTotal = data.budget.totals?.budget || 0;
  const budgetSpent = data.budget.totals?.spent || 0;
  // Recalcular budgetUsage para asegurar precisión
  const budgetUsage = budgetTotal > 0 ? (budgetSpent / budgetTotal * 100) : 0;
  
  // Calcular días del mes y predicción de gasto
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - currentDay;
  const daysElapsed = currentDay;
  const dailySpendRate = daysElapsed > 0 ? (budgetSpent / daysElapsed) : 0;
  const projectedMonthEndSpend = budgetSpent + (dailySpendRate * daysRemaining);
  const projectedBudgetUsage = budgetTotal > 0 ? (projectedMonthEndSpend / budgetTotal * 100) : 0;
  
  // Expected Income & Ratio (using actual income of current month)
  const expectedIncome = data.expectedIncome || 0;
  const incomeRatio = expectedIncome > 0 ? (actualIncome / expectedIncome * 100) : 0;
  
  // Accounts Analysis
  const totalAccountsBalance = data.accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  const savingsAccounts = data.accounts.filter(acc => acc.account_type === 'savings' || acc.account_type === 'investment');
  const totalSavings = savingsAccounts
    .filter(acc => !acc.exclude_from_stats)
    .reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  const savingsAccountsCount = savingsAccounts.length;
  
  // Análisis por cuenta bancaria
  const accountsWithActivity = data.accounts.map(account => {
    const accountBalance = parseFloat(account.balance || 0);
    const balanceStatus = accountBalance > 500 ? 'good' : accountBalance > 100 ? 'medium' : 'low';
    
    return {
      name: account.name,
      balance: accountBalance,
      balanceStatus,
      accountType: account.account_type || 'checking',
      excludedFromStats: account.exclude_from_stats || false
    };
  }).sort((a, b) => b.balance - a.balance);
  
  // Daily Average (corrected)
  const getDailyAvgExpense = () => {
    if (!data.summary.oldestTransactionDate || !data.summary.newestTransactionDate) return 0;
    const oldestDate = new Date(data.summary.oldestTransactionDate);
    const newestDate = new Date(data.summary.newestTransactionDate);
    const daysDiff = Math.max(1, Math.ceil((newestDate - oldestDate) / (1000 * 60 * 60 * 24)) + 1);
    return monthlyExpenses / daysDiff;
  };
  const dailyAvgExpense = getDailyAvgExpense();

  // Category analysis
  const categoryExpenses = data.summary.categories
    .filter(cat => cat.type === 'expense')
    .map(cat => ({
      name: cat.category,
      amount: parseFloat(cat.total),
      percentage: (parseFloat(cat.total) / monthlyExpenses * 100)
    }))
    .sort((a, b) => b.amount - a.amount);

  // Top 5 categories
  const topCategories = categoryExpenses.slice(0, 5);
  
  // Calculate annual projections (using expected income if available, otherwise actual)
  const monthlyIncomeForProjection = expectedIncome > 0 ? expectedIncome : actualIncome;
  const annualIncome = monthlyIncomeForProjection * 12;
  const annualExpenses = monthlyExpenses * 12;
  const annualSavings = annualIncome - annualExpenses;
  
  // Calculate savings rate for projections (using expected income)
  const projectedSavingsRate = monthlyIncomeForProjection > 0 ? ((annualSavings / annualIncome) * 100) : 0;

  // Evaluate financial health
  const getHealthStatus = (rate) => {
    if (rate >= 20) return { text: '💚 Excelente', color: 'text-green-600 dark:text-green-400' };
    if (rate >= 10) return { text: '💙 Bien', color: 'text-blue-600 dark:text-blue-400' };
    if (rate >= 0) return { text: '🟡 Mejorable', color: 'text-yellow-600 dark:text-yellow-400' };
    return { text: '🔴 Cuidado', color: 'text-red-600 dark:text-red-400' };
  };

  const healthStatus = getHealthStatus(savingsRate);

  // Emergency fund calculation (3-6 months of expenses)
  const emergencyFundTarget = monthlyExpenses * 5;
  const emergencyFundMonths = monthlyIncome > 0 ? (netBalance > 0 ? Math.floor(netBalance / monthlyExpenses) : 0) : 0;

  // Chat message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatError('');

    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }]);
    setChatLoading(true);

    try {
      const response = await sendAIChat(userMessage);
      
      // Add AI response to chat
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.response, 
        provider: response.provider,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to get AI response';
      setChatError(errorMessage);
      
      // Remove the user message if there was an error
      setChatMessages(prev => prev.slice(0, -1));
      
      // Re-add the message to the input
      setChatInput(userMessage);
    } finally {
      setChatLoading(false);
    }
  };

  const suggestedQuestions = [
    "¿Cómo puedo mejorar mi tasa de ahorro?",
    "¿En qué categorías gasto más?",
    "¿Qué consejo me das para mi situación financiera?",
    "¿Cuánto debería ahorrar para un fondo de emergencia?"
  ];

  return (
    <>
      {/* Side Panel Overlay */}
      {showChat && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setShowChat(false)}
        />
      )}

      {/* Side Panel */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Bot className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    Asistente Financiero AI
                    <Sparkles className="w-6 h-6" />
                  </h2>
                  <p className="text-purple-100 text-sm">
                    Pregúntame sobre tus finanzas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Error Message */}
            {chatError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-700">
                <p className="text-sm">{chatError}</p>
                {chatError.includes('No active AI configuration') && (
                  <p className="text-xs mt-2">
                    Ve a <strong>Configuración</strong> para añadir tus credenciales de AI.
                  </p>
                )}
              </div>
            )}

            {/* Suggested Questions (shown when no messages) */}
            {chatMessages.length === 0 && !chatLoading && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Preguntas sugeridas:</p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => setChatInput(question)}
                      className="p-3 text-left text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-700"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {chatMessages.length > 0 && (
              <div className="space-y-4">
                {chatMessages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start space-x-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.provider && (
                        <p className="text-xs mt-2 opacity-70">
                          Powered by {message.provider === 'openai' ? 'OpenAI' : message.provider === 'claude' ? 'Claude' : 'Gemini'}
                        </p>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {chatLoading && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-2xl">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input - Fixed at bottom */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-slate-800">
            <form onSubmit={handleSendMessage} className="space-y-3">
              <div className="flex space-x-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe tu pregunta financiera..."
                  className="flex-1 px-4 py-3 border-2 border-purple-200 dark:border-purple-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-gray-100"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                El asistente AI analiza tus datos financieros reales
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Floating AI Button */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center space-x-3 px-5 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-110 animate-pulse-slow"
        title="Abrir Asistente AI"
      >
        <Bot className="w-6 h-6" />
        <span className="font-semibold hidden sm:inline">Asistente AI</span>
        <Sparkles className="w-5 h-5" />
      </button>

      {/* Main Content - 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* 1. ESTADO FINANCIERO */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('financial')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors rounded-t-2xl"
        >
          <div className="flex items-center space-x-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">💰 Estado Financiero</h3>
          </div>
          {expandedSections.financial ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.financial && (
          <div className="px-6 pb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Concepto</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Monto (€)</th>
              </tr>
            </thead>
            <tbody>
              {expectedIncome > 0 && (
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    Ingreso esperado mensual
                    <span className="ml-2 text-xs text-gray-500">(configurado)</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-blue-600">€{expectedIncome.toFixed(2)}</td>
                </tr>
              )}
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                  Ingresos reales (mes actual)
                  {expectedIncome > 0 && (
                    <span className={`ml-2 text-xs font-semibold ${incomeRatio >= 100 ? 'text-green-600' : incomeRatio >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                      ({incomeRatio.toFixed(1)}% del esperado)
                    </span>
                  )}
                  <span className="ml-2 text-xs text-gray-500">({data.summary.currentMonth})</span>
                </td>
                <td className="py-3 px-4 text-sm text-right font-bold text-green-600">€{actualIncome.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                  Gastos totales
                  <span className="ml-2 text-xs text-gray-500">(€{dailyAvgExpense.toFixed(2)}/día)</span>
                </td>
                <td className="py-3 px-4 text-sm text-right font-bold text-red-600">€{monthlyExpenses.toFixed(2)}</td>
              </tr>
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-700">
                <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">Balance neto (transacciones)</td>
                <td className={`py-3 px-4 text-sm text-right font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{netBalance.toFixed(2)} ({savingsRate.toFixed(1)}%)
                </td>
              </tr>
              <tr className="bg-green-50 dark:bg-green-900/20 border-b-2 border-green-200 dark:border-green-700">
                <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                  Balance real en cuentas
                  <span className="ml-2 text-xs text-gray-500">({data.accounts.length} cuentas)</span>
                </td>
                <td className="py-3 px-4 text-sm text-right font-bold text-green-600">
                  €{totalAccountsBalance.toFixed(2)}
                </td>
              </tr>
              {totalSavings > 0 && (
                <tr className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-700">
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    💰 Ahorro en cuentas
                    <span className="ml-2 text-xs text-gray-500">({savingsAccountsCount} cuentas de ahorro)</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-emerald-600">
                    €{totalSavings.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={`mt-4 p-4 rounded-lg ${savingsRate >= 20 ? 'bg-green-50 dark:bg-green-900/20' : savingsRate >= 10 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
          <p className="text-sm mb-2">
            <span className="font-bold">💡 Evaluación:</span> {healthStatus.text} - {
              savingsRate >= 20 ? 'Posición sólida con margen de ahorro estable.' :
              savingsRate >= 10 ? 'Situación aceptable, pero hay margen de mejora.' :
              savingsRate >= 0 ? 'Deberías revisar y reducir gastos no esenciales.' :
              'Alerta: Gastas más de lo que ganas. Acción inmediata requerida.'
            }
          </p>
          {expectedIncome > 0 && incomeRatio < 100 && (
            <p className="text-sm mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
              <span className="font-bold">⚠️ Nota:</span> Tus ingresos reales ({incomeRatio.toFixed(1)}%) están por debajo del esperado. 
              {incomeRatio < 50 && ' Verifica que hayas importado todas las transacciones de ingreso.'}
            </p>
          )}
          {totalAccountsBalance > 0 && netBalance < 0 && (
            <p className="text-sm mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
              <span className="font-bold">💚 Nota positiva:</span> Aunque el balance de transacciones es negativo, tu balance real en cuentas es positivo (€{totalAccountsBalance.toFixed(2)}). Esto indica que tus cuentas están bien capitalizadas.
            </p>
          )}
        </div>
          </div>
        )}
      </div>

      {/* 2. ANÁLISIS DE TARJETAS DE CRÉDITO Y DEUDAS */}
      {(() => {
        const creditCards = data.accounts.filter(acc => acc.account_type === 'credit' && !acc.exclude_from_stats);
        
        if (creditCards.length === 0) return null;
        
        const totalDebt = creditCards.reduce((sum, card) => sum + Math.abs(parseFloat(card.balance || 0)), 0);
        const totalCreditLimit = creditCards.reduce((sum, card) => sum + parseFloat(card.credit_limit || 0), 0);
        const totalAvailableCredit = totalCreditLimit - totalDebt;
        const overallUtilization = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit * 100) : 0;
        
        // Debt to income ratio
        const debtToIncomeRatio = expectedIncome > 0 ? (totalDebt / expectedIncome * 100) : 0;
        
        // Calculate minimum payments (assuming 2% of balance or €25, whichever is higher)
        const minimumPayments = creditCards.reduce((sum, card) => {
          const debt = Math.abs(parseFloat(card.balance || 0));
          return sum + Math.max(debt * 0.02, 25);
        }, 0);
        
        // Interest cost estimation (assuming 20% APR)
        const monthlyInterestCost = totalDebt * (0.20 / 12);
        const annualInterestCost = totalDebt * 0.20;
        
        return (
          <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl shadow-lg border-2 border-red-200 dark:border-red-700">
            <button
              onClick={() => toggleSection('creditCards')}
              className="w-full p-4 flex items-center justify-between hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors rounded-t-2xl"
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">💳 Crédito & Deudas</h3>
              </div>
              {expandedSections.creditCards ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.creditCards && (
              <div className="px-6 pb-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-red-200 dark:border-red-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Deuda Total</p>
                <p className="text-2xl font-bold text-red-600">€{totalDebt.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">{creditCards.length} tarjeta{creditCards.length > 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Límite Total</p>
                <p className="text-2xl font-bold text-blue-600">€{totalCreditLimit.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Disponible: €{totalAvailableCredit.toFixed(2)}</p>
              </div>
              <div className={`rounded-xl p-4 border-2 ${overallUtilization < 30 ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : overallUtilization < 70 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Utilización</p>
                <p className={`text-2xl font-bold ${overallUtilization < 30 ? 'text-green-600' : overallUtilization < 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {overallUtilization.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {overallUtilization < 30 ? '✅ Excelente' : overallUtilization < 70 ? '⚠️ Revisar' : '🔴 Peligroso'}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-purple-200 dark:border-purple-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pago Mínimo</p>
                <p className="text-2xl font-bold text-purple-600">€{minimumPayments.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">/mes</p>
              </div>
            </div>

            {/* Detailed Analysis */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-4">
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">📊 Análisis por Tarjeta</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Tarjeta</th>
                      <th className="text-right py-3 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Deuda</th>
                      <th className="text-right py-3 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Límite</th>
                      <th className="text-right py-3 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Uso</th>
                      <th className="text-center py-3 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditCards.map((card, index) => {
                      const debt = Math.abs(parseFloat(card.balance || 0));
                      const limit = parseFloat(card.credit_limit || 0);
                      const utilization = limit > 0 ? (debt / limit * 100) : 0;
                      
                      return (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 px-2 text-sm font-medium text-gray-900 dark:text-gray-100">{card.name}</td>
                          <td className="py-3 px-2 text-sm text-right text-red-600 font-semibold">€{debt.toFixed(2)}</td>
                          <td className="py-3 px-2 text-sm text-right text-gray-900 dark:text-gray-100">€{limit.toFixed(0)}</td>
                          <td className="py-3 px-2 text-sm text-right font-semibold">{utilization.toFixed(1)}%</td>
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              utilization < 30 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              utilization < 70 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {utilization < 30 ? '✅ Bien' : utilization < 70 ? '⚠️ Alto' : '🔴 Crítico'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warnings & Recommendations */}
            <div className="space-y-3">
              {/* Utilization Warning */}
              {overallUtilization > 70 && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-sm font-bold text-red-800 dark:text-red-200">🔴 Alerta: Utilización Crítica</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Tu utilización del {overallUtilization.toFixed(1)}% es muy alta. Esto afecta negativamente tu score crediticio y aumenta el riesgo de sobreendeudamiento.
                  </p>
                </div>
              )}

              {/* Debt to Income Ratio */}
              {expectedIncome > 0 && debtToIncomeRatio > 50 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded">
                  <p className="text-sm font-bold text-orange-800 dark:text-orange-200">⚠️ Ratio Deuda/Ingreso Alto</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Tu deuda representa el {debtToIncomeRatio.toFixed(1)}% de tu ingreso mensual. Idealmente debería estar por debajo del 30%.
                  </p>
                </div>
              )}

              {/* Interest Cost Alert */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4 rounded">
                <p className="text-sm font-bold text-purple-800 dark:text-purple-200">💸 Costo de Intereses Estimado</p>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Con una tasa promedio del 20% APR, pagas aproximadamente <strong>€{monthlyInterestCost.toFixed(2)}/mes</strong> en intereses 
                  (€{annualInterestCost.toFixed(2)}/año). Pagar solo el mínimo perpetúa la deuda.
                </p>
              </div>

              {/* Recommendations */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">💡 Recomendaciones</p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                  {overallUtilization > 30 && (
                    <li>Reduce la utilización a menos del 30% para mejorar tu score crediticio</li>
                  )}
                  <li>Paga más que el mínimo (€{minimumPayments.toFixed(2)}) para reducir intereses</li>
                  <li>Considera pagar €{(minimumPayments * 2).toFixed(2)}/mes para salir de deuda más rápido</li>
                  {creditCards.length > 1 && (
                    <li>Usa la estrategia "avalancha" o "bola de nieve" para pagar las tarjetas estratégicamente</li>
                  )}
                  <li>Evita nuevos cargos mientras reduces el saldo</li>
                </ul>
              </div>

              {/* Payoff Projection */}
              {(() => {
                const doubleMinimum = minimumPayments * 2;
                const monthsToPayoff = totalDebt > 0 ? Math.ceil(totalDebt / doubleMinimum) : 0;
                const totalInterestPaid = (monthsToPayoff * monthlyInterestCost);
                
                return (
                  <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
                    <p className="text-sm font-bold text-green-800 dark:text-green-200">🎯 Proyección de Pago</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Si pagas <strong>€{doubleMinimum.toFixed(2)}/mes</strong> (el doble del mínimo), 
                      podrías estar libre de deuda en aproximadamente <strong>{monthsToPayoff} meses</strong>, 
                      pagando €{totalInterestPaid.toFixed(2)} en intereses.
                    </p>
                  </div>
                );
              })()}
            </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. GASTOS POR CATEGORÍA */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('expenses')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors rounded-t-2xl"
        >
          <div className="flex items-center space-x-2">
            <PieChart className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">📊 Gastos por Categoría</h3>
          </div>
          {expandedSections.expenses ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.expenses && (
          <div className="px-6 pb-6">

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Categoría</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Gasto (€)</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">% del total</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Evaluación</th>
              </tr>
            </thead>
            <tbody>
              {topCategories.map((cat, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">€{cat.amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">{cat.percentage.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      cat.percentage < 15 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      cat.percentage < 25 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {cat.percentage < 15 ? '🟢 Bien' : cat.percentage < 25 ? '🟡 Revisar' : '🔴 Alto'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </div>
        )}
      </div>

      {/* 4. PROYECCIONES & RECOMENDACIONES */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl shadow-lg border-2 border-indigo-200 dark:border-indigo-700">
        <button
          onClick={() => toggleSection('global')}
          className="w-full p-4 flex items-center justify-between hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors rounded-t-2xl"
        >
          <div className="flex items-center space-x-2">
            <Target className="w-6 h-6 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">🎯 Proyecciones & Metas</h3>
          </div>
          {expandedSections.global ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.global && (
          <div className="px-6 pb-6">

        {/* Capacidad de Gasto Actual */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-4 border-2 border-indigo-300 dark:border-indigo-600">
          <h4 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            ¿Cuánto puedes gastar este mes?
          </h4>
          
          {(() => {
            // Calcular capacidad de gasto
            const balanceDisponible = totalAccountsBalance;
            const gastoAcumulado = monthlyExpenses;
            const ingresoEsperadoPendiente = expectedIncome > 0 ? Math.max(0, expectedIncome - actualIncome) : 0;
            const presupuestoRestante = budgetTotal > 0 ? Math.max(0, budgetTotal - budgetSpent) : 0;
            const diasRestantesMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
            
            // Capacidad segura: balance - 20% cushion + ingreso pendiente
            const capacidadSegura = Math.max(0, (balanceDisponible * 0.8) + ingresoEsperadoPendiente);
            const gastoDiarioSeguro = capacidadSegura / Math.max(1, diasRestantesMes);
            
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Balance Total en Cuentas</p>
                    <p className="text-2xl font-bold text-blue-600">€{balanceDisponible.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ingreso Esperado Pendiente</p>
                    <p className="text-2xl font-bold text-purple-600">€{ingresoEsperadoPendiente.toFixed(2)}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${capacidadSegura > 1000 ? 'bg-green-50 dark:bg-green-900/30' : capacidadSegura > 500 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Capacidad de Gasto Segura</p>
                    <p className={`text-2xl font-bold ${capacidadSegura > 1000 ? 'text-green-600' : capacidadSegura > 500 ? 'text-amber-600' : 'text-red-600'}`}>
                      €{capacidadSegura.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    💡 Recomendación:
                  </p>
                  <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                    Puedes gastar hasta €{gastoDiarioSeguro.toFixed(2)}/día de forma segura
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    (Basado en {diasRestantesMes} días restantes del mes, manteniendo un colchón del 20%)
                  </p>
                </div>
              </>
            );
          })()}
        </div>

        {/* Análisis de Situación */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-4 border-2 border-purple-300 dark:border-purple-600">
          <h4 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-3">
            📊 Análisis de tu Situación
          </h4>
          
          <div className="space-y-3">
            {/* Income Status */}
            {expectedIncome > 0 && (
              <div className={`p-3 rounded-lg border-l-4 ${incomeRatio >= 100 ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : incomeRatio >= 75 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {incomeRatio >= 100 ? '✅ Ingresos al día' : incomeRatio >= 75 ? '⚠️ Ingresos por debajo de lo esperado' : '🔴 Ingresos muy bajos'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Has recibido €{actualIncome.toFixed(2)} de €{expectedIncome.toFixed(2)} esperados ({incomeRatio.toFixed(1)}%)
                  {incomeRatio < 100 && ' - Considera reducir gastos hasta recibir el resto'}
                </p>
              </div>
            )}

            {/* Budget Status */}
            {budgetTotal > 0 && (
              <div className={`p-3 rounded-lg border-l-4 ${budgetUsage < 80 ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : budgetUsage < 100 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {budgetUsage < 80 ? '✅ Presupuesto bajo control' : budgetUsage < 100 ? '⚠️ Acercándote al límite del presupuesto' : '🔴 Presupuesto superado'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Has gastado €{budgetSpent.toFixed(2)} de €{budgetTotal.toFixed(2)} ({budgetUsage.toFixed(1)}%)
                  {budgetUsage > 80 && budgetUsage < 100 && ` - Quedan €${(budgetTotal - budgetSpent).toFixed(2)} disponibles`}
                  {budgetUsage >= 100 && ` - Sobrepasado por €${(budgetSpent - budgetTotal).toFixed(2)}`}
                </p>
                {daysRemaining > 0 && (
                  <div className={`mt-2 pt-2 border-t ${budgetUsage < 80 ? 'border-green-200 dark:border-green-700' : budgetUsage < 100 ? 'border-amber-200 dark:border-amber-700' : 'border-red-200 dark:border-red-700'}`}>
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      📊 Predicción fin de mes:
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Al ritmo actual (€{dailySpendRate.toFixed(2)}/día), terminarás gastando €{projectedMonthEndSpend.toFixed(2)} ({projectedBudgetUsage.toFixed(1)}%)
                      {projectedBudgetUsage > 100 && (
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                          {' '}⚠️ Te sobrepasarás por €{(projectedMonthEndSpend - budgetTotal).toFixed(2)}
                        </span>
                      )}
                      {projectedBudgetUsage <= 100 && projectedBudgetUsage > 90 && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {' '}⚠️ Estarás muy cerca del límite
                        </span>
                      )}
                      {projectedBudgetUsage <= 90 && (
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {' '}✅ Dentro del presupuesto
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {daysRemaining} días restantes del mes
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Savings Status */}
            <div className={`p-3 rounded-lg border-l-4 ${totalSavings > 1000 ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : totalSavings > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {totalSavings > 1000 ? '✅ Buen colchón de ahorro' : totalSavings > 0 ? '⚠️ Ahorro bajo' : '🔴 Sin ahorro acumulado'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Tienes €{totalSavings.toFixed(2)} en cuentas de ahorro
                {totalSavings < 1000 && ' - Intenta ahorrar al menos €50/mes'}
                {totalSavings >= 1000 && ' - Continúa así, vas por buen camino'}
              </p>
            </div>
          </div>
        </div>

        {/* Estado por Cuenta Bancaria */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-4 border-2 border-blue-300 dark:border-blue-600">
          <h4 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            🏦 Estado por Cuenta Bancaria
          </h4>
          
          <div className="space-y-3">
            {accountsWithActivity.map((account, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border-l-4 ${
                  account.balanceStatus === 'good' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 
                  account.balanceStatus === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500' : 
                  'bg-red-50 dark:bg-red-900/20 border-red-500'
                } ${account.excludedFromStats ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {account.balanceStatus === 'good' ? '✅' : account.balanceStatus === 'medium' ? '⚠️' : '🔴'}
                    {account.name}
                    {account.excludedFromStats && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                        excluida
                      </span>
                    )}
                  </p>
                  <p className={`text-sm font-bold ${
                    account.balanceStatus === 'good' ? 'text-green-600 dark:text-green-400' : 
                    account.balanceStatus === 'medium' ? 'text-amber-600 dark:text-amber-400' : 
                    'text-red-600 dark:text-red-400'
                  }`}>
                    €{account.balance.toFixed(2)}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {account.accountType === 'savings' && '💰 Cuenta de ahorro'}
                  {account.accountType === 'investment' && '📈 Cuenta de inversión'}
                  {account.accountType === 'checking' && '🏦 Cuenta corriente'}
                  {account.accountType === 'credit' && '💳 Tarjeta de crédito'}
                  {!account.accountType && '🏦 Cuenta bancaria'}
                  {' • '}
                  {account.balanceStatus === 'good' && 'Balance saludable'}
                  {account.balanceStatus === 'medium' && 'Balance bajo, considera transferir fondos'}
                  {account.balanceStatus === 'low' && 'Balance crítico, necesitas ingresar dinero'}
                </p>
              </div>
            ))}
            
            {accountsWithActivity.length === 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No hay cuentas bancarias registradas
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones Recomendadas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-green-300 dark:border-green-600">
          <h4 className="text-lg font-bold text-green-900 dark:text-green-100 mb-3">
            ✅ Acciones Recomendadas
          </h4>
          
          <ul className="space-y-2">
            {(() => {
              const actions = [];
              
              // Si gastos > expected income
              if (monthlyExpenses > monthlyIncomeForProjection) {
                actions.push({
                  priority: 'high',
                  text: `Reduce gastos urgentemente. Estás gastando €${(monthlyExpenses - monthlyIncomeForProjection).toFixed(2)} más de lo que ganas.`,
                  categories: topCategories.slice(0, 2).map(c => c.name).join(' y ')
                });
              }
              
              // Si budget está sobrepasado
              if (budgetUsage >= 100) {
                actions.push({
                  priority: 'high',
                  text: `Presupuesto sobrepasado por €${(budgetSpent - budgetTotal).toFixed(2)}. Evita gastos no esenciales.`
                });
              }
              
              // Si budget está al límite
              if (budgetUsage > 90 && budgetUsage < 100) {
                actions.push({
                  priority: 'medium',
                  text: `Frena gastos ya. Solo quedan €${(budgetTotal - budgetSpent).toFixed(2)} de presupuesto este mes.`
                });
              }
              
              // Si la predicción muestra que se sobrepasará
              if (budgetUsage < 100 && projectedBudgetUsage > 100 && daysRemaining > 0) {
                actions.push({
                  priority: 'medium',
                  text: `Al ritmo actual (€${dailySpendRate.toFixed(2)}/día), te sobrepasarás €${(projectedMonthEndSpend - budgetTotal).toFixed(2)} del presupuesto. Reduce el gasto diario.`
                });
              }
              
              // Si income ratio bajo
              if (expectedIncome > 0 && incomeRatio < 75) {
                actions.push({
                  priority: 'medium',
                  text: `Espera a recibir más ingresos antes de gastos grandes (falta €${(expectedIncome - actualIncome).toFixed(2)}).`
                });
              }
              
              // Si balance bajo
              if (totalAccountsBalance < 1000) {
                actions.push({
                  priority: 'high',
                  text: `Tu balance en cuentas es bajo (€${totalAccountsBalance.toFixed(2)}). Evita gastos no esenciales.`
                });
              }
              
              // Si no hay ahorro
              if (totalSavings < 500) {
                actions.push({
                  priority: 'low',
                  text: `Intenta ahorrar al menos el 10% de tus ingresos (€${(monthlyIncomeForProjection * 0.1).toFixed(2)}/mes).`
                });
              }
              
              // Si puede ahorrar
              if (monthlyIncomeForProjection > monthlyExpenses && totalAccountsBalance > 2000) {
                actions.push({
                  priority: 'low',
                  text: `Tienes margen para ahorrar €${(monthlyIncomeForProjection - monthlyExpenses).toFixed(2)}/mes. ¡Aprovéchalo!`
                });
              }
              
              // Revisar top category
              if (topCategories.length > 0 && topCategories[0].percentage > 30) {
                actions.push({
                  priority: 'medium',
                  text: `Revisa "${topCategories[0].name}" (${topCategories[0].percentage.toFixed(1)}% de tus gastos). Busca formas de reducir.`
                });
              }
              
              return actions.map((action, idx) => (
                <li key={idx} className={`flex items-start space-x-2 p-2 rounded ${
                  action.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20' : 
                  action.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20' : 
                  'bg-green-50 dark:bg-green-900/20'
                }`}>
                  <span className={`mt-0.5 ${
                    action.priority === 'high' ? 'text-red-600' : 
                    action.priority === 'medium' ? 'text-amber-600' : 
                    'text-green-600'
                  }`}>
                    {action.priority === 'high' ? '🔴' : action.priority === 'medium' ? '🟡' : '💚'}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {action.text}
                  </span>
                </li>
              ));
            })()}
          </ul>
        </div>
        </div>
        )}
      </div>
      </div>
    </>
  );
}

export default Insights;


