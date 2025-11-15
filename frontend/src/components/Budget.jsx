import React, { useState, useEffect } from 'react';
import { Loader, Edit2, AlertCircle, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { getBudgetOverview, updateCategoryBudget } from '../utils/api';
import { parseCategory } from '../utils/categoryFormat';

function Budget({ onNavigateToTransactions }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'over':
        return 'bg-red-100 border-danger text-danger';
      case 'warning':
        return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'ok':
        return 'bg-green-100 border-success text-success';
      case 'no_budget':
        return 'bg-gray-100 border-gray-300 text-gray-600';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const getStatusIcon = (status, hasBudget) => {
    switch (status) {
      case 'over':
        return <AlertCircle className="w-5 h-5 text-danger" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'no_budget':
        if (!hasBudget) {
          return <AlertCircle className="w-5 h-5 text-amber-500" />;
        }
        return null;
      default:
        return null;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Budget</h2>
            <p className="text-gray-600 dark:text-gray-400">Track your spending against budgeted amounts</p>
          </div>
          
          {/* Month Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Budget</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data?.totals?.budget || 0)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent</span>
            <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data?.totals?.spent || 0)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Spent / Budget</span>
            {data?.totals?.percentage >= 100 ? (
              <AlertCircle className="w-4 h-4 text-danger" />
            ) : data?.totals?.percentage >= 90 ? (
              <AlertCircle className="w-4 h-4 text-orange-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-success" />
            )}
          </div>
          <div className="space-y-1">
            <p className={`text-xl font-bold ${
              data?.totals?.percentage >= 100 ? 'text-danger' :
              data?.totals?.percentage >= 90 ? 'text-orange-500' :
              'text-success'
            }`}>
              {formatCurrency(data?.totals?.spent || 0)} / {formatCurrency(data?.totals?.budget || 0)}
            </p>
            <p className={`text-xs font-medium ${
              data?.totals?.percentage >= 100 ? 'text-danger' :
              data?.totals?.percentage >= 90 ? 'text-orange-500' :
              'text-success'
            }`}>
              {data?.totals?.percentage >= 100 ? 'Over Budget' :
               data?.totals?.percentage >= 90 ? 'Near Limit' :
               'On Track'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Remaining</span>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className={`text-2xl font-bold ${data?.totals?.remaining >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(data?.totals?.remaining || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Usage</span>
            <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <p className={`text-2xl font-bold ${
            data?.totals?.percentage >= 100 ? 'text-danger' :
            data?.totals?.percentage >= 90 ? 'text-orange-500' :
            'text-success'
          }`}>
            {data?.totals?.percentage?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Budget by Category</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Category</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Budget</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Spent</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Remaining</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Progress</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.categories
                ?.sort((a, b) => {
                  // Categories that should always go to the bottom
                  const bottomCategories = [
                    'Finanzas > Transferencias',
                    'Transferencias',
                    'Transferencia',
                    'Servicios > Cargos bancarios',
                    'Cargos bancarios',
                    'Otros > Sin categoría',
                    'Sin categoría',
                    'Uncategorized'
                  ].map(c => c.toLowerCase());
                  
                  const isABottom = bottomCategories.includes(a.name.toLowerCase());
                  const isBBottom = bottomCategories.includes(b.name.toLowerCase());
                  
                  // If one is bottom category and the other isn't, bottom goes last
                  if (isABottom && !isBBottom) return 1;
                  if (!isABottom && isBBottom) return -1;
                  
                  // If both are bottom categories, sort alphabetically
                  if (isABottom && isBBottom) {
                    return a.name.localeCompare(b.name);
                  }
                  
                  // For non-bottom categories, apply priority sorting
                  // Priority order: over > warning > ok > no_budget
                  const statusPriority = { 'over': 0, 'warning': 1, 'ok': 2, 'no_budget': 3 };
                  const priorityA = statusPriority[a.status] ?? 4;
                  const priorityB = statusPriority[b.status] ?? 4;
                  
                  // First, sort by status priority
                  if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                  }
                  
                  // If same status and 'over', sort by how much over (most over first)
                  if (a.status === 'over' && b.status === 'over') {
                    return (b.spent - b.budget) - (a.spent - a.budget);
                  }
                  
                  // If same status and 'warning', sort by percentage (highest first)
                  if (a.status === 'warning' && b.status === 'warning') {
                    return b.percentage - a.percentage;
                  }
                  
                  // Otherwise, sort alphabetically by name
                  return a.name.localeCompare(b.name);
                })
                ?.map((category) => (
                <tr key={category.id || category.name} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 ${
                  category.isTransfer ? 'bg-blue-50 dark:bg-blue-900/20' : 
                  category.status === 'no_budget' && !category.hasBudget ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-400' : ''
                }`}>
                  <td className="py-3 px-4 text-sm font-medium">
                    {category.transactionCount > 0 && onNavigateToTransactions ? (
                      <button
                        onClick={() => onNavigateToTransactions({ category: category.name })}
                        className="text-left text-primary dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer font-medium"
                        title={`Ver ${category.transactionCount} transacciones de ${category.name}`}
                      >
                        {category.isTransfer && <span className="mr-2">🔄</span>}
                        {category.status === 'no_budget' && !category.hasBudget && (
                          <span className="mr-2 text-amber-600 dark:text-amber-400" title="No budget assigned">⚠️</span>
                        )}
                        {(() => {
                          const parsed = parseCategory(category.name);
                          return parsed.group ? (
                            <span className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                {parsed.group}
                              </span>
                              <span>{parsed.category}</span>
                            </span>
                          ) : (
                            <span>{category.name}</span>
                          );
                        })()}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          ({category.transactionCount} transacciones →)
                        </span>
                        {category.isTransfer && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            ⚠️ {category.note}
                          </div>
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-900 dark:text-gray-100">
                        {category.isTransfer && <span className="mr-2">🔄</span>}
                        {category.status === 'no_budget' && !category.hasBudget && (
                          <span className="mr-2 text-amber-600 dark:text-amber-400" title="No budget assigned">⚠️</span>
                        )}
                        {(() => {
                          const parsed = parseCategory(category.name);
                          return parsed.group ? (
                            <span className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                {parsed.group}
                              </span>
                              <span>{parsed.category}</span>
                            </span>
                          ) : (
                            <span>{category.name}</span>
                          );
                        })()}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
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
                        className="w-24 px-2 py-1 border border-primary rounded focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    ) : (
                      <span className={category.status === 'no_budget' && !category.hasBudget ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                        {category.budget > 0 ? formatCurrency(category.budget) : 
                         category.status === 'no_budget' && !category.hasBudget ? '—' : 
                         formatCurrency(category.budget)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-gray-100">
                    {formatCurrency(category.spent)}
                  </td>
                  <td className={`py-3 px-4 text-sm text-right font-medium ${
                    category.remaining >= 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {formatCurrency(category.remaining)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center">
                      <div className="w-full max-w-xs">
                        {category.status === 'no_budget' && !category.hasBudget ? (
                          <div className="text-center">
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">No budget</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  category.status === 'over' ? 'bg-danger' :
                                  category.status === 'warning' ? 'bg-orange-500' :
                                  'bg-success'
                                }`}
                                style={{ width: `${Math.min(category.percentage, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400">
                              {category.percentage.toFixed(0)}%
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getStatusIcon(category.status, category.hasBudget)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleEditBudget(category)}
                      className={`p-2 rounded-lg transition-colors ${
                        category.status === 'no_budget' && !category.hasBudget
                          ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                      aria-label={category.status === 'no_budget' && !category.hasBudget ? "Add budget" : "Edit budget"}
                      title={category.status === 'no_budget' && !category.hasBudget ? "Add budget for this category" : "Edit budget"}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Status Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Under budget (&lt;90%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Near limit (90-100%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-danger" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Over budget (&gt;100%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">No budget assigned</span>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
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
    </div>
  );
}

export default Budget;

