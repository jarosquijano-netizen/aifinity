import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, Info, Loader, DollarSign, PieChart, Target, Shield, Calendar, MessageCircle, Send, Bot, User, Sparkles, X, Building2, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, CreditCard } from 'lucide-react';
import { getSummary, getBudgetOverview, getTrends, sendAIChat, getAIChatHistory, getAccounts, getSettings } from '../utils/api';
import api from '../utils/api';

function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chatbot state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

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

  // Chat message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatError('');

    setChatMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }]);
    setChatLoading(true);

    try {
      const response = await sendAIChat(userMessage);
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.response, 
        provider: response.provider,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to get AI response';
      setChatError(errorMessage);
      setChatMessages(prev => prev.slice(0, -1));
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
        <p className="text-red-600 dark:text-red-400">{error || 'No data available'}</p>
      </div>
    );
  }

  // Calculate financial metrics
  const actualIncome = data.summary.actualIncome || 0;
  const actualExpenses = data.summary.actualExpenses !== undefined ? data.summary.actualExpenses : (data.summary.totalExpenses || 0);
  const actualNetBalance = actualIncome - actualExpenses;
  const monthlyExpenses = actualExpenses;
  const netBalance = actualNetBalance;
  const savingsRate = actualIncome > 0 ? ((actualNetBalance / actualIncome) * 100) : 0;
  const budgetTotal = data.budget.totals?.budget || 0;
  const budgetSpent = data.budget.totals?.spent || 0;
  const budgetUsage = budgetTotal > 0 ? (budgetSpent / budgetTotal * 100) : 0;
  
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - currentDay;
  const daysElapsed = currentDay;
  
  const expectedDailyAverage = budgetTotal > 0 ? (budgetTotal / daysInMonth) : 0;
  const currentDailyAverage = daysElapsed > 0 ? (budgetSpent / daysElapsed) : 0;
  
  let dailySpendRate;
  if (daysElapsed <= 7 || currentDailyAverage > expectedDailyAverage * 1.5) {
    dailySpendRate = expectedDailyAverage;
    if (currentDailyAverage > expectedDailyAverage * 2) {
      dailySpendRate = expectedDailyAverage * 0.7;
    }
  } else {
    dailySpendRate = currentDailyAverage;
  }
  
  dailySpendRate = Math.max(expectedDailyAverage * 0.5, Math.min(dailySpendRate, expectedDailyAverage * 1.2));
  
  const projectedMonthEndSpend = budgetSpent + (dailySpendRate * daysRemaining);
  const projectedBudgetUsage = budgetTotal > 0 ? (projectedMonthEndSpend / budgetTotal * 100) : 0;
  
  const expectedIncome = data.expectedIncome || 0;
  const incomeRatio = expectedIncome > 0 ? (actualIncome / expectedIncome * 100) : 0;
  
  const totalAccountsBalance = data.accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  const savingsAccounts = data.accounts.filter(acc => acc.account_type === 'savings' || acc.account_type === 'investment');
  const totalSavings = savingsAccounts
    .filter(acc => !acc.exclude_from_stats)
    .reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  
  const dailyAvgExpense = monthlyExpenses / Math.max(1, daysElapsed);

  const categoryExpenses = data.summary.categories
    .filter(cat => cat.type === 'expense')
    .map(cat => ({
      name: cat.category,
      amount: parseFloat(cat.total),
      percentage: monthlyExpenses > 0 ? (parseFloat(cat.total) / monthlyExpenses * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategories = categoryExpenses.slice(0, 5);

  const creditCards = data.accounts.filter(acc => acc.account_type === 'credit' && !acc.exclude_from_stats);
  const totalDebt = creditCards.reduce((sum, card) => sum + Math.abs(parseFloat(card.balance || 0)), 0);
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + parseFloat(card.credit_limit || 0), 0);
  const totalAvailableCredit = totalCreditLimit - totalDebt;
  const overallUtilization = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit * 100) : 0;
  const minimumPayments = creditCards.reduce((sum, card) => {
    const debt = Math.abs(parseFloat(card.balance || 0));
    return sum + Math.max(debt * 0.02, 25);
  }, 0);
  const monthlyInterestCost = totalDebt * (0.20 / 12);
  const annualInterestCost = totalDebt * 0.20;

  const balanceDisponible = totalAccountsBalance;
  const ingresoEsperadoPendiente = expectedIncome > 0 ? Math.max(0, expectedIncome - actualIncome) : 0;
  const diasRestantesMes = daysRemaining;
  const capacidadSegura = Math.max(0, (balanceDisponible * 0.8) + ingresoEsperadoPendiente);
  const gastoDiarioSeguro = capacidadSegura / Math.max(1, diasRestantesMes);

  // Progress bar component
  const ProgressBar = ({ value, className = "" }) => (
    <div className={`relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div 
        className="h-full transition-all duration-500 rounded-full"
        style={{ 
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: value < 30 ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' :
                       value < 70 ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' :
                       'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
        }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 mb-6">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Financial Insights</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">AI-powered analysis of your financial data</p>
            </div>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" />
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Update Insights
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Spending Capacity Section */}
        <section className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-br from-purple-50/50 dark:from-purple-900/10 to-transparent">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">¿Cuánto puedes gastar este mes?</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Balance Total en Cuentas</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">€{balanceDisponible.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ingreso Esperado Pendiente</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">€{ingresoEsperadoPendiente.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Capacidad de Gasto Segura</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">€{capacidadSegura.toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-700 p-4">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Recomendación:</p>
                    <p className="text-gray-900 dark:text-gray-100">
                      Puedes gastar hasta <span className="font-bold text-purple-600 dark:text-purple-400">€{gastoDiarioSeguro.toFixed(2)}/día</span> de forma segura
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      (Basado en {diasRestantesMes} días restantes del mes, manteniendo un colchón del 20%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Financial Status */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Estado Financiero</h2>
                </div>
                <div className="space-y-4">
                  {expectedIncome > 0 && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Ingreso esperado mensual <span className="text-xs">(configurado)</span>
                      </span>
                      <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">€{expectedIncome.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ingresos reales (mes actual)</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        incomeRatio >= 100 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700' 
                          : incomeRatio >= 75
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700'
                      }`}>
                        {incomeRatio.toFixed(1)}% del esperado
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">€{actualIncome.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Gastos totales <span className="text-xs">(€{dailyAvgExpense.toFixed(2)}/día)</span>
                    </span>
                    <span className="text-lg font-semibold text-red-600 dark:text-red-400">€{monthlyExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Balance neto (transacciones)</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        netBalance >= 0
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700'
                      }`}>
                        {savingsRate.toFixed(1)}%
                      </span>
                    </div>
                    <span className={`text-xl font-bold ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      €{netBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Balance real en cuentas <span className="text-xs">({data.accounts.length} cuentas)</span>
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">€{totalAccountsBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ahorro en cuentas</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">({savingsAccounts.length} cuentas de ahorro)</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">€{totalSavings.toFixed(2)}</span>
                  </div>

                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className={`font-semibold ${
                          savingsRate >= 20 ? 'text-emerald-900 dark:text-emerald-100' :
                          savingsRate >= 10 ? 'text-blue-900 dark:text-blue-100' :
                          savingsRate >= 0 ? 'text-amber-900 dark:text-amber-100' :
                          'text-red-900 dark:text-red-100'
                        }`}>
                          Evaluación: {savingsRate >= 20 ? 'Excelente' : savingsRate >= 10 ? 'Bien' : savingsRate >= 0 ? 'Mejorable' : 'Cuidado'}
                        </p>
                        <p className={`text-sm mt-1 ${
                          savingsRate >= 20 ? 'text-emerald-800 dark:text-emerald-200' :
                          savingsRate >= 10 ? 'text-blue-800 dark:text-blue-200' :
                          savingsRate >= 0 ? 'text-amber-800 dark:text-amber-200' :
                          'text-red-800 dark:text-red-200'
                        }`}>
                          {savingsRate >= 20 ? 'Posición sólida con margen de ahorro estable.' :
                           savingsRate >= 10 ? 'Situación aceptable, pero hay margen de mejora.' :
                           savingsRate >= 0 ? 'Deberías revisar y reducir gastos no esenciales.' :
                           'Alerta: Gastas más de lo que ganas. Acción inmediata requerida.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spending by Category */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <PieChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gastos por Categoría</h2>
                </div>
                <div className="space-y-4">
                  {topCategories.map((item) => {
                    const statusColor = item.percentage < 15 ? 'success' : item.percentage < 25 ? 'warning' : 'destructive';
                    return (
                      <div key={item.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">€{item.amount.toFixed(2)}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{item.percentage.toFixed(1)}%</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusColor === 'success'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800'
                                : statusColor === 'warning'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800'
                                : 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
                            }`}>
                              {statusColor === 'success' ? 'Bien' : statusColor === 'warning' ? 'Revisar' : 'Alto'}
                            </span>
                          </div>
                        </div>
                        <ProgressBar value={item.percentage} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card Analysis */}
            {creditCards.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Análisis por Tarjeta</h2>
                  </div>
                  <div className="space-y-3">
                    {creditCards.map((card) => {
                      const debt = Math.abs(parseFloat(card.balance || 0));
                      const limit = parseFloat(card.credit_limit || 0);
                      const usage = limit > 0 ? (debt / limit * 100) : 0;
                      const statusColor = usage < 30 ? 'success' : usage < 70 ? 'warning' : 'destructive';
                      return (
                        <div key={card.name} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{card.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusColor === 'success'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800'
                                : statusColor === 'warning'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800'
                                : 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
                            }`}>
                              {statusColor === 'success' ? 'Bien' : statusColor === 'warning' ? 'Revisar' : 'Alto'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Deuda</p>
                              <p className="font-semibold text-red-600 dark:text-red-400">€{debt.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Límite</p>
                              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">€{limit.toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Uso</p>
                              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{usage.toFixed(1)}%</p>
                            </div>
                          </div>
                          <ProgressBar value={usage} className="mt-3" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Situation Analysis */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-emerald-200 dark:border-emerald-700">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Análisis de tu Situación</h2>
                </div>
                <div className="space-y-4">
                  {expectedIncome > 0 && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">Ingresos al día</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Has recibido €{actualIncome.toFixed(2)} de €{expectedIncome.toFixed(2)} esperados ({incomeRatio.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {budgetTotal > 0 && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">Presupuesto bajo control</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Has gastado €{budgetSpent.toFixed(2)} de €{budgetTotal.toFixed(2)} ({budgetUsage.toFixed(1)}%)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {budgetTotal > 0 && daysRemaining > 0 && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">Predicción fin de mes:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Al ritmo actual (€{dailySpendRate.toFixed(2)}/día), terminarás gastando €{projectedMonthEndSpend.toFixed(2)} ({projectedBudgetUsage.toFixed(1)}%)
                          </p>
                          {projectedBudgetUsage > 100 && (
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mt-2">
                              ⚠️ Te sobrepasarás por €{(projectedMonthEndSpend - budgetTotal).toFixed(2)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{daysRemaining} días restantes del mes</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
                    <div className="flex items-start gap-3">
                      <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">Ahorro bajo</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Tienes €{totalSavings.toFixed(2)} en cuentas de ahorro - Intenta ahorrar al menos €50/mes
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credit Summary */}
            {creditCards.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-amber-200 dark:border-amber-700">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Resumen de Crédito</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10 p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Deuda Total</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">€{totalDebt.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{creditCards.length} tarjetas</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Límite Total</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">€{totalCreditLimit.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Disponible: €{totalAvailableCredit.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Utilización</p>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{overallUtilization.toFixed(1)}%</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border mt-1 inline-block ${
                        overallUtilization < 30
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800'
                          : overallUtilization < 70
                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800'
                          : 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
                      }`}>
                        {overallUtilization < 30 ? 'Excelente' : overallUtilization < 70 ? 'Revisar' : 'Alto'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pago Mínimo</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">€{minimumPayments.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">/mes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Recommendations & Projections */}
            {creditCards.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-purple-200 dark:border-purple-700">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recomendaciones AI</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-700 p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Costo de Intereses Estimado</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Con una tasa promedio del 20% APR, pagas aproximadamente{" "}
                            <span className="font-bold text-purple-600 dark:text-purple-400">€{monthlyInterestCost.toFixed(2)}/mes</span> en intereses (€{annualInterestCost.toFixed(2)}/año). Pagar
                            solo el mínimo perpetúa la deuda.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Recomendaciones</p>
                          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>Reducir la utilización a menos del 30% para mejorar tu score crediticio</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>Paga más del mínimo (€{minimumPayments.toFixed(2)}) para reducir intereses</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>Considera pagar €{(minimumPayments * 2).toFixed(2)}/mes para salir de deuda más rápido</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>
                                Usa la estrategia "avalancha" o "bola de nieve" para pagar las tarjetas estratégicamente
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>Evita nuevos cargos mientras reduces el saldo</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const doubleMinimum = minimumPayments * 2;
                      const monthsToPayoff = totalDebt > 0 ? Math.ceil(totalDebt / doubleMinimum) : 0;
                      const totalInterestPaid = (monthsToPayoff * monthlyInterestCost);
                      
                      return (
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 p-4">
                          <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Proyección de Pago</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Si pagas <span className="font-bold text-emerald-700 dark:text-emerald-400">€{doubleMinimum.toFixed(2)}/mes</span>{" "}
                                (el doble del mínimo), podrías estar libre de deuda en aproximadamente{" "}
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">{monthsToPayoff} meses</span>, pagando{" "}
                                <span className="font-bold">€{totalInterestPaid.toFixed(2)}</span> en intereses.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Assistant Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setShowChat(true)}
          className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        >
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold hidden sm:inline">Asistente AI</span>
          <Bot className="h-5 w-5" />
        </button>
      </div>

      {/* Chat Side Panel */}
      {showChat && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setShowChat(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
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

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-700">
                    <p className="text-sm">{chatError}</p>
                  </div>
                )}

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
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>

                        {message.role === 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}

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
        </>
      )}
    </div>
  );
}

export default Insights;
