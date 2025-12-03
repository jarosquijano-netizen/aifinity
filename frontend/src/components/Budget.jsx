import React, { useState, useEffect } from 'react';
import { Loader, Edit2, AlertCircle, CheckCircle, TrendingUp, Calendar, Search, Filter, ChevronDown, ChevronUp, Zap, BarChart3, X } from 'lucide-react';
import { getBudgetOverview, updateCategoryBudget, getBudgetInsights } from '../utils/api';
import { parseCategory } from '../utils/categoryFormat';
import BudgetInsight from './BudgetInsight';
import SetupBudget from './SetupBudget';
import Tabs from './Tabs';

function Budget({ onNavigateToTransactions }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'setup'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [insights, setInsights] = useState({});
  const [insightsLoading, setInsightsLoading] = useState(false);
  
  // UX Enhancement states
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'problems', 'attention'
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroSpending, setHideZeroSpending] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    over: true,
    closeToLimit: true,
    watch: false,
    noBudget: true,
    onTrack: false,
    safe: false
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  useEffect(() => {
    if (data) {
      fetchInsights();
    }
  }, [data, selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const budgetData = await getBudgetOverview(selectedMonth);
      setData(budgetData);
    } catch (err) {
      setError('Failed to load budget data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      setInsightsLoading(true);
      const insightsData = await getBudgetInsights(selectedMonth, true);
      
      // Convert insights array to map for easy lookup
      const insightsMap = {};
      insightsData.insights?.forEach(item => {
        insightsMap[item.category] = item.insight;
      });
      setInsights(insightsMap);
    } catch (err) {
      console.error('Failed to load insights:', err);
      // Don't show error to user, just continue without insights
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleEditBudget = (category) => {
    setEditingId(category.id || category.name);
    setEditValue(category.budget > 0 ? category.budget.toString() : '');
  };

  const handleSaveBudget = async (categoryId, categoryName) => {
    try {
      await updateCategoryBudget(categoryId, parseFloat(editValue), categoryName);
      setEditingId(null);
      fetchData();
    } catch (err) {
      setError('Failed to update budget');
    }
  };

  // Enhanced status calculation with 6 levels
  const getCategoryStatus = (category) => {
    if (category.isTransfer) return 'transfer';
    if (!category.hasBudget && category.budget === 0) return 'no_budget';
    
    const percentage = category.percentage || 0;
    
    if (percentage >= 100) return 'over'; // 🔴 Over Budget
    if (percentage >= 90) return 'closeToLimit'; // ⚠️ Close to Limit (90-99%)
    if (percentage >= 75) return 'watch'; // ⚡ Watch (75-89%)
    if (percentage >= 50) return 'onTrack'; // 📊 On Track (50-74%)
    return 'safe'; // ✅ Safe (0-49%)
  };

  // Enhanced status styling
  const getStatusConfig = (status) => {
    const configs = {
      over: {
        label: 'Over Budget',
        icon: '🔴',
        color: 'red',
        bgColor: 'bg-red-50 dark:bg-red-900/10',
        borderColor: 'border-l-red-600 dark:border-l-red-500',
        textColor: 'text-red-700 dark:text-red-400',
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        progressColor: 'bg-red-600 dark:bg-red-500',
        priority: 0
      },
      closeToLimit: {
        label: 'Close to Limit',
        icon: '⚠️',
        color: 'orange',
        bgColor: 'bg-orange-50 dark:bg-orange-900/10',
        borderColor: 'border-l-orange-500 dark:border-l-orange-400',
        textColor: 'text-orange-700 dark:text-orange-400',
        badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        progressColor: 'bg-orange-500 dark:bg-orange-400',
        priority: 1
      },
      watch: {
        label: 'Watch',
        icon: '⚡',
        color: 'yellow',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/10',
        borderColor: 'border-l-yellow-500 dark:border-l-yellow-400',
        textColor: 'text-yellow-700 dark:text-yellow-400',
        badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        progressColor: 'bg-yellow-500 dark:bg-yellow-400',
        priority: 2
      },
      no_budget: {
        label: 'No Budget',
        icon: '⚠️',
        color: 'amber',
        bgColor: 'bg-amber-50 dark:bg-amber-900/10',
        borderColor: 'border-l-amber-500 dark:border-l-amber-400',
        textColor: 'text-amber-700 dark:text-amber-400',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        progressColor: 'bg-amber-500 dark:bg-amber-400',
        priority: 3
      },
      onTrack: {
        label: 'On Track',
        icon: '📊',
        color: 'blue',
        bgColor: 'bg-blue-50 dark:bg-blue-900/10',
        borderColor: 'border-l-blue-500 dark:border-l-blue-400',
        textColor: 'text-blue-700 dark:text-blue-400',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        progressColor: 'bg-blue-500 dark:bg-blue-400',
        priority: 4
      },
      safe: {
        label: 'Safe',
        icon: '✅',
        color: 'green',
        bgColor: 'bg-green-50 dark:bg-green-900/10',
        borderColor: 'border-l-green-500 dark:border-l-green-400',
        textColor: 'text-green-700 dark:text-green-400',
        badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        progressColor: 'bg-green-500 dark:bg-green-400',
        priority: 5
      },
      transfer: {
        label: 'Transfer',
        icon: '🔄',
        color: 'blue',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-l-blue-400 dark:border-l-blue-500',
        textColor: 'text-blue-700 dark:text-blue-400',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        progressColor: 'bg-blue-400 dark:bg-blue-500',
        priority: 6
      }
    };
    return configs[status] || configs.safe;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Group categories by status
  const groupCategoriesByStatus = (categories) => {
    const grouped = {
      over: [],
      closeToLimit: [],
      watch: [],
      no_budget: [],
      onTrack: [],
      safe: [],
      transfer: []
    };

    categories.forEach(cat => {
      const status = getCategoryStatus(cat);
      grouped[status].push({ ...cat, enhancedStatus: status });
    });

    return grouped;
  };

  // Filter categories
  const getFilteredCategories = () => {
    if (!data?.categories) return [];
    
    let filtered = [...data.categories];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply hide zero spending
    if (hideZeroSpending) {
      filtered = filtered.filter(cat => cat.spent > 0);
    }

    // Apply filter mode
    if (filterMode === 'problems') {
      filtered = filtered.filter(cat => {
        const status = getCategoryStatus(cat);
        return status === 'over' || status === 'closeToLimit';
      });
    } else if (filterMode === 'attention') {
      filtered = filtered.filter(cat => {
        const status = getCategoryStatus(cat);
        return status === 'over' || status === 'closeToLimit' || status === 'watch' || status === 'no_budget';
      });
    }

    return filtered;
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    if (!data?.categories) return null;

    const categories = getFilteredCategories();
    const grouped = groupCategoriesByStatus(categories);

    return {
      over: grouped.over.length,
      closeToLimit: grouped.closeToLimit.length,
      watch: grouped.watch.length,
      noBudget: grouped.no_budget.length,
      onTrack: grouped.onTrack.length,
      safe: grouped.safe.length,
      total: categories.length
    };
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
      <div className="card">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  const filteredCategories = getFilteredCategories();
  const groupedCategories = groupCategoriesByStatus(filteredCategories);
  const summaryStats = getSummaryStats();

  // Calculate frontend total budget from categories (excluding transfers and parent categories)
  // Separate annual and monthly budgets
  const calculateFrontendTotalBudget = () => {
    if (!data?.categories) return { monthly: 0, annual: 0, total: 0 };
    
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
      return allCategories.some(cat => cat.name && cat.name.startsWith(categoryName + ' > '));
    };
    
    // Filter out excluded categories and parent categories
    const validCategories = data.categories.filter(cat => {
      // Exclude transfers and NC
      if (excludedCategories.includes(cat.name)) {
        return false;
      }
      // Exclude parent categories that have children
      if (isParentCategory(cat.name, data.categories)) {
        return false;
      }
      // Only include categories with budgets
      return cat.budget > 0;
    });
    
    // Separate annual and monthly budgets
    const monthlyBudget = validCategories
      .filter(cat => !cat.is_annual)
      .reduce((sum, cat) => sum + (cat.budget || 0), 0);
    
    const annualBudget = validCategories
      .filter(cat => cat.is_annual)
      .reduce((sum, cat) => sum + (cat.budget || 0), 0);
    
    return {
      monthly: monthlyBudget,
      annual: annualBudget,
      total: monthlyBudget + annualBudget
    };
  };

  const budgetTotals = calculateFrontendTotalBudget();
  const frontendTotalBudget = budgetTotals.total;
  const monthlyBudget = budgetTotals.monthly;
  const annualBudget = budgetTotals.annual;
  const frontendTotalSpent = data?.totals?.spent || 0;
  const frontendRemaining = frontendTotalBudget - frontendTotalSpent;
  const frontendPercentage = frontendTotalBudget > 0 ? (frontendTotalSpent / frontendTotalBudget) * 100 : 0;

  // Sort categories within each group
  const sortCategoriesInGroup = (categories) => {
    return [...categories].sort((a, b) => {
      // Sort by amount over budget (for over), percentage (for others), then alphabetically
      if (a.enhancedStatus === 'over' && b.enhancedStatus === 'over') {
        return (b.spent - b.budget) - (a.spent - a.budget);
      }
      if (a.percentage !== b.percentage) {
        return b.percentage - a.percentage;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const statusGroups = [
    { key: 'over', label: '🔴 Over Budget', categories: sortCategoriesInGroup(groupedCategories.over) },
    { key: 'closeToLimit', label: '⚠️ Close to Limit', categories: sortCategoriesInGroup(groupedCategories.closeToLimit) },
    { key: 'watch', label: '⚡ Watch', categories: sortCategoriesInGroup(groupedCategories.watch) },
    { key: 'no_budget', label: '⚠️ No Budget', categories: sortCategoriesInGroup(groupedCategories.no_budget) },
    { key: 'onTrack', label: '📊 On Track', categories: sortCategoriesInGroup(groupedCategories.onTrack) },
    { key: 'safe', label: '✅ Safe', categories: sortCategoriesInGroup(groupedCategories.safe) },
    { key: 'transfer', label: '🔄 Transfers', categories: sortCategoriesInGroup(groupedCategories.transfer) }
  ];

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'setup', label: 'Setup Budget' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">Budget</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Track your spending against budgeted amounts</p>
          </div>
          
          {/* Month Selector - only show on overview tab */}
          {activeTab === 'overview' && (
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-base"
              />
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === 'setup' ? (
        <SetupBudget onBudgetSaved={() => {
          // Refresh overview data when budgets are saved
          fetchData();
        }} />
      ) : (
        <>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-medium text-gray-600 dark:text-gray-400">Total Budget</span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(frontendTotalBudget)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">(Frontend calculated)</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-medium text-gray-600 dark:text-gray-400">Total Spent</span>
            <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data?.totals?.spent || 0)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-medium text-gray-600 dark:text-gray-400">Spent / Budget</span>
            {frontendPercentage >= 100 ? (
              <AlertCircle className="w-5 h-5 text-danger" />
            ) : frontendPercentage >= 90 ? (
              <AlertCircle className="w-5 h-5 text-orange-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-success" />
            )}
          </div>
          <div className="space-y-2">
            <p className={`text-2xl font-bold ${
              frontendPercentage >= 100 ? 'text-danger' :
              frontendPercentage >= 90 ? 'text-orange-500' :
              'text-success'
            }`}>
              {formatCurrency(frontendTotalSpent)} / {formatCurrency(frontendTotalBudget)}
            </p>
            <p className={`text-sm font-medium ${
              frontendPercentage >= 100 ? 'text-danger' :
              frontendPercentage >= 90 ? 'text-orange-500' :
              'text-success'
            }`}>
              {frontendPercentage >= 100 ? 'Over Budget' :
               frontendPercentage >= 90 ? 'Near Limit' :
               'On Track'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-medium text-gray-600 dark:text-gray-400">Remaining</span>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <p className={`text-3xl font-bold ${frontendRemaining >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(frontendRemaining)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-medium text-gray-600 dark:text-gray-400">Usage</span>
            <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <p className={`text-3xl font-bold ${
            frontendPercentage >= 100 ? 'text-danger' :
            frontendPercentage >= 90 ? 'text-orange-500' :
            'text-success'
          }`}>
            {frontendPercentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Quick Stats Alert Cards */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {summaryStats.over > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔴</span>
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Over Budget</p>
                  <p className="text-xl font-bold text-red-700 dark:text-red-300">{summaryStats.over}</p>
                </div>
              </div>
            </div>
          )}
          {summaryStats.closeToLimit > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Close to Limit</p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{summaryStats.closeToLimit}</p>
                </div>
              </div>
            </div>
          )}
          {summaryStats.watch > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Watch</p>
                  <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{summaryStats.watch}</p>
                </div>
              </div>
            </div>
          )}
          {summaryStats.noBudget > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">No Budget</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{summaryStats.noBudget}</p>
                </div>
              </div>
            </div>
          )}
          {summaryStats.onTrack > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">On Track</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{summaryStats.onTrack}</p>
                </div>
              </div>
            </div>
          )}
          {summaryStats.safe > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Safe</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{summaryStats.safe}</p>
                </div>
              </div>
            </div>
          )}
          {groupedCategories.transfer.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔄</span>
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Transfers</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{groupedCategories.transfer.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters & Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-base"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1.5">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 rounded-md text-base font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('problems')}
                className={`px-4 py-2 rounded-md text-base font-medium transition-colors ${
                  filterMode === 'problems'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Problems Only
              </button>
              <button
                onClick={() => setFilterMode('attention')}
                className={`px-4 py-2 rounded-md text-base font-medium transition-colors ${
                  filterMode === 'attention'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Needs Attention
              </button>
            </div>
          </div>

          {/* Hide Zero Spending Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hideZeroSpending}
              onChange={(e) => setHideZeroSpending(e.target.checked)}
              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-base text-gray-600 dark:text-gray-400 font-medium">Hide zero spending</span>
          </label>
        </div>
      </div>

      {/* Categories by Status Groups */}
      <div className="space-y-6">
        {statusGroups.map((group) => {
          if (group.categories.length === 0) return null;
          
          const config = getStatusConfig(group.key);
          const isExpanded = expandedSections[group.key];
          const isCritical = group.key === 'over' || group.key === 'closeToLimit' || group.key === 'no_budget';

          return (
            <div
              key={group.key}
              className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 ${config.borderColor.replace('border-l-', 'border-')} overflow-hidden`}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(group.key)}
                className={`w-full px-6 py-5 flex items-center justify-between ${config.bgColor} hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{config.icon}</span>
                  <div className="text-left">
                    <h3 className={`text-lg font-bold ${config.textColor}`}>{group.label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {group.categories.length} categor{group.categories.length === 1 ? 'y' : 'ies'}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className={`w-6 h-6 ${config.textColor}`} />
                ) : (
                  <ChevronDown className={`w-6 h-6 ${config.textColor}`} />
                )}
              </button>

              {/* Categories List */}
              {isExpanded && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {group.categories.map((category) => {
                    const categoryConfig = getStatusConfig(category.enhancedStatus);
                    const isOverBudget = category.enhancedStatus === 'over';
                    
                    return (
                      <div
                        key={category.id || category.name}
                        className={`${categoryConfig.bgColor} border-l-4 ${categoryConfig.borderColor} hover:opacity-90 transition-opacity ${
                          isOverBudget ? 'font-semibold' : ''
                        }`}
                      >
                        <div className="px-6 py-5">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            {/* Category Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Category name - not clickable */}
                                <span className={`text-base font-semibold ${categoryConfig.textColor}`}>
                                  {(() => {
                                    const parsed = parseCategory(category.name);
                                    return parsed.category || parsed.displayName || category.name;
                                  })()}
                                </span>
                                
                                {/* Status badge next to name */}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryConfig.badgeColor}`}>
                                  {categoryConfig.icon} {categoryConfig.label}
                                </span>
                                
                                {/* Transfer badge */}
                                {category.isTransfer && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    🔄 Transfer
                                  </span>
                                )}
                                
                                {/* Transaction count - clickable link */}
                                {category.transactionCount > 0 && (
                                  onNavigateToTransactions ? (
                                    <button
                                      onClick={() => onNavigateToTransactions({ 
                                        category: category.name,
                                        month: selectedMonth 
                                      })}
                                      className="text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-primary dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                                      title={`View ${category.transactionCount} transactions for ${category.name} in ${selectedMonth}`}
                                    >
                                      ({category.transactionCount} trans.)
                                    </button>
                                  ) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                      ({category.transactionCount} trans.)
                                    </span>
                                  )
                                )}
                              </div>
                              
                              {category.isTransfer && category.note && (
                                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                                  ⚠️ {category.note}
                                </p>
                              )}
                              
                              {/* Budget Insight */}
                              <BudgetInsight 
                                insight={insights[category.name]}
                                loading={insightsLoading}
                                category={category.name}
                              />
                            </div>

                            {/* Budget/Spent/Remaining */}
                            <div className="grid grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8 lg:min-w-[600px] overflow-x-auto">
                              <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Budget</p>
                                {editingId === (category.id || category.name) ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleSaveBudget(category.id, category.name)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') handleSaveBudget(category.id, category.name);
                                    }}
                                    className="w-full max-w-40 px-3 py-2 border border-primary rounded-lg focus:ring-2 focus:ring-primary text-base"
                                    autoFocus
                                  />
                                ) : (
                                  <p className={`text-lg font-bold ${categoryConfig.textColor}`}>
                                    {category.budget > 0 ? formatCurrency(category.budget) : '—'}
                                  </p>
                                )}
                              </div>
                              
                              <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Spent</p>
                                <p className={`text-lg font-bold ${categoryConfig.textColor}`}>
                                  {formatCurrency(category.spent)}
                                </p>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Remaining</p>
                                <p className={`text-lg font-bold ${
                                  category.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {formatCurrency(category.remaining)}
                                </p>
                              </div>

                              {/* Progress Bar */}
                              <div className="hidden md:block">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">Progress</p>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 mb-2">
                                  <div
                                    className={`h-5 rounded-full transition-all ${categoryConfig.progressColor}`}
                                    style={{ width: `${Math.min(category.percentage || 0, 100)}%` }}
                                  />
                                </div>
                                <p className="text-sm text-center text-gray-600 dark:text-gray-400 font-medium">
                                  {category.percentage?.toFixed(0) || 0}%
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end md:justify-center">
                              <button
                                onClick={() => handleEditBudget(category)}
                                className={`p-3 rounded-lg transition-colors ${categoryConfig.textColor} hover:opacity-80 hover:bg-white/50 dark:hover:bg-slate-700/50`}
                                aria-label="Edit budget"
                                title="Edit budget"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Mobile Progress Bar */}
                          <div className="md:hidden mt-4">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 mb-2">
                              <div
                                className={`h-5 rounded-full transition-all ${categoryConfig.progressColor}`}
                                style={{ width: `${Math.min(category.percentage || 0, 100)}%` }}
                              />
                            </div>
                            <p className="text-sm text-center text-gray-600 dark:text-gray-400 font-medium">
                              {category.percentage?.toFixed(0) || 0}%
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Status Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🔴</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Over Budget (100%+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg">⚠️</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Close to Limit (90-99%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg">⚡</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Watch (75-89%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg">⚠️</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">No Budget</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg">📊</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">On Track (50-74%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg">✅</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">Safe (0-49%)</span>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
          <div className="flex items-start space-x-2">
            <span className="text-lg">🔄</span>
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Transferencias</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                No incluidas en el Total Spent. Click para revisar - algunas pueden ser gastos reales mal categorizados.
              </p>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default Budget;
