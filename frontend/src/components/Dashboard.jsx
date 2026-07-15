import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Download, Trash2, Loader, PiggyBank, Maximize2, Minimize2, CreditCard, AlertCircle, ArrowRightLeft, RefreshCw, X, Eye, EyeOff, Settings as SettingsIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ReferenceLine } from 'recharts';
import { getSummary, deleteAllTransactions, exportExcel, getAccounts, getSettings, createTransfer, getTransactions } from '../utils/api';
import { generateDashboardPDF, PERIODS } from '../utils/dashboardPdf';
import {
  computeNetWorth, computeRunway, computeMonthDelta,
  computeSavingsRateSeries, computeCreditUtilization,
  computeTopRealCategories, computeMovers,
  computeDiscretionaryVsEssential, computeInsights,
} from '../utils/financialInsights';
import {
  KpiNetWorth, KpiRunway, KpiSavingsRate, KpiCreditUtilization,
  KpiIncomeDelta, KpiExpensesDelta, KpiTopRealCategories,
  WidgetMovers, WidgetInsights, ChartDiscretionaryVsEssential,
  WidgetRecurring, WidgetBudgetHealth,
} from './InsightWidgets';
import api from '../utils/api';
import { useChartTheme } from './DarkModeChart';
import TransferModal from './TransferModal';
import { formatCurrency, formatCurrencyDecimals, formatCurrencyNumber } from '../utils/currencyFormat';

// Widget card wrapper — hide/resize buttons, no drag
function WidgetCard({ id, children, onToggleSize, currentSize, onHide, className }) {
  return (
    <div className={`relative group ${className || ''}`}>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSize(id); }}
          className="p-1.5 bg-white/90 dark:bg-slate-700/90 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg shadow-md backdrop-blur-sm cursor-pointer"
          title={currentSize === 'large' ? 'Reducir widget' : 'Ampliar widget'}
        >
          {currentSize === 'large' ? (
            <Minimize2 className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
          )}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHide(id); }}
          className="p-1.5 bg-white/90 dark:bg-slate-700/90 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg shadow-md backdrop-blur-sm cursor-pointer"
          title="Ocultar widget"
        >
          <X className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
      {children}
    </div>
  );
}

function Dashboard({ refreshTrigger }) {
  const [data, setData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [expectedIncome, setExpectedIncome] = useState(0);
  const [currentMonthIncomeTransactions, setCurrentMonthIncomeTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [hiddenWidgets, setHiddenWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboardHiddenWidgets');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const chartTheme = useChartTheme();

  // Persist hidden widgets
  useEffect(() => {
    localStorage.setItem('dashboardHiddenWidgets', JSON.stringify([...hiddenWidgets]));
  }, [hiddenWidgets]);

  const hideWidget = (widgetId) => {
    setHiddenWidgets((prev) => new Set([...prev, widgetId]));
  };
  const showWidget = (widgetId) => {
    setHiddenWidgets((prev) => {
      const next = new Set(prev);
      next.delete(widgetId);
      return next;
    });
  };
  
  // Track last refresh trigger to detect changes
  const [lastRefreshTrigger, setLastRefreshTrigger] = useState(0);
  
  // Widget order state - load from localStorage or use default
  const [widgetOrder, setWidgetOrder] = useState(() => {
    const saved = localStorage.getItem('dashboardWidgetOrder');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Añadir los nuevos widgets si el usuario los tiene guardados sin ellos (migración)
      const newIds = [
        'insight-networth', 'insight-runway', 'insight-savings-rate', 'insight-credit-util',
        'insight-income-delta', 'insight-expenses-delta', 'insight-top-real',
        'insight-alerts', 'insight-movers',
        'insight-budget-health', 'insight-disc-vs-ess', 'insight-recurring',
      ];
      const missing = newIds.filter((id) => !parsed.includes(id));
      return missing.length > 0 ? [...missing, ...parsed] : parsed;
    }
    return [
      // Fila 1: fundamentos financieros (4 KPIs compactos)
      'insight-networth', 'insight-runway', 'insight-savings-rate', 'insight-credit-util',
      // Fila 2: este mes de un vistazo (3 KPIs + top categorías)
      'insight-income-delta', 'insight-expenses-delta', 'kpi-balance', 'insight-top-real',
      // Fila 3: insights accionables (2 widgets large)
      'insight-alerts', 'insight-movers',
      // Fila 4: presupuesto + split de gasto
      'insight-budget-health', 'insight-disc-vs-ess',
      // Fila 5: recurrentes + gráficas existentes
      'insight-recurring', 'chart1', 'chart2', 'chart3', 'chart4', 'chart5',
      // Últimos: KPIs legacy que ya no son primarios
      'kpi-income', 'kpi-expenses', 'kpi-savings-total', 'kpi-credit-cards',
      'kpi-avg-expense', 'kpi-top-category',
    ];
  });

  // Widget sizes state - individual size for each widget
  const [widgetSizes, setWidgetSizes] = useState(() => {
    const saved = localStorage.getItem('dashboardWidgetSizes');
    return saved ? JSON.parse(saved) : {};
  });

  // Save widget order to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboardWidgetOrder', JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  // Save widget sizes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dashboardWidgetSizes', JSON.stringify(widgetSizes));
  }, [widgetSizes]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when refreshTrigger prop changes (from App.jsx after upload)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger !== lastRefreshTrigger) {
      setLastRefreshTrigger(refreshTrigger);
      fetchData();
    }
  }, [refreshTrigger, lastRefreshTrigger]);

  // Refresh when component becomes visible (user switches to dashboard tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    // Refresh when tab becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when window regains focus (user switches back to browser tab)
    window.addEventListener('focus', fetchData);

    // Listen for custom event when transactions are updated
    const handleTransactionUpdate = () => {
      fetchData();
    };
    window.addEventListener('transactionUpdated', handleTransactionUpdate);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', fetchData);
      window.removeEventListener('transactionUpdated', handleTransactionUpdate);
    };
  }, []);

  const toggleWidgetSize = (widgetId) => {
    setWidgetSizes(prev => ({
      ...prev,
      [widgetId]: prev[widgetId] === 'small' ? 'large' : 'small'
    }));
  };

  // Get default size — KPI cards start compact, charts and large widgets start large
  const SMALL_INSIGHT_KPIS = new Set([
    'insight-networth', 'insight-runway', 'insight-savings-rate', 'insight-credit-util',
    'insight-income-delta', 'insight-expenses-delta', 'insight-top-real',
  ]);
  const getDefaultWidgetSize = (widgetId) => {
    if (!widgetId) return 'large';
    if (widgetId.startsWith('kpi-')) return 'small';
    if (SMALL_INSIGHT_KPIS.has(widgetId)) return 'small';
    return 'large';
  };

  // Get size for a specific widget (respect user override)
  const getWidgetSize = (widgetId) => widgetSizes[widgetId] || getDefaultWidgetSize(widgetId);

  // Get size classes based on widget size setting
  const getCardSize = (widgetId) => {
    const size = getWidgetSize(widgetId);
    return {
      // Grid span: large ocupa toda la fila en tablet y 2 columnas en desktop;
      // small ocupa 1 columna en tablet (fila de 2) y 1 en desktop (fila de 4)
      gridCol: size === 'large' ? 'md:col-span-2 lg:col-span-2' : 'md:col-span-1 lg:col-span-1',
      // Height: large más alto para gráficas; small compacto para KPIs
      height: size === 'large' ? 'min-h-[380px]' : 'min-h-[140px]',
      // Padding: large más espacioso, small compacto
      padding: size === 'large' ? 'p-5' : 'p-4',
      // Font sizes para adaptar contenido
      titleSize: size === 'large' ? 'text-lg' : 'text-xs uppercase tracking-wide',
      valueSize: size === 'large' ? 'text-3xl' : 'text-2xl',
      labelSize: size === 'large' ? 'text-sm' : 'text-xs',
    };
  };


  const fixNominas = async () => {
    try {
      console.log('🔧 Corrigiendo nóminas automáticamente...');
      const response = await api.post('/fix-nomina/freightos');
      const data = response.data;
      
      console.log('✅ Nóminas corregidas:', data.updated);
      console.log('Ingreso después de corrección:', data.calculatedIncome);
      
      if (data.excludedAccounts && data.excludedAccounts.length > 0) {
        console.warn('⚠️ Cuentas excluidas:', data.excludedAccounts);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error corrigiendo nóminas:', error);
      // No lanzar error, solo loguear
      return null;
    }
  };

  const fixRemesasTraspasos = async () => {
    try {
      console.log('🔧 Corrigiendo remesas/traspasos automáticamente...');
      const response = await api.post('/fix-remesas-traspasos/mark-non-computable');
      const data = response.data;
      
      console.log('✅ Remesas/traspasos corregidos:', data.updated);
      
      if (data.excludedAccounts && data.excludedAccounts.length > 0) {
        console.warn('⚠️ Cuentas excluidas:', data.excludedAccounts);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error corrigiendo remesas/traspasos:', error);
      // No lanzar error, solo loguear
      return null;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const currentDate = new Date();
      
      // Primero, corregir remesas/traspasos (marcarlas como no computables)
      await fixRemesasTraspasos();
      
      // Luego, intentar corregir nóminas automáticamente si es necesario
      // Solo si el ingreso parece bajo (menos de 5000€ en enero)
      if (currentMonth === '2026-01') {
        await fixNominas();
      }
      
      const [summary, trends, budget, accountsData, settings, transactionsData] = await Promise.all([
        getSummary(),
        api.get('/trends'),
        api.get(`/budget/overview?month=${currentMonth}`).catch(() => ({ data: { totals: { budget: 0, spent: 0, remaining: 0, usagePercentage: 0 } } })),
        getAccounts(),
        getSettings().catch(() => ({ expectedMonthlyIncome: 0 })),
        getTransactions().catch(() => ({ transactions: [] }))
      ]);
      // Log summary data in a way that's visible even when minified
      console.log('📊 Dashboard - Summary data received:');
      console.log('   actualIncome:', summary?.actualIncome);
      console.log('   actualExpenses:', summary?.actualExpenses);
      console.log('   actualNetBalance:', summary?.actualNetBalance);
      console.log('   currentMonth:', summary?.currentMonth);
      console.log('   totalIncome:', summary?.totalIncome);
      console.log('   totalExpenses:', summary?.totalExpenses);
      console.log('   Full summary object:', summary);
      
      setData(summary);
      setBudgetData(budget.data);
      setAccounts(accountsData.accounts || []);
      setExpectedIncome(settings.expectedMonthlyIncome || 0);
      setAllTransactions(transactionsData?.transactions || []);

      // Fire-and-forget: fetch recurring for insights widgets
      api.get('/predictions/recurring')
        .then((r) => setRecurring(r.data?.data || []))
        .catch(() => setRecurring([]));
      
      console.log('📊 Dashboard - Budget data:');
      console.log('   budget totals:', budget.data?.totals);
      console.log('   spent:', budget.data?.totals?.spent);
      console.log('   remaining:', budget.data?.totals?.remaining);
      console.log('   Full budget object:', budget.data);
      
      // Filter current month income transactions (only computable ones)
      // Consider applicable_month if available, otherwise use transaction date
      const currentMonthIncome = (transactionsData.transactions || [])
        .filter(t => {
          if (t.type !== 'income') return false;
          // Exclude non-computable transactions (NC, transfers, etc.)
          if (t.computable === false) return false;
          
          // Check if transaction belongs to current month
          // Use applicable_month if available, otherwise use transaction date
          const transactionMonth = t.applicable_month 
            ? t.applicable_month 
            : new Date(t.date).toISOString().slice(0, 7);
          
          return transactionMonth === currentMonth;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // Most recent first
        .slice(0, 5); // Show up to 5 transactions
      
      console.log('📊 Dashboard - Current month income transactions:');
      console.log('   currentMonth:', currentMonth);
      console.log('   totalTransactions:', transactionsData.transactions?.length || 0);
      console.log('   incomeTransactions found:', currentMonthIncome.length);
      console.log('   transactions:', currentMonthIncome.map(t => ({
        date: t.date,
        applicable_month: t.applicable_month,
        description: t.description?.substring(0, 30),
        amount: t.amount
      })));
      
      setCurrentMonthIncomeTransactions(currentMonthIncome);
      
      // Get last 6 months of data with budget percentage
      const last6Months = trends.data.monthlyTrends?.slice(-6) || [];
      
      // Fetch budget data for each of the last 6 months
      const monthlyBudgetPromises = last6Months.map(month => 
        api.get(`/budget/overview?month=${month.month}`).catch(() => ({ 
          data: { totals: { budget: 0, spent: 0, usagePercentage: 0 } } 
        }))
      );
      
      const monthlyBudgets = await Promise.all(monthlyBudgetPromises);
      
      setMonthlyData(last6Months.map((month, index) => {
        const budgetInfo = monthlyBudgets[index].data;
        const totalBudget = budgetInfo?.totals?.budget || 0;
        const totalSpent = budgetInfo?.totals?.spent || 0;
        const usagePercentage = budgetInfo?.totals?.usagePercentage || 0;
        
        return {
          name: new Date(month.month + '-01').toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
          ingresos: parseFloat(month.income),
          gastos: parseFloat(month.expenses),
          presupuesto: totalBudget,
          porcentajeUsado: usagePercentage,
        };
      }));
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to delete all transactions? This cannot be undone.')) {
      return;
    }

    try {
      await deleteAllTransactions();
      fetchData();
    } catch (err) {
      setError('Failed to delete transactions');
    }
  };

  const handleTransfer = async (fromAccountId, toAccountId, amount, date, description) => {
    try {
      await createTransfer(fromAccountId, toAccountId, amount, date, description);
      fetchData();
      fetchAccounts();
      setShowTransferModal(false);
      // Dispatch event so other components can refresh if needed
      window.dispatchEvent(new CustomEvent('transactionUpdated'));
    } catch (err) {
      throw err; // Re-throw to be handled by the modal
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!data || data.transactionCount === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center py-12">
        <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Data Yet</h3>
        <p className="text-gray-600 dark:text-gray-400">Upload your bank statements to see your financial dashboard.</p>
      </div>
    );
  }

  // Prepare chart data
  const categoryData = data.categories
    .filter(cat => cat.type === 'expense')
    .map(cat => ({
      name: cat.category,
      value: parseFloat(cat.total),
      count: cat.count
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Income vs Expenses comparison - use current month values only
  const incomeVsExpense = [
    { name: 'Income', value: data.actualIncome || 0, color: '#22c55e' },
    { name: 'Expenses', value: data.actualExpenses !== undefined ? data.actualExpenses : 0, color: '#ef4444' }
  ];

  // Helper: Get top expense category
  const topExpenseCategory = categoryData[0] || { name: 'N/A', value: 0 };

  // Helper: Calculate daily average expense for current month
  const getDailyAvgExpense = () => {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const daysPassed = Math.max(1, currentDate.getDate()); // Days passed in current month
    const currentMonthExpenses = data.actualExpenses !== undefined ? data.actualExpenses : 0;
    
    return currentMonthExpenses / daysPassed;
  };

  // Helper: Get balance advice using current month data
  const getBalanceAdvice = () => {
    const currentIncome = data.actualIncome || 0;
    const currentExpenses = data.actualExpenses !== undefined ? data.actualExpenses : 0; // Only use current month expenses
    // Use accountsBalance (from accounts) as primary balance, fallback to actualNetBalance (from transactions)
    const currentBalance = data.accountsBalance !== undefined 
      ? data.accountsBalance 
      : (data.actualNetBalance !== undefined 
        ? data.actualNetBalance 
        : (currentIncome - currentExpenses));
    const savingsRate = currentIncome > 0 ? (currentBalance / currentIncome) * 100 : 0;
    if (currentBalance < 0) return '⚠️ Reduce gastos';
    if (savingsRate < 10) return '💡 Ahorra más';
    if (savingsRate < 20) return '✅ Buen avance';
    return '🎯 ¡Excelente!';
  };

  // Function to render each widget (KPI cards, charts, etc.) by ID
  const renderWidget = (widgetId) => {
    const cardSize = getCardSize(widgetId);
    const isLarge = getWidgetSize(widgetId) === 'large';
    const wSize = isLarge ? 'large' : 'small';

    // Precompute insights inputs once per render (cheap enough on typical volumes)
    const netWorth = computeNetWorth(accounts);
    const runway = computeRunway(accounts, allTransactions, 3);
    const savingsSeries = computeSavingsRateSeries(allTransactions, 6);
    const creditUtil = computeCreditUtilization(accounts);
    const incomeDelta = computeMonthDelta(allTransactions, 'income', 3);
    const expensesDelta = computeMonthDelta(allTransactions, 'expense', 3);
    const topReal = computeTopRealCategories(allTransactions, 8);
    const movers = computeMovers(allTransactions, 3);
    const discSplit = computeDiscretionaryVsEssential(allTransactions);
    const insights = computeInsights({
      transactions: allTransactions,
      accounts,
      budgetOverview: budgetData,
      movers,
    });

    const widgets = {
      // ─── Insight widgets nuevos ──────────────────────────────────────────────
      'insight-networth': <KpiNetWorth netWorth={netWorth} size={wSize} />,
      'insight-runway': <KpiRunway runway={runway} size={wSize} />,
      'insight-savings-rate': <KpiSavingsRate series={savingsSeries} size={wSize} />,
      'insight-credit-util': <KpiCreditUtilization credit={creditUtil} size={wSize} />,
      'insight-income-delta': <KpiIncomeDelta delta={incomeDelta} size={wSize} />,
      'insight-expenses-delta': <KpiExpensesDelta delta={expensesDelta} size={wSize} />,
      'insight-top-real': <KpiTopRealCategories topCats={topReal} size={wSize} />,
      'insight-movers': <WidgetMovers movers={movers} />,
      'insight-alerts': <WidgetInsights insights={insights} />,
      'insight-disc-vs-ess': <ChartDiscretionaryVsEssential split={discSplit} />,
      'insight-recurring': <WidgetRecurring recurring={recurring} />,
      'insight-budget-health': <WidgetBudgetHealth budgetOverview={budgetData} />,
      // Main KPI Cards
      'kpi-income': (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl h-full ${cardSize.height} flex flex-col ${isLarge ? 'justify-between' : 'justify-start'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`${cardSize.labelSize} font-medium text-gray-600 dark:text-gray-400`}>
              {isLarge ? 'Actual Income (este mes)' : 'Income'}
            </span>
            <TrendingUp className={`${isLarge ? 'w-6 h-6' : 'w-4 h-4'} text-success`} />
          </div>
          <div className={isLarge ? 'flex-1 flex flex-col justify-center' : ''}>
            <p className={`${cardSize.valueSize} font-bold text-gray-900 dark:text-gray-100`}>
              {formatCurrency(data.actualIncome || 0)}
            </p>
            {isLarge && expectedIncome > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Expected:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrencyDecimals(expectedIncome, 0)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Progress:</span>
                  <span className={`font-bold ${(data.actualIncome / expectedIncome) * 100 >= 100 ? 'text-green-600 dark:text-green-400' : (data.actualIncome / expectedIncome) * 100 >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {((data.actualIncome / expectedIncome) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
            {isLarge && expectedIncome === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Mes: {data.currentMonth}
              </p>
            )}
            {/* Large mode: Show income transactions below total */}
            {isLarge && currentMonthIncomeTransactions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Ingresos este mes:
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {currentMonthIncomeTransactions.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 dark:text-gray-300 truncate">{t.description || 'Sin descripción'}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {new Date(t.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400 ml-2">
                        {formatCurrency(parseFloat(t.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Small mode: Show last 2 income transactions */}
            {!isLarge && currentMonthIncomeTransactions.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[9px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">Últimos ingresos:</p>
                {currentMonthIncomeTransactions.slice(0, 2).map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{t.description || 'Sin descripción'}</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrencyDecimals(parseFloat(t.amount), 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
      'kpi-expenses': (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl h-full ${cardSize.height} flex flex-col ${isLarge ? 'justify-between' : 'justify-start'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`${cardSize.labelSize} font-medium text-gray-600 dark:text-gray-400`}>
              {isLarge ? 'Actual Expenses (este mes)' : 'Expenses'}
            </span>
            <TrendingDown className={`${isLarge ? 'w-6 h-6' : 'w-4 h-4'} text-danger`} />
          </div>
          <div className={isLarge ? 'flex-1 flex flex-col justify-center' : ''}>
            <p className={`${cardSize.valueSize} font-bold text-gray-900 dark:text-gray-100`}>
              {formatCurrency(data.actualExpenses !== undefined ? data.actualExpenses : 0)}
            </p>
            {isLarge && data.actualIncome > 0 && data.actualExpenses !== undefined && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {Math.round((data.actualExpenses / data.actualIncome) * 100)}% of income
          </p>
            )}
            {/* Small mode: Show top expense category */}
            {!isLarge && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-[9px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-1">Mayor gasto:</p>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{topExpenseCategory.name}</span>
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400">{formatCurrencyDecimals(topExpenseCategory.value, 0)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
      'kpi-balance': (() => {
        const incomeRatio = expectedIncome > 0 ? (data.actualIncome / expectedIncome) * 100 : 0;
        const hasExpectedIncome = expectedIncome > 0;
        // Use backend calculated values - ensure expenses are from current month only
        const actualIncome = data.actualIncome || 0;
        const actualExpenses = data.actualExpenses !== undefined ? data.actualExpenses : 0; // Only use current month expenses
        // Use accountsBalance (from accounts) as primary balance, fallback to actualNetBalance (from transactions)
        const actualBalance = data.accountsBalance !== undefined 
          ? data.accountsBalance 
          : (data.actualNetBalance !== undefined 
            ? data.actualNetBalance 
            : (actualIncome - actualExpenses));
        
        return (
          <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl h-full ${cardSize.height} flex flex-col ${isLarge ? 'justify-between' : 'justify-start'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`${cardSize.labelSize} font-medium text-gray-600 dark:text-gray-400`}>
                {isLarge ? 'Net Balance (este mes)' : 'Balance'}
              </span>
              <DollarSign className={`${isLarge ? 'w-6 h-6' : 'w-4 h-4'} text-primary`} />
            </div>
            <div className={isLarge ? 'flex-1 flex flex-col justify-center' : ''}>
              <p className={`${cardSize.valueSize} font-bold ${actualBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(actualBalance)}
              </p>
              
              {/* Expected Income & Ratio */}
              {hasExpectedIncome && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Expected Income:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrencyDecimals(expectedIncome, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Income Ratio:</span>
                    <span className={`font-bold ${incomeRatio >= 100 ? 'text-green-600 dark:text-green-400' : incomeRatio >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      {incomeRatio.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
              
              {isLarge && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {actualBalance >= 0 ? 'Positive' : 'Negative'} balance este mes
                </p>
              )}
              
              {/* Small mode: Show advice */}
              {!isLarge && !hasExpectedIncome && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-lg inline-block ${
                    actualBalance >= 0 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {getBalanceAdvice()}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })(),
      'kpi-savings-total': (() => {
        // Use current month values for savings rate calculation
        const currentIncome = data.actualIncome || 0;
        const currentExpenses = data.actualExpenses !== undefined ? data.actualExpenses : 0;
        // Use accountsBalance (from accounts) as primary balance, fallback to actualNetBalance (from transactions)
        const currentBalance = data.accountsBalance !== undefined 
          ? data.accountsBalance 
          : (data.actualNetBalance !== undefined 
            ? data.actualNetBalance 
            : (currentIncome - currentExpenses));
        const savingsRate = currentIncome > 0 ? ((currentBalance / currentIncome) * 100) : 0;
        const totalSavings = accounts
          .filter(acc => (acc.account_type === 'savings' || acc.account_type === 'investment') && !acc.exclude_from_stats)
          .reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
        const savingsAccounts = accounts.filter(acc => acc.account_type === 'savings' || acc.account_type === 'investment').length;
        
        // Determine status based on recommended savings rate (20% is ideal, 10-30% is good range)
        const recommendedRate = 20;
        const minRate = 10;
        const maxRate = 30;
        
        let status = 'good';
        let statusText = '✅ Excelente';
        let statusColor = 'text-green-600 dark:text-green-400';
        let bgColor = 'bg-green-50 dark:bg-green-900/20';
        
        // Handle negative savings rate (expenses > income)
        if (savingsRate < 0) {
          status = 'negative';
          statusText = '⚠️ Gastos > Ingresos';
          statusColor = 'text-red-600 dark:text-red-400';
          bgColor = 'bg-red-50 dark:bg-red-900/20';
        } else if (savingsRate < minRate) {
          status = 'low';
          statusText = '⚠️ Bajo';
          statusColor = 'text-red-600 dark:text-red-400';
          bgColor = 'bg-red-50 dark:bg-red-900/20';
        } else if (savingsRate >= minRate && savingsRate < recommendedRate) {
          status = 'moderate';
          statusText = '📊 Bueno';
          statusColor = 'text-amber-600 dark:text-amber-400';
          bgColor = 'bg-amber-50 dark:bg-amber-900/20';
        }
        
        return (
          <div className={`bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl shadow-lg ${cardSize.padding} border-2 border-green-200 dark:border-green-800 transition-all duration-300 hover:shadow-2xl h-full ${cardSize.height} flex flex-col ${isLarge ? 'justify-between' : 'justify-center'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`${cardSize.labelSize} font-semibold text-green-800 dark:text-green-300`}>
                {isLarge ? '💰 Ahorro Total & Tasa' : '💰 Ahorro'}
              </span>
              <PiggyBank className={`${isLarge ? 'w-6 h-6' : 'w-4 h-4'} text-green-600 dark:text-green-400`} />
      </div>

            {/* Savings Total */}
            <div className={isLarge ? 'mb-3' : 'mb-1'}>
              <p className={`${cardSize.valueSize} font-bold text-green-700 dark:text-green-300`}>
                {formatCurrency(totalSavings)}
              </p>
              {isLarge && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {savingsAccounts} cuenta(s) de ahorro/inversión
                </p>
              )}
            </div>

            {/* Savings Rate with Status */}
            <div className={`${isLarge ? 'p-3' : 'p-2'} rounded-xl ${bgColor} border border-green-200 dark:border-green-700`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`${isLarge ? 'text-xs' : 'text-[10px]'} font-medium text-gray-600 dark:text-gray-400`}>
                  {isLarge ? 'Tasa de Ahorro' : 'Tasa'}
                </span>
                <span className={`${isLarge ? 'text-xs' : 'text-[10px]'} font-bold ${statusColor}`}>
                  {isLarge ? statusText : status === 'negative' || status === 'low' ? '⚠️' : status === 'moderate' ? '📊' : '✅'}
                </span>
              </div>
              <p className={`${isLarge ? 'text-2xl' : 'text-xl'} font-bold text-gray-900 dark:text-gray-100`}>
                {savingsRate.toFixed(1)}%
              </p>
              
              {/* Recommendation - Only show in large mode */}
              {isLarge && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                  <p className="font-medium mb-1">💡 Recomendado: {minRate}-{maxRate}%</p>
                  <p className="text-[10px] leading-tight">
                    {savingsRate < 0 && `⚠️ Tus gastos superan tus ingresos. Revisa tu presupuesto y reduce gastos.`}
                    {savingsRate >= 0 && savingsRate < minRate && `Intenta ahorrar al menos ${minRate}% de tus ingresos mensuales`}
                    {savingsRate >= minRate && savingsRate < recommendedRate && `Muy bien, acércate al ${recommendedRate}% ideal`}
                    {savingsRate >= recommendedRate && savingsRate <= maxRate && `¡Perfecto! Estás en el rango óptimo de ahorro`}
                    {savingsRate > maxRate && `¡Impresionante! Estás ahorrando más del ${maxRate}%`}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })(),
      'kpi-credit-cards': (() => {
        // Get all credit card accounts
        const creditCards = accounts.filter(acc => acc.account_type === 'credit' && !acc.exclude_from_stats);
        
        if (creditCards.length === 0) {
          return null; // Don't show widget if no credit cards
        }
        
        // Calculate total debt (all balances are negative for credit cards)
        const totalDebt = creditCards.reduce((sum, card) => sum + Math.abs(parseFloat(card.balance || 0)), 0);
        const totalCreditLimit = creditCards.reduce((sum, card) => sum + parseFloat(card.credit_limit || 0), 0);
        const totalAvailableCredit = totalCreditLimit - totalDebt;
        const utilizationPercent = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit * 100) : 0;
        
        // Determine status based on utilization
        let statusColor = 'text-green-600 dark:text-green-400';
        let statusBg = 'bg-green-50 dark:bg-green-900/20';
        let statusText = '✅ Buen uso';
        let statusIcon = null;
        
        if (utilizationPercent > 70) {
          statusColor = 'text-red-600 dark:text-red-400';
          statusBg = 'bg-red-50 dark:bg-red-900/20';
          statusText = '⚠️ Muy alto';
          statusIcon = <AlertCircle className="w-4 h-4 text-red-600" />;
        } else if (utilizationPercent > 30) {
          statusColor = 'text-amber-600 dark:text-amber-400';
          statusBg = 'bg-amber-50 dark:bg-amber-900/20';
          statusText = '📊 Moderado';
        }
        
        return (
          <div className={`bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl shadow-lg ${cardSize.padding} border-2 border-red-200 dark:border-red-800 transition-all duration-300 hover:shadow-2xl h-full ${cardSize.height} flex flex-col ${isLarge ? 'justify-between' : 'justify-start'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`${cardSize.labelSize} font-medium text-gray-600 dark:text-gray-400`}>
                {isLarge ? 'Tarjetas de Crédito' : 'Crédito'}
              </span>
              <CreditCard className={`${isLarge ? 'w-6 h-6' : 'w-4 h-4'} text-red-600 dark:text-red-400`} />
            </div>
            
            <div className={isLarge ? 'flex-1 flex flex-col justify-center' : ''}>
              {/* Current Debt */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Deuda Actual
                  </span>
                  {statusIcon}
                </div>
                <p className={`${cardSize.valueSize} font-bold text-red-600 dark:text-red-400`}>
                  {formatCurrency(totalDebt)}
                </p>
              </div>
              
              {/* Utilization Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400 mb-1">
                  <span>Utilización</span>
                  <span className="font-bold">{utilizationPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      utilizationPercent > 70 ? 'bg-red-600' : 
                      utilizationPercent > 30 ? 'bg-amber-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Credit Details - Only in large mode or compact in small */}
              {isLarge ? (
                <div className="space-y-2 mt-2 pt-3 border-t border-red-200 dark:border-red-700">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Límite Total:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyDecimals(totalCreditLimit, 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Crédito Disponible:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrencyDecimals(totalAvailableCredit, 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Tarjetas:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{creditCards.length}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-red-200 dark:border-red-700">
                  <div>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400">Disponible</p>
                    <p className="text-[11px] font-bold text-green-600 dark:text-green-400">{formatCurrencyDecimals(totalAvailableCredit, 0)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400">Límite</p>
                    <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{formatCurrencyDecimals(totalCreditLimit, 0)}</p>
                  </div>
                </div>
              )}
              
              {/* Status Badge */}
              <div className={`mt-3 px-2 py-1 ${statusBg} rounded-lg`}>
                <p className={`text-[10px] font-semibold ${statusColor} text-center`}>
                  {statusText}
                </p>
              </div>
              
              {/* Individual Cards - Only show in large mode if multiple cards */}
              {isLarge && creditCards.length > 1 && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700 space-y-2">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                    Por Tarjeta:
                  </p>
                  {creditCards.map(card => {
                    const debt = Math.abs(parseFloat(card.balance || 0));
                    const limit = parseFloat(card.credit_limit || 0);
                    const util = limit > 0 ? (debt / limit * 100) : 0;
                    return (
                      <div key={card.id} className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                          {card.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {formatCurrencyDecimals(debt, 0)}
                          </span>
                          <span className={`text-[9px] ${
                            util > 70 ? 'text-red-600' : 
                            util > 30 ? 'text-amber-600' : 
                            'text-green-600'
                          }`}>
                            {util.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })(),
      // Financial KPI Cards
      'kpi-avg-expense': (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl h-full ${cardSize.height} flex flex-col ${isLarge ? 'justify-between' : 'justify-start'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`${cardSize.labelSize} font-medium text-gray-600 dark:text-gray-400`}>
              {isLarge ? 'Gasto Promedio Diario' : 'Avg. Diario'}
            </span>
            <TrendingDown className={`${isLarge ? 'w-6 h-6' : 'w-4 h-4'} text-blue-500`} />
          </div>
          <div className={isLarge ? 'flex-1 flex flex-col justify-center' : ''}>
            <p className={`${cardSize.valueSize} font-bold text-gray-900 dark:text-gray-100`}>
              {formatCurrency(getDailyAvgExpense())}
            </p>
            {isLarge && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Gasto promedio por día
              </p>
            )}
            {/* Small mode: Show monthly projection */}
            {!isLarge && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Proyección mensual:</span>
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrencyDecimals(getDailyAvgExpense() * 30, 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
      'kpi-top-category': (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl h-full ${cardSize.height} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`${cardSize.labelSize} font-medium text-gray-600 dark:text-gray-400`}>
              {isLarge ? 'Categoría Principal' : 'Top Cat.'}
            </span>
            <TrendingUp className={`${isLarge ? 'w-6 h-6' : 'w-4 h-4'} text-purple-500`} />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className={`${isLarge ? 'text-xl' : 'text-base'} font-bold text-gray-900 dark:text-gray-100 truncate`}>
              {categoryData[0]?.name || 'N/A'}
            </p>
            <p className={`${cardSize.labelSize} text-gray-500 dark:text-gray-400 mt-1`}>
              {formatCurrency(categoryData[0]?.value || 0)}
            </p>
          </div>
        </div>
      ),
      // Charts
      chart1: (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 h-full ${cardSize.height} flex flex-col`}>
          <h3 className={`${cardSize.titleSize} font-bold text-gray-900 dark:text-gray-100 mb-4`}>
            {isLarge ? 'Expenses by Category' : 'Gastos'}
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: chartTheme.textColor }} 
                angle={-45} 
                textAnchor="end" 
                height={80}
                stroke={chartTheme.axisColor}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: chartTheme.textColor }}
                stroke={chartTheme.axisColor}
              />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  backgroundColor: chartTheme.tooltipBg,
                  color: chartTheme.tooltipText
                }}
                labelStyle={{ color: chartTheme.tooltipText }}
              />
              <Bar dataKey="value" fill={chartTheme.colors[0]} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
      ),
      chart2: (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 h-full ${cardSize.height} flex flex-col`}>
          <h3 className={`${cardSize.titleSize} font-bold text-gray-900 dark:text-gray-100 mb-4`}>
            {isLarge ? 'Income vs Expenses' : 'Income vs Exp'}
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={incomeVsExpense}
                cx="50%"
                cy="50%"
                labelLine={false}
                  label={false}
                  outerRadius="70%"
                fill="#8884d8"
                dataKey="value"
              >
                {incomeVsExpense.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    backgroundColor: chartTheme.tooltipBg,
                    color: chartTheme.tooltipText
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry) => (
                    <span style={{ color: chartTheme.textColor, fontSize: '14px', fontWeight: '600' }}>
                      {value}: {formatCurrency(entry.payload.value)}
                    </span>
                  )}
                />
            </PieChart>
          </ResponsiveContainer>
          </div>
        </div>
      ),
      chart3: (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 h-full ${cardSize.height} flex flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Porcentaje de Gastos</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          
          <div className="flex-1 flex flex-col">
          {(() => {
            const totalBudget = budgetData?.totals?.budget || 0;
            const totalSpent = budgetData?.totals?.spent || 0;
            const remaining = budgetData?.totals?.remaining || 0;
            const budgetPercentage = totalBudget > 0 
              ? ((totalSpent / totalBudget) * 100) 
              : 0;
            
            const progressPercentage = Math.min(budgetPercentage, 100);
            const circumference = 534;
            const progress = (progressPercentage / 100) * circumference;
            
            return (
              <>
                <div className="flex items-center justify-center py-6 flex-1">
                  <div className="relative">
                    <svg className="transform -rotate-90" width="200" height="200">
                      <circle
                        cx="100"
                        cy="100"
                        r="85"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        fill="none"
                        className="dark:stroke-gray-700"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="85"
                        stroke={`url(#gradient-${budgetPercentage >= 100 ? 'red' : budgetPercentage >= 90 ? 'amber' : 'pink'})`}
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${progress} ${circumference}`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient-pink" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                        <linearGradient id="gradient-amber" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="gradient-red" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-bold ${
                        budgetPercentage >= 100 ? 'text-red-600' : 
                        budgetPercentage >= 90 ? 'text-amber-600' : 
                        'text-gray-900 dark:text-gray-100'
                      }`}>
                        {budgetPercentage.toFixed(0)}%
                    </span>
                      {totalBudget === 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sin presupuesto</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Presupuesto</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(totalBudget)}
                    </p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${
                    remaining >= 0 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {remaining >= 0 ? 'Disponible' : 'Sobrepasado'}
                    </p>
                    <p className={`text-lg font-bold ${
                      remaining >= 0 
                        ? 'text-gradient-success' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(remaining))}
                    </p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
        </div>
      ),
      chart4: (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 h-full ${cardSize.height} flex flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Evolución Mensual</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">Últimos 6 meses</span>
          </div>
          
          <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                stroke={chartTheme.axisColor}
              />
              <YAxis 
                tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                tickFormatter={(value) => formatCurrencyDecimals(value/1000, 0) + 'k'}
                stroke={chartTheme.axisColor}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: chartTheme.tooltipBg, 
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  borderRadius: '12px',
                  padding: '12px'
                }}
                labelStyle={{ color: chartTheme.tooltipText, fontWeight: 'bold' }}
                formatter={(value, name) => {
                  if (name === 'Ingresos') {
                    return [formatCurrency(value), 'Ingresos'];
                  }
                  if (name === 'Gastos') {
                    return [formatCurrency(value), 'Gastos'];
                  }
                  return [value, name];
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="ingresos" 
                stroke="#22c55e" 
                strokeWidth={3}
                dot={{ fill: '#22c55e', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 2 }}
                name="Ingresos"
              />
              <Line 
                type="monotone" 
                dataKey="gastos" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ fill: '#ef4444', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 2 }}
                name="Gastos"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Gastos</span>
            </div>
          </div>
        </div>
      ),
      chart5: (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${cardSize.padding} border border-gray-200 dark:border-gray-700 h-full ${cardSize.height} flex flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">💰 Balance por Cuenta</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{accounts.length} cuenta(s)</span>
          </div>
          
          {accounts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <PiggyBank className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No hay cuentas configuradas</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Ve a Settings para agregar cuentas</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {accounts
                  .sort((a, b) => parseFloat(b.balance || 0) - parseFloat(a.balance || 0))
                  .map((account, index) => {
                    const balance = parseFloat(account.balance || 0);
                    const isPositive = balance >= 0;
                    const accountTypes = {
                      'checking': 'Corriente',
                      'savings': 'Ahorro',
                      'investment': 'Inversión',
                      'credit': 'Crédito'
                    };
                    return (
                      <div 
                        key={account.id || index}
                        className={`flex items-center justify-between p-4 rounded-xl hover:shadow-md transition-all border ${
                          account.account_type === 'credit' 
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                            : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {account.account_type === 'credit' ? (
                            <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400" />
                          ) : (
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: account.color || '#6366f1' }}
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {account.name}
                              </p>
                              {account.exclude_from_stats && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                                  excluida
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {accountTypes[account.account_type] || account.account_type || 'General'}
                              </p>
                              {account.account_type === 'credit' && account.credit_limit && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  {((Math.abs(balance) / parseFloat(account.credit_limit)) * 100).toFixed(0)}% usado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(balance)}
                          </p>
                          {account.account_type === 'credit' && account.credit_limit && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                              Límite: {formatCurrencyDecimals(parseFloat(account.credit_limit), 0)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* Summary */}
          {accounts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Balance Total:</span>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(accounts
                    .filter(acc => !acc.exclude_from_stats)
                    .reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0))}
                </span>
              </div>
            </div>
          )}
          </div>
      )
    };

    return widgets[widgetId] || null;
  };

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg shadow hover:shadow-md transition-all flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Actualizar datos del dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          
          <button
            onClick={() => setShowWidgetPicker(true)}
            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow hover:shadow-md transition-all flex items-center space-x-2 text-sm"
            title="Elegir qué widgets se muestran"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Widgets{hiddenWidgets.size > 0 ? ` (${widgetOrder.length - hiddenWidgets.size}/${widgetOrder.length})` : ''}</span>
          </button>
          
          {/* Transfer Button */}
          {accounts.length >= 2 && (
            <button 
              onClick={() => setShowTransferModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg shadow hover:shadow-md transition-all flex items-center space-x-2 text-sm"
              title="Crear transferencia entre cuentas"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Transferir</span>
            </button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              try { await exportExcel(); } catch (e) { alert(`Error al exportar Excel: ${e.response?.data?.error || e.message}`); }
            }}
            className="btn-secondary flex items-center space-x-2 px-3 py-1.5 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowPdfMenu((v) => !v)}
              disabled={generatingPdf}
              className="btn-secondary flex items-center space-x-2 px-3 py-1.5 text-sm disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{generatingPdf ? 'Generando…' : 'PDF Dashboard'}</span>
            </button>
            {showPdfMenu && !generatingPdf && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-30 overflow-hidden">
                {Object.entries(PERIODS).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={async () => {
                      setShowPdfMenu(false);
                      setGeneratingPdf(true);
                      try {
                        await generateDashboardPDF(key);
                      } catch (e) {
                        alert(`Error al generar PDF: ${e.response?.data?.error || e.message}`);
                      } finally {
                        setGeneratingPdf(false);
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    {info.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleReset} className="btn-danger flex items-center space-x-2 px-3 py-1.5 text-sm">
            <Trash2 className="w-4 h-4" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {widgetOrder.filter((id) => !hiddenWidgets.has(id)).map((widgetId) => {
          const cardSize = getCardSize(widgetId);
          return (
            <WidgetCard
              key={widgetId}
              id={widgetId}
              onToggleSize={toggleWidgetSize}
              currentSize={getWidgetSize(widgetId)}
              onHide={hideWidget}
              className={cardSize.gridCol}
            >
              {renderWidget(widgetId)}
            </WidgetCard>
          );
        })}
      </div>

      {/* Widget picker modal */}
      {showWidgetPicker && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowWidgetPicker(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Widgets del Dashboard</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Activa o desactiva lo que quieres ver</p>
              </div>
              <button
                onClick={() => setShowWidgetPicker(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {widgetOrder.map((id) => {
                const hidden = hiddenWidgets.has(id);
                const label = getWidgetLabel(id);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!hidden}
                      onChange={() => (hidden ? showWidget(id) : hideWidget(id))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{label}</span>
                    {hidden ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-indigo-500" />
                    )}
                  </label>
                );
              })}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-slate-700 flex justify-between">
              <button
                onClick={() => setHiddenWidgets(new Set())}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Mostrar todos
              </button>
              <button
                onClick={() => setShowWidgetPicker(false)}
                className="btn-primary text-sm px-4 py-1.5"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        accounts={accounts}
        onTransfer={handleTransfer}
      />
    </div>
  );
}

// Labels legibles para cada widget en el picker
function getWidgetLabel(id) {
  const labels = {
    'insight-networth': 'Patrimonio neto',
    'insight-runway': 'Runway financiero',
    'insight-savings-rate': 'Tasa de ahorro (con trend)',
    'insight-credit-util': 'Deuda tarjetas · utilización',
    'insight-income-delta': 'Ingresos del mes + Δ',
    'insight-expenses-delta': 'Gastos del mes + Δ',
    'insight-top-real': 'Top categorías reales',
    'insight-alerts': 'Alertas & insights',
    'insight-movers': 'Movers del mes',
    'insight-budget-health': 'Salud del presupuesto',
    'insight-disc-vs-ess': 'Esencial vs discrecional',
    'insight-recurring': 'Suscripciones recurrentes',
    'kpi-income': '[Legacy] Actual Income',
    'kpi-expenses': '[Legacy] Expenses',
    'kpi-balance': 'Balance del mes',
    'kpi-savings-total': '[Legacy] Ahorro total',
    'kpi-credit-cards': '[Legacy] Crédito',
    'kpi-avg-expense': '[Legacy] Gasto medio diario',
    'kpi-top-category': '[Legacy] Top categoría',
    chart1: 'Gráfica: Expenses by Category',
    chart2: 'Gráfica: Income vs Expenses',
    chart3: 'Gráfica: Porcentaje de gastos',
    chart4: 'Gráfica: Evolución mensual',
    chart5: 'Gráfica: Balance por cuenta',
  };
  return labels[id] || id;
}

export default Dashboard;


