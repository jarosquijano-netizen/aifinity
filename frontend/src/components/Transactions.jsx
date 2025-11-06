import React, { useState, useEffect } from 'react';
import { Loader, Filter, Download, Search, Calendar, Building2, CheckSquare, Square, Tag, X, CreditCard, ArrowRightLeft, Trash2 } from 'lucide-react';
import { getTransactions, exportCSV, exportExcel, updateTransactionCategory, bulkUpdateTransactionCategory, getCategories, deleteTransaction } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryColor } from '../utils/categoryColors';
import { getCategoryIcon } from '../utils/categoryIcons';
import CategoryModal from './CategoryModal';

function Transactions({ initialFilters = {}, onFiltersCleared }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, income, expense
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBank, setFilterBank] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all'); // all, YYYY-MM format
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [hasAppliedInitialFilters, setHasAppliedInitialFilters] = useState(false);
  
  // Bulk selection states
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkComputable, setBulkComputable] = useState(true);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [accounts, setAccounts] = useState([]);
  
  const { t } = useLanguage();

  // Apply initial filters from navigation
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0 && !hasAppliedInitialFilters) {
      if (initialFilters.category) {
        setFilterCategory(initialFilters.category);
      }
      if (initialFilters.type) {
        setFilterType(initialFilters.type);
      }
      if (initialFilters.bank) {
        setFilterBank(initialFilters.bank);
      }
      if (initialFilters.month) {
        setFilterMonth(initialFilters.month);
      }
      setHasAppliedInitialFilters(true);
    }
  }, [initialFilters, hasAppliedInitialFilters]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filterType, filterCategory, filterBank, filterMonth]);

  // Show bulk panel when selections are made
  useEffect(() => {
    if (selectedTransactionIds.length > 0 && !showBulkPanel) {
      setShowBulkPanel(true);
    } else if (selectedTransactionIds.length === 0 && showBulkPanel) {
      setShowBulkPanel(false);
      setBulkCategory('');
    }
  }, [selectedTransactionIds.length]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { getAccounts } = await import('../utils/api');
      const [transactionsData, categoriesData, accountsData] = await Promise.all([
        getTransactions(),
        getCategories(),
        getAccounts()
      ]);
      setTransactions(transactionsData.transactions);
      setAvailableCategories(categoriesData.categories);
      setAccounts(accountsData.accounts || []);
    } catch (err) {
      setError('Failed to load transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const handleUpdateCategory = async (transactionId, category, updateSimilar, computable) => {
    const result = await updateTransactionCategory(transactionId, category, updateSimilar, computable);
    return result;
  };

  const handleModalClose = (shouldRefresh) => {
    setShowModal(false);
    setSelectedTransaction(null);
    if (shouldRefresh) {
      fetchTransactions();
      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent('transactionUpdated'));
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredTransactions.map(t => t.id);
      setSelectedTransactionIds(allIds);
    } else {
      setSelectedTransactionIds([]);
    }
  };

  const handleSelectTransaction = (transactionId) => {
    setSelectedTransactionIds(prev => {
      if (prev.includes(transactionId)) {
        return prev.filter(id => id !== transactionId);
      } else {
        return [...prev, transactionId];
      }
    });
  };

  const handleBulkUpdate = async () => {
    if (selectedTransactionIds.length === 0) {
      setError('Por favor selecciona al menos una transacción');
      return;
    }
    if (!bulkCategory) {
      setError('Por favor selecciona una categoría');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const result = await bulkUpdateTransactionCategory(selectedTransactionIds, bulkCategory, bulkComputable);
      setSelectedTransactionIds([]);
      setBulkCategory('');
      setShowBulkPanel(false);
      fetchTransactions();
      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent('transactionUpdated'));
    } catch (error) {
      console.error('Error updating transactions:', error);
      setError('Error al actualizar transacciones');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleCancelBulkUpdate = () => {
    setSelectedTransactionIds([]);
    setBulkCategory('');
    setShowBulkPanel(false);
  };

  const handleBulkDelete = async () => {
    if (selectedTransactionIds.length === 0) {
      setError('Por favor selecciona al menos una transacción');
      return;
    }

    const count = selectedTransactionIds.length;
    const confirmMessage = `¿Estás seguro de que quieres eliminar ${count} transacción${count > 1 ? 'es' : ''}? Esta acción no se puede deshacer.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsBulkDeleting(true);
    setError('');
    
    try {
      // Delete transactions one by one
      const deletePromises = selectedTransactionIds.map(id => deleteTransaction(id));
      await Promise.all(deletePromises);
      
      // Clear selections
      setSelectedTransactionIds([]);
      setShowBulkPanel(false);
      
      // Refresh transactions
      fetchTransactions();
      
      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent('transactionUpdated'));
    } catch (err) {
      console.error('Error deleting transactions:', err);
      setError(`Error al eliminar transacciones. Algunas pueden haber sido eliminadas.`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta transacción? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await deleteTransaction(transactionId);
      fetchTransactions();
      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent('transactionUpdated'));
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Error al eliminar la transacción');
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Bank filter
    if (filterBank !== 'all') {
      filtered = filtered.filter(t => {
        const accountName = t.account_name || t.bank || '';
        return accountName.toLowerCase().includes(filterBank.toLowerCase()) || 
               (t.bank && t.bank.toLowerCase() === filterBank.toLowerCase());
      });
    }

    // Month filter
    if (filterMonth !== 'all') {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
        return transactionMonth === filterMonth;
      });
    }

    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get unique values for filters
  const categories = ['all', ...new Set(transactions.map(t => t.category))];
  const banks = ['all', ...new Set(transactions.map(t => t.account_name || t.bank).filter(Boolean))];
  
  // Get unique months from transactions (format: YYYY-MM)
  const availableMonths = ['all', ...new Set(
    transactions.map(t => {
      const date = new Date(t.date);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    })
  )].sort().reverse(); // Sort descending (most recent first)
  
  // Format month for display (e.g., "2025-01" -> "Enero 2025")
  const formatMonthDisplay = (monthString) => {
    if (monthString === 'all') return t('allMonths') || 'Todos los meses';
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gradient">
              {t('transactions') || 'Transactions'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {filteredTransactions.length} of {transactions.length} transactions
            </p>
          </div>
          
          {/* Export Buttons */}
          <div className="flex space-x-3">
            <button onClick={exportCSV} className="btn-secondary btn-sm flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>{t('exportCSV')}</span>
            </button>
            <button onClick={exportExcel} className="btn-secondary btn-sm flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>{t('exportExcel')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchTransactions')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-primary pl-10"
          />
          </div>

          {/* Month Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="input-primary pl-10"
            >
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {formatMonthDisplay(month)}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-primary"
          >
            <option value="all">{t('allTypes')}</option>
            <option value="income">{t('income')}</option>
            <option value="expense">{t('expense')}</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-primary"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? t('allCategories') : cat}
              </option>
            ))}
          </select>

          {/* Bank Filter */}
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="input-primary"
          >
            {banks.map(bank => (
              <option key={bank} value={bank}>
                {bank === 'all' ? t('allBanks') : bank}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Applied Indicator */}
      {initialFilters && Object.keys(initialFilters).length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Filtro aplicado desde Budget: 
              {initialFilters.category && (
                <span className="ml-2 px-2 py-1 bg-blue-200 dark:bg-blue-800 rounded text-xs font-bold">
                  {initialFilters.category}
                </span>
              )}
            </span>
          </div>
          <button
            onClick={() => {
              setFilterCategory('all');
              setFilterType('all');
              setFilterBank('all');
              setFilterMonth('all');
              setSearchTerm('');
              if (onFiltersCleared) onFiltersCleared();
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 dark:text-red-400 font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Bulk Update Panel */}
      {showBulkPanel && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Tag className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Actualización Masiva
              </h3>
              <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm font-bold">
                {selectedTransactionIds.length} seleccionadas
              </span>
            </div>
            <button
              onClick={handleCancelBulkUpdate}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nueva Categoría
              </label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full input-primary"
              >
                <option value="">Selecciona categoría...</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="bulkComputable"
                checked={bulkComputable}
                onChange={(e) => setBulkComputable(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="bulkComputable" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Incluir en estadísticas
              </label>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleBulkUpdate}
                disabled={!bulkCategory || isBulkUpdating || isBulkDeleting}
                className="flex-1 btn-premium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkUpdating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Actualizar {selectedTransactionIds.length} transacciones
                  </>
                )}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkUpdating || isBulkDeleting}
                className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar {selectedTransactionIds.length} transacciones</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden p-0 border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="table-premium w-full" style={{ minWidth: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th className="px-1 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedTransactionIds.length === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    title="Seleccionar todas"
                  />
                </th>
                <th className="px-1 py-3 w-20 text-base font-semibold">{t('date')}</th>
                <th className="px-1 py-3 w-[400px] text-base font-semibold">{t('description')}</th>
                <th className="px-1 py-3 w-24 text-base font-semibold">{t('category')}</th>
                <th className="px-1 py-3 w-48 text-base font-semibold">{t('bank')}</th>
                <th className="px-2 py-3 text-right w-28 text-base font-semibold">{t('amount')}</th>
                <th className="px-2 py-3 w-20 text-center text-base font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <p className="text-gray-500">{t('noDataDescription')}</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction, index) => (
                  <tr 
                    key={index} 
                    className={`group ${selectedTransactionIds.includes(transaction.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                  >
                    <td className="px-1 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTransactionIds.includes(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-1 py-3 whitespace-nowrap">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(transaction.date)}
                      </span>
                    </td>
                    <td className="px-1 py-3">
                      <div className="flex items-center gap-1">
                        {(() => {
                          const account = accounts.find(acc => acc.id === transaction.account_id);
                          const isTransfer = transaction.category === 'Transferencias';
                          
                          if (isTransfer) {
                            return <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" title="Transferencia" />;
                          }
                          
                          return account?.account_type === 'credit' && (
                            <CreditCard className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" title="Transacción de tarjeta de crédito" />
                          );
                        })()}
                        <span 
                          className="text-sm text-gray-800 dark:text-gray-200 truncate cursor-help" 
                          title={`Full Description: ${transaction.description}${transaction.account_name ? `\n\nAccount: ${transaction.account_name}` : ''}${transaction.bank ? `\nBank: ${transaction.bank}` : ''}${transaction.date ? `\nDate: ${new Date(transaction.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}${transaction.amount ? `\nAmount: ${formatCurrency(parseFloat(transaction.amount))}` : ''}${transaction.category ? `\nCategory: ${transaction.category}` : ''}`}
                        >
                          {transaction.description.substring(0, 100)}
                          {transaction.description.length > 100 && '...'}
                        </span>
                        {transaction.computable === false && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded border border-gray-300 dark:border-gray-600" title="No se incluye en estadísticas">
                            NC
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-3">
                      <button
                        onClick={() => handleCategoryClick(transaction)}
                        className={`${getCategoryColor(transaction.category)} hover:scale-105 transform transition-transform cursor-pointer hover:shadow-lg flex items-center gap-1`}
                        title={t('clickToReassign') || 'Click para reasignar categoría'}
                      >
                        {React.createElement(getCategoryIcon(transaction.category), {
                          className: "w-4 h-4"
                        })}
                        <span className="text-xs truncate max-w-[80px]">{transaction.category}</span>
                      </button>
                    </td>
                    <td className="px-1 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap" title={transaction.account_name || transaction.bank}>
                        {transaction.account_name || transaction.bank}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span className={`font-bold text-lg whitespace-nowrap ${
                        transaction.type === 'income' 
                          ? 'text-gradient-success' 
                          : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(parseFloat(transaction.amount))}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center" style={{ width: '80px', minWidth: '80px' }}>
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200 border-2 border-red-400 dark:border-red-600 bg-red-50/50 dark:bg-red-900/10"
                        title="Eliminar transacción"
                        aria-label="Delete transaction"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      {filteredTransactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('totalIncome')}</span>
            </div>
            <p className="text-2xl font-bold text-gradient-success">
              {formatCurrency(
                filteredTransactions
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0)
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {filteredTransactions.filter(t => t.type === 'income').length} {t('transactionsCount')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('totalExpenses')}</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(
                filteredTransactions
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0)
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {filteredTransactions.filter(t => t.type === 'expense').length} {t('transactionsCount')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('netBalance')}</span>
            </div>
            <p className={`text-2xl font-bold ${
              filteredTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0) -
              filteredTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0) >= 0
                ? 'text-gradient-success'
                : 'text-red-600'
            }`}>
              {formatCurrency(
                filteredTransactions
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0) -
                filteredTransactions
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0)
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('fromFiltered')}
            </p>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showModal && (
        <CategoryModal
          transaction={selectedTransaction}
          categories={availableCategories}
          onClose={handleModalClose}
          onUpdate={handleUpdateCategory}
        />
      )}
    </div>
  );
}

export default Transactions;

