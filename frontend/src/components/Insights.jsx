import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, Info, Loader, DollarSign, PieChart, Target, Shield, Calendar, MessageCircle, Send, Bot, User, Sparkles, X, Building2, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, CreditCard, RotateCcw } from 'lucide-react';
import { getSummary, getBudgetOverview, getTrends, sendAIChat, getAIChatHistory, getAccounts, getSettings, findDuplicateTransactions, deleteDuplicateTransactions } from '../utils/api';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t, language } = useLanguage();

  // Chatbot state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatTimePeriod, setChatTimePeriod] = useState('all'); // 'all', 'day', 'week', 'month', 'year'
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const chatWasOpenRef = useRef(false); // Track if chat was previously open

  // Minimum payment calculator state
  const [customMinimumPayments, setCustomMinimumPayments] = useState({});
  
  // Duplicate detection state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Clear chat messages when opening the chat panel (fresh start every time)
  // Only clear when chat changes from closed to open, not on every render
  useEffect(() => {
    if (showChat && !chatWasOpenRef.current) {
      // Chat is opening for the first time - clear all messages
      setChatMessages([]);
      setChatError('');
      setChatInput('');
      chatWasOpenRef.current = true;
      // Focus input when chat opens
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    } else if (!showChat && chatWasOpenRef.current) {
      // Chat is closing - reset the flag so next open will clear
      chatWasOpenRef.current = false;
    }
  }, [showChat]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (showChat && chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  const handleCheckDuplicates = async () => {
    if (!data || !data.accounts) return;
    
    setCheckingDuplicates(true);
    setDuplicateInfo(null);
    
    try {
      // Find checking account (Sabadell JAXO)
      const checkingAccount = data.accounts.find(acc => 
        acc.name && 
        acc.name.toUpperCase().includes('JAXO') && 
        !acc.name.toUpperCase().includes('AHORRO') &&
        acc.account_type !== 'credit'
      );
      
      if (!checkingAccount) {
        alert('No se encontró la cuenta corriente Sabadell JAXO');
        setCheckingDuplicates(false);
        return;
      }
      
      // Find credit cards that might have duplicates
      const creditCards = data.accounts.filter(acc => acc.account_type === 'credit');
      
      if (creditCards.length === 0) {
        alert('No se encontraron tarjetas de crédito');
        setCheckingDuplicates(false);
        return;
      }
      
      // Check duplicates with each credit card
      const duplicatesFound = [];
      for (const card of creditCards) {
        try {
          const result = await findDuplicateTransactions(checkingAccount.id, card.id);
          if (result.count > 0) {
            duplicatesFound.push({
              card: card,
              checkingAccount: checkingAccount,
              count: result.count,
              duplicates: result.duplicates
            });
          }
        } catch (err) {
          console.error(`Error checking duplicates for ${card.name}:`, err);
        }
      }
      
      if (duplicatesFound.length === 0) {
        alert('✅ No se encontraron transacciones duplicadas');
        setDuplicateInfo(null);
      } else {
        setDuplicateInfo(duplicatesFound);
        // Show alert with option to delete
        const totalDuplicates = duplicatesFound.reduce((sum, d) => sum + d.count, 0);
        const confirmDelete = window.confirm(
          `Se encontraron ${totalDuplicates} transacciones duplicadas entre la cuenta corriente y las tarjetas de crédito.\n\n` +
          `¿Quieres eliminar las duplicadas de la cuenta corriente y mantener las de las tarjetas de crédito?`
        );
        
        if (confirmDelete) {
          await handleDeleteDuplicates(duplicatesFound);
        }
      }
    } catch (err) {
      console.error('Error checking duplicates:', err);
      alert('Error al buscar duplicados: ' + (err.message || 'Error desconocido'));
    } finally {
      setCheckingDuplicates(false);
    }
  };
  
  const handleDeleteDuplicates = async (duplicatesFound) => {
    try {
      setCheckingDuplicates(true);
      let totalDeleted = 0;
      const errors = [];
      
      for (const dup of duplicatesFound) {
        try {
          const checkingId = parseInt(dup.checkingAccount.id);
          const cardId = parseInt(dup.card.id);
          
          console.log(`🗑️ Deleting duplicates:`, {
            fromAccount: { id: checkingId, name: dup.checkingAccount.name, type: dup.checkingAccount.account_type },
            toAccount: { id: cardId, name: dup.card.name, type: dup.card.account_type },
            count: dup.count
          });
          
          if (isNaN(checkingId) || isNaN(cardId)) {
            throw new Error(`Invalid account IDs: checking=${checkingId}, card=${cardId}`);
          }
          
          const result = await deleteDuplicateTransactions(checkingId, cardId);
          console.log(`✅ Deleted ${result.deleted} duplicates for ${dup.card.name}`, result);
          totalDeleted += result.deleted || 0;
        } catch (err) {
          console.error(`❌ Error deleting duplicates for ${dup.card.name}:`, err);
          console.error(`❌ Error details:`, {
            response: err.response?.data,
            status: err.response?.status,
            message: err.message,
            stack: err.stack
          });
          const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido';
          errors.push(`${dup.card.name}: ${errorMsg}`);
        }
      }
      
      if (errors.length > 0) {
        alert(`⚠️ Se eliminaron ${totalDeleted} transacciones duplicadas, pero hubo errores:\n\n${errors.join('\n')}\n\nRevisa la consola para más detalles.`);
      } else if (totalDeleted > 0) {
        alert(`✅ Se eliminaron ${totalDeleted} transacciones duplicadas de la cuenta corriente.\n\nLas transacciones se mantienen en las tarjetas de crédito correctas.`);
      } else {
        alert(`ℹ️ No se eliminaron transacciones. Puede que ya no existan duplicados.`);
      }
      
      // Refresh data
      await fetchAllData();
      setDuplicateInfo(null);
    } catch (err) {
      console.error('Error deleting duplicates:', err);
      console.error('Error details:', {
        response: err.response?.data,
        status: err.response?.status,
        message: err.message
      });
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido';
      alert('Error al eliminar duplicados: ' + errorMsg + '\n\nRevisa la consola para más detalles.');
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      console.log('🔄 Fetching all data for Insights...');
      
      const [summary, budget, trends, accountsData, settingsResponse] = await Promise.all([
        getSummary(),
        api.get(`/budget/overview?month=${currentMonth}`).catch(() => ({ data: { totals: { budget: 0, spent: 0 }, categories: [] } })),
        getTrends(),
        getAccounts().catch(() => ({ accounts: [] })),
        getSettings().catch(() => ({ expectedMonthlyIncome: 0 }))
      ]);

      console.log('📊 Summary data:', {
        actualIncome: summary?.actualIncome,
        actualExpenses: summary?.actualExpenses,
        actualNetBalance: summary?.actualNetBalance
      });
      
      console.log('💳 Accounts data:', accountsData.accounts?.map(acc => ({
        name: acc.name,
        type: acc.account_type,
        balance: acc.balance,
        credit_limit: acc.credit_limit,
        creditLimit: acc.creditLimit
      })));
      
      // Extract expectedMonthlyIncome from settings response
      // settingsResponse should be an object with expectedMonthlyIncome property
      // The API returns: { expectedMonthlyIncome: number, familySize: number, location: string, ages: array }
      const expectedIncome = settingsResponse && typeof settingsResponse === 'object' && 'expectedMonthlyIncome' in settingsResponse
        ? parseFloat(settingsResponse.expectedMonthlyIncome || 0)
        : 0;
      
      console.log('💰 Settings from API:', {
        settingsResponse,
        expectedMonthlyIncome: expectedIncome,
        type: typeof settingsResponse,
        hasProperty: settingsResponse && 'expectedMonthlyIncome' in settingsResponse
      });

      const accounts = accountsData.accounts || [];
      
      // Ensure credit_limit is properly set (check both credit_limit and creditLimit)
      const normalizedAccounts = accounts.map(acc => ({
        ...acc,
        credit_limit: acc.credit_limit || acc.creditLimit || null,
        balance: parseFloat(acc.balance || 0)
      }));

      setData({
        summary,
        budget: budget.data,
        trends: trends,
        accounts: normalizedAccounts,
        expectedIncome: expectedIncome
      });
      
      console.log('✅ Data loaded successfully');
      console.log('📊 Final data state:', {
        expectedIncome: expectedIncome,
        accountsCount: normalizedAccounts.length,
        totalBalance: normalizedAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0),
        accounts: normalizedAccounts.map(acc => ({
          name: acc.name,
          balance: acc.balance,
          exclude_from_stats: acc.exclude_from_stats
        }))
      });
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load financial data';
      setError(errorMessage);
      console.error('❌ Error loading data:', err);
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
      const response = await sendAIChat(userMessage, chatTimePeriod === 'all' ? null : chatTimePeriod, language);
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.response, 
        provider: response.provider,
        suggestions: response.suggestions || [],
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
    language === 'es' ? '¿Cómo puedo mejorar mi tasa de ahorro?' : 'How can I improve my savings rate?',
    language === 'es' ? '¿En qué categorías gasto más?' : 'What categories do I spend the most in?',
    language === 'es' ? '¿Qué consejo me das para mi situación financiera?' : 'What advice do you have for my financial situation?',
    language === 'es' ? '¿Cuánto debería ahorrar para un fondo de emergencia?' : 'How much should I save for an emergency fund?'
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
  // Calculate total budget the same way as Budget.jsx
  // Sum all categories with budget (excluding transfers and parent categories)
  const calculateTotalBudget = () => {
    if (!data.budget?.categories) return 0;
    
    const excludedCategories = [
      'Finanzas > Transferencias',
      'Transferencias',
      'NC',
      'nc'
    ];
    
    // Helper function to check if a category is a parent
    const isParentCategory = (categoryName, allCategories) => {
      if (!categoryName || categoryName.includes(' > ')) {
        return false; // Hierarchical categories are not parents
      }
      // Check if any category starts with this category name + " > "
      return allCategories.some(cat => cat.category && cat.category.startsWith(categoryName + ' > '));
    };
    
    // Filter out excluded categories and parent categories
    const validCategories = data.budget.categories.filter(cat => {
      const catName = cat.category || cat.name;
      // Exclude transfers and NC
      if (excludedCategories.includes(catName)) {
        return false;
      }
      // Exclude parent categories that have children
      if (isParentCategory(catName, data.budget.categories)) {
        return false;
      }
      // Only include categories with budgets
      return (cat.budget || 0) > 0;
    });
    
    // Separate annual and monthly budgets
    const monthlyBudget = validCategories
      .filter(cat => !cat.is_annual)
      .reduce((sum, cat) => sum + (cat.budget || 0), 0);
    
    // For annual categories, budget is the annual amount, so divide by 12 for monthly equivalent
    const annualBudgetMonthlyEquivalent = validCategories
      .filter(cat => cat.is_annual)
      .reduce((sum, cat) => sum + ((cat.budget || 0) / 12), 0);
    
    const totalBudget = monthlyBudget + annualBudgetMonthlyEquivalent;
    
    console.log('💰 Budget Calculation (same as Budget.jsx):', {
      validCategoriesCount: validCategories.length,
      monthlyBudget,
      annualBudgetMonthlyEquivalent,
      totalBudget
    });
    
    return totalBudget;
  };
  
  const budgetTotal = calculateTotalBudget();
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
  
  // Calculate total balance - include ALL accounts (same as Dashboard)
  // This shows the real total balance across all accounts for transparency
  const totalAccountsBalance = data.accounts.reduce((sum, acc) => {
    const balance = parseFloat(acc.balance || 0);
    return sum + balance;
  }, 0);
  
  // For savings calculation, still exclude accounts marked as exclude_from_stats
  const accountsIncluded = data.accounts.filter(acc => !acc.exclude_from_stats);
  
  const savingsAccounts = data.accounts.filter(acc => 
    (acc.account_type === 'savings' || acc.account_type === 'investment') && !acc.exclude_from_stats
  );
  const totalSavings = savingsAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  
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
  const totalDebt = creditCards.reduce((sum, card) => {
    // Credit card balances are negative (debt), so we use absolute value
    const balance = parseFloat(card.balance || 0);
    return sum + Math.abs(balance);
  }, 0);
  
  // Get credit limit - check both credit_limit and creditLimit fields
  const totalCreditLimit = creditCards.reduce((sum, card) => {
    // Try both credit_limit and creditLimit (camelCase) for compatibility
    const limit = parseFloat(card.credit_limit || card.creditLimit || 0);
    if (limit > 0) {
      return sum + limit;
    }
    return sum;
  }, 0);
  const totalAvailableCredit = totalCreditLimit - totalDebt;
  const overallUtilization = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit * 100) : 0;
  const minimumPayments = creditCards.reduce((sum, card) => {
    const debt = Math.abs(parseFloat(card.balance || 0));
    return sum + Math.max(debt * 0.02, 25);
  }, 0);
  const monthlyInterestCost = totalDebt * (0.18 / 12);
  const annualInterestCost = totalDebt * 0.18;

  // Calculate payoff time and interest for a single card
  const calculateCardPayoff = (card, customPayment) => {
    const debt = Math.abs(parseFloat(card.balance || 0));
    const apr = 0.18; // 18% APR (annual)
    const monthlyRate = apr / 12;
    
    if (debt === 0) {
      return { months: 0, totalInterest: 0, totalPaid: 0 };
    }

    const payment = customPayment || Math.max(debt * 0.02, 25);
    
    // Simulate month by month to calculate accurately
    let remainingDebt = debt;
    let totalInterest = 0;
    let months = 0;
    const maxMonths = 600; // Cap at 50 years to prevent infinite loops
    
    while (remainingDebt > 0.01 && months < maxMonths) {
      const interest = remainingDebt * monthlyRate;
      totalInterest += interest;
      
      // Check if payment covers at least some principal
      if (payment <= interest) {
        // Payment doesn't cover interest, debt will grow
        return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity };
      }
      
      const principalPayment = payment - interest;
      remainingDebt = Math.max(0, remainingDebt - principalPayment);
      months++;
      
      // Safety check: if debt is increasing, it will never pay off
      if (months > 1 && remainingDebt >= debt) {
        return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity };
      }
    }
    
    const totalPaid = debt + totalInterest;
    
    return { months, totalInterest, totalPaid };
  };

  // Calculate aggregated results for all cards with custom payments
  const calculateAggregatedResults = () => {
    let totalMonths = 0;
    let totalInterest = 0;
    let totalPaid = 0;
    const cardResults = [];

    creditCards.forEach((card) => {
      const customPayment = customMinimumPayments[card.id];
      const result = calculateCardPayoff(card, customPayment);
      
      if (result.months !== Infinity) {
        cardResults.push({
          card,
          ...result,
          customPayment: customPayment || Math.max(Math.abs(parseFloat(card.balance || 0)) * 0.02, 25)
        });
        totalMonths = Math.max(totalMonths, result.months);
        totalInterest += result.totalInterest;
        totalPaid += result.totalPaid;
      } else {
        cardResults.push({
          card,
          months: Infinity,
          totalInterest: Infinity,
          totalPaid: Infinity,
          customPayment: customPayment || Math.max(Math.abs(parseFloat(card.balance || 0)) * 0.02, 25)
        });
      }
    });

    return { totalMonths, totalInterest, totalPaid, cardResults };
  };

  const aggregatedResults = creditCards.length > 0 ? calculateAggregatedResults() : null;

  // Total balance available - includes ALL accounts (same as Dashboard)
  const balanceDisponible = totalAccountsBalance;
  
  // Calculate pending expected income: remaining expected income for the month
  // If actual income >= expected income, show 0 (already received all expected)
  // Otherwise, show the difference
  const ingresoEsperadoPendiente = expectedIncome > 0 ? Math.max(0, expectedIncome - actualIncome) : 0;
  
  // Debug logging for balance and income calculations
  console.log('💰 Balance & Income Calculations:', {
    totalAccountsBalance: balanceDisponible,
    allAccountsCount: data.accounts.length,
    includedAccountsCount: accountsIncluded.length,
    expectedIncome,
    actualIncome,
    ingresoEsperadoPendiente,
    currentMonth: new Date().toISOString().slice(0, 7),
    accountsBreakdown: data.accounts.map(acc => ({
      name: acc.name,
      balance: acc.balance,
      exclude_from_stats: acc.exclude_from_stats
    }))
  });
  const diasRestantesMes = daysRemaining;
  const capacidadSegura = Math.max(0, (balanceDisponible * 0.8) + ingresoEsperadoPendiente);
  const gastoDiarioSeguro = capacidadSegura / Math.max(1, diasRestantesMes);
  
  // Debug logging (remove in production)
  console.log('Expected Income Calculation:', {
    expectedIncome,
    actualIncome,
    ingresoEsperadoPendiente,
    daysElapsed,
    daysInMonth,
    currentMonth: new Date().toISOString().slice(0, 7)
  });

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
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{t('financialInsights')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{t('financialInsightsDescription')}</p>
            </div>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" />
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('updateInsights')}
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('spendingCapacity')}</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('totalBalanceAccounts')}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">€{balanceDisponible.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('pendingExpectedIncome')}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">€{ingresoEsperadoPendiente.toFixed(2)}</p>
                  {expectedIncome > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {actualIncome >= expectedIncome 
                        ? (language === 'es' ? 'Ingreso completo recibido' : 'Full income received')
                        : (language === 'es' 
                          ? `Faltan €${(expectedIncome - actualIncome).toFixed(2)} de €${expectedIncome.toFixed(2)}`
                          : `€${(expectedIncome - actualIncome).toFixed(2)} remaining of €${expectedIncome.toFixed(2)}`
                        )
                      }
                    </p>
                  )}
                  {expectedIncome === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {language === 'es' ? 'No configurado en Ajustes' : 'Not configured in Settings'}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('safeSpendingCapacity')}</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">€{capacidadSegura.toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-700 p-4">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('recommendation')}</p>
                    <p className="text-gray-900 dark:text-gray-100">
                      {t('canSpendSafely')} <span className="font-bold text-purple-600 dark:text-purple-400">€{gastoDiarioSeguro.toFixed(2)}{t('perDay')}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t('basedOnRemainingDays', { days: diasRestantesMes })}
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('financialStatus')}</h2>
                </div>
                <div className="space-y-4">
                  {expectedIncome > 0 && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t('expectedMonthlyIncome')} <span className="text-xs">{t('configured')}</span>
                      </span>
                      <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">€{expectedIncome.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('actualIncomeCurrentMonth')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        incomeRatio >= 100 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700' 
                          : incomeRatio >= 75
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700'
                      }`}>
                        {incomeRatio.toFixed(1)}% {t('ofExpected')}
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">€{actualIncome.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('totalExpenses')} <span className="text-xs">(€{dailyAvgExpense.toFixed(2)}{t('perDayLabel')})</span>
                    </span>
                    <span className="text-lg font-semibold text-red-600 dark:text-red-400">€{monthlyExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('netBalanceTransactions')}</span>
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
                      {t('realBalanceAccounts')} <span className="text-xs">({data.accounts.length} {t('accounts')})</span>
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">€{totalAccountsBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('savingsInAccounts')}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">({savingsAccounts.length} {t('savingsAccounts')})</span>
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
                          {t('evaluation')}: {savingsRate >= 20 ? t('excellent') : savingsRate >= 10 ? t('good') : savingsRate >= 0 ? t('improvable') : t('caution')}
                        </p>
                        <p className={`text-sm mt-1 ${
                          savingsRate >= 20 ? 'text-emerald-800 dark:text-emerald-200' :
                          savingsRate >= 10 ? 'text-blue-800 dark:text-blue-200' :
                          savingsRate >= 0 ? 'text-amber-800 dark:text-amber-200' :
                          'text-red-800 dark:text-red-200'
                        }`}>
                          {savingsRate >= 20 ? t('solidPosition') :
                           savingsRate >= 10 ? t('acceptableSituation') :
                           savingsRate >= 0 ? t('reviewExpenses') :
                           t('alertSpending')}
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('expensesByCategory')}</h2>
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
                              {statusColor === 'success' ? t('well') : statusColor === 'warning' ? t('review') : t('high')}
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
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('analysisByCard')}</h2>
                    </div>
                    {creditCards.length > 0 && (
                      <button
                        onClick={handleCheckDuplicates}
                        disabled={checkingDuplicates}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkingDuplicates ? (
                          <>
                            <Loader className="h-3 w-3 animate-spin" />
                            <span>Buscando...</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            <span>Buscar duplicados</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {creditCards.map((card) => {
                      // Credit card balances are negative (debt), so we use absolute value
                      const balance = parseFloat(card.balance || 0);
                      const debt = Math.abs(balance);
                      
                      // Try both credit_limit and creditLimit (camelCase) for compatibility
                      const limit = parseFloat(card.credit_limit || card.creditLimit || 0);
                      const usage = limit > 0 ? (debt / limit * 100) : 0;
                      const statusColor = usage < 30 ? 'success' : usage < 70 ? 'warning' : 'destructive';
                      
                      // Debug log to help diagnose missing limits
                      if (!limit || limit === 0) {
                        console.warn('⚠️ Credit card missing limit:', {
                          cardName: card.name,
                          cardId: card.id,
                          balance: balance,
                          debt: debt,
                          credit_limit: card.credit_limit,
                          creditLimit: card.creditLimit,
                          cardData: card
                        });
                      }
                      
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
                              {statusColor === 'success' ? t('well') : statusColor === 'warning' ? t('review') : t('high')}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">{t('debt')}</p>
                              <p className="font-semibold text-red-600 dark:text-red-400">€{debt.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">{t('limit')}</p>
                              {limit > 0 ? (
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">€{limit.toFixed(0)}</p>
                              ) : (
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('notSet') || 'Not set'}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">{t('usage')}</p>
                              {limit > 0 ? (
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{usage.toFixed(1)}%</p>
                              ) : (
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">—</p>
                              )}
                            </div>
                          </div>
                          {limit > 0 && <ProgressBar value={usage} className="mt-3" />}
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('situationAnalysis')}</h2>
                </div>
                <div className="space-y-4">
                  {expectedIncome > 0 && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{t('incomeUpToDate')}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {language === 'es' ? `Has recibido €${actualIncome.toFixed(2)} de €${expectedIncome.toFixed(2)} esperados (${incomeRatio.toFixed(1)}%)` : `You have received €${actualIncome.toFixed(2)} of €${expectedIncome.toFixed(2)} expected (${incomeRatio.toFixed(1)}%)`}
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
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{t('budgetUnderControl')}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{language === 'es' ? `Has gastado €${budgetSpent.toFixed(2)} de €${budgetTotal.toFixed(2)} (${budgetUsage.toFixed(1)}%)` : `You have spent €${budgetSpent.toFixed(2)} of €${budgetTotal.toFixed(2)} (${budgetUsage.toFixed(1)}%)`}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {budgetTotal > 0 && daysRemaining > 0 && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{t('monthEndPrediction')}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {language === 'es' 
                              ? `${t('atCurrentRate')} (€${dailySpendRate.toFixed(2)}/día), ${t('youWillSpend')} €${projectedMonthEndSpend.toFixed(2)} (${projectedBudgetUsage.toFixed(1)}%)`
                              : `${t('atCurrentRate')} (€${dailySpendRate.toFixed(2)}/day), ${t('youWillSpend')} €${projectedMonthEndSpend.toFixed(2)} (${projectedBudgetUsage.toFixed(1)}%)`}
                          </p>
                          {projectedBudgetUsage > 100 && (
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mt-2">
                              {t('warningOverspending')} €{(projectedMonthEndSpend - budgetTotal).toFixed(2)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{daysRemaining} {t('remainingDays')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
                    <div className="flex items-start gap-3">
                      <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{t('lowSavings')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {t('youHaveSavings', { amount: totalSavings.toFixed(2) })}
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('creditSummary')}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10 p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('totalDebt')}</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">€{totalDebt.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{creditCards.length} {t('creditCards')}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('totalLimit')}</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">€{totalCreditLimit.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('available')} €{totalAvailableCredit.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('utilization')}</p>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{overallUtilization.toFixed(1)}%</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border mt-1 inline-block ${
                        overallUtilization < 30
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800'
                          : overallUtilization < 70
                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800'
                          : 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
                      }`}>
                        {overallUtilization < 30 ? t('excellent') : overallUtilization < 70 ? t('review') : t('high')}
                      </span>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('minimumPayment')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">€{minimumPayments.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('perMonth')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Minimum Payment Calculator */}
            {creditCards.length > 0 && aggregatedResults && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-blue-200 dark:border-blue-700">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {language === 'es' ? 'Calculadora de Pago Mínimo' : 'Minimum Payment Calculator'}
                    </h2>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {language === 'es' 
                        ? 'Establece pagos mínimos personalizados para cada tarjeta y ve cuándo terminarás de pagarlas y cuánto interés pagarás.'
                        : 'Set custom minimum payments for each card and see when you\'ll finish paying them off and how much interest you\'ll pay.'}
                    </p>
                    
                    <div className="space-y-4">
                      {creditCards.map((card) => {
                        // Credit card balances are negative (debt), so we use absolute value
                        const balance = parseFloat(card.balance || 0);
                        const debt = Math.abs(balance);
                        const defaultMin = Math.max(debt * 0.02, 25);
                        const customPayment = customMinimumPayments[card.id] || defaultMin;
                        const result = calculateCardPayoff(card, customPayment);
                        
                        return (
                          <div key={card.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-700/50 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{card.name}</span>
                              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                                {language === 'es' ? 'Deuda:' : 'Debt:'} €{debt.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 mb-3">
                              <label className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0 min-w-[140px]">
                                {language === 'es' ? 'Pago mensual:' : 'Monthly payment:'}
                              </label>
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-gray-500 dark:text-gray-400">€</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={customMinimumPayments[card.id] !== undefined ? customMinimumPayments[card.id] : ''}
                                  placeholder={defaultMin.toFixed(2)}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value > 0) {
                                      setCustomMinimumPayments({
                                        ...customMinimumPayments,
                                        [card.id]: value
                                      });
                                    } else if (e.target.value === '') {
                                      const newPayments = { ...customMinimumPayments };
                                      delete newPayments[card.id];
                                      setCustomMinimumPayments(newPayments);
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                  onClick={() => {
                                    const newPayments = { ...customMinimumPayments };
                                    delete newPayments[card.id];
                                    setCustomMinimumPayments(newPayments);
                                  }}
                                  className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                >
                                  {language === 'es' ? 'Restablecer' : 'Reset'}
                                </button>
                              </div>
                            </div>
                            
                            {result.months !== Infinity ? (
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className="text-center">
                                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                                    {language === 'es' ? 'Meses para pagar' : 'Months to pay'}
                                  </p>
                                  <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                                    {result.months}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                                    {language === 'es' ? 'Interés total' : 'Total interest'}
                                  </p>
                                  <p className="font-bold text-amber-600 dark:text-amber-400 text-lg">
                                    €{result.totalInterest.toFixed(2)}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                                    {language === 'es' ? 'Total pagado' : 'Total paid'}
                                  </p>
                                  <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                    €{result.totalPaid.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2">
                                <p className="text-red-600 dark:text-red-400 text-sm font-semibold">
                                  {language === 'es' 
                                    ? '⚠️ El pago es muy bajo. No podrás pagar esta tarjeta con este monto.'
                                    : '⚠️ Payment too low. You won\'t be able to pay off this card with this amount.'}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Summary Results */}
                  {aggregatedResults.totalMonths !== Infinity && (
                    <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        {language === 'es' ? 'Resumen Total' : 'Total Summary'}
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {language === 'es' ? 'Tiempo máximo' : 'Max time'}
                          </p>
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {aggregatedResults.totalMonths} {language === 'es' ? 'meses' : 'months'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {language === 'es' 
                              ? `Aprox. ${Math.floor(aggregatedResults.totalMonths / 12)} años ${aggregatedResults.totalMonths % 12} meses`
                              : `Approx. ${Math.floor(aggregatedResults.totalMonths / 12)} years ${aggregatedResults.totalMonths % 12} months`}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {language === 'es' ? 'Interés total' : 'Total interest'}
                          </p>
                          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                            €{aggregatedResults.totalInterest.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {language === 'es' 
                              ? `€${(aggregatedResults.totalInterest / aggregatedResults.totalMonths).toFixed(2)}/mes`
                              : `€${(aggregatedResults.totalInterest / aggregatedResults.totalMonths).toFixed(2)}/month`}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {language === 'es' ? 'Total a pagar' : 'Total to pay'}
                          </p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            €{aggregatedResults.totalPaid.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {language === 'es' 
                              ? `Deuda: €${totalDebt.toFixed(2)}`
                              : `Debt: €${totalDebt.toFixed(2)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Recommendations & Projections */}
            {creditCards.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-purple-200 dark:border-purple-700">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('aiRecommendations')}</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-700 p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('estimatedInterestCost')}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('withAverageRate')} <span className="font-bold text-purple-600 dark:text-purple-400">€{monthlyInterestCost.toFixed(2)}{t('perMonthInterest')}</span> ({language === 'es' ? `€${annualInterestCost.toFixed(2)}/año` : `€${annualInterestCost.toFixed(2)}/year`}). {t('payingMinimum')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('recommendations')}</p>
                          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>{t('reduceUtilization')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>{t('payMoreThanMinimum', { amount: minimumPayments.toFixed(2) })}</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>{t('considerPaying', { amount: (minimumPayments * 2).toFixed(2) })}</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>{t('useStrategy')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span>{t('avoidNewCharges')}</span>
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
                              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('paymentProjection')}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('ifYouPay')} <span className="font-bold text-emerald-700 dark:text-emerald-400">€{doubleMinimum.toFixed(2)}{t('perMonth')}</span>{" "}
                                ({t('doubleMinimum')}), {language === 'es' ? 'podrías estar libre de deuda en aproximadamente' : 'you could be debt-free in approximately'} {" "}
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">{monthsToPayoff} {t('months')}</span>, {t('payingInterest')} {" "}
                                <span className="font-bold">€{totalInterestPaid.toFixed(2)}</span> {t('inInterest')}.
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
          <span className="font-semibold hidden sm:inline">{t('aiAssistantButton')}</span>
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
                        {t('aiAssistantTitle')}
                        <Sparkles className="w-6 h-6" />
                      </h2>
                      <p className="text-purple-100 text-sm">
                        {t('aiAssistantDescription')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {chatMessages.length > 0 && (
                      <button
                        onClick={() => {
                          setChatMessages([]);
                          setChatError('');
                          setChatInput('');
                          chatInputRef.current?.focus();
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title={language === 'es' ? 'Nueva conversación' : 'New conversation'}
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowChat(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                {/* Time Period Selector */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-purple-100 mb-2">
                    {t('aiPeriodLabel')}
                  </label>
                  <select
                    value={chatTimePeriod}
                    onChange={(e) => setChatTimePeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                    style={{ color: 'white' }}
                  >
                    <option value="all" style={{ color: '#1f2937' }}>{t('aiPeriodAll')}</option>
                    <option value="day" style={{ color: '#1f2937' }}>{t('aiPeriodToday')}</option>
                    <option value="week" style={{ color: '#1f2937' }}>{t('aiPeriodWeek')}</option>
                    <option value="month" style={{ color: '#1f2937' }}>{t('aiPeriodMonth')}</option>
                    <option value="year" style={{ color: '#1f2937' }}>{t('aiPeriodYear')}</option>
                  </select>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t('aiSuggestedQuestions')}</p>
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
                          
                          {/* Show follow-up suggestions for assistant messages */}
                          {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                {language === 'es' ? 'Preguntas sugeridas:' : 'Suggested questions:'}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {message.suggestions.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      setChatInput(suggestion);
                                      chatInputRef.current?.focus();
                                    }}
                                    className="text-xs px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-700"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
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
                      placeholder={t('aiPlaceholder')}
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
                    {t('aiAnalyzing')}
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
