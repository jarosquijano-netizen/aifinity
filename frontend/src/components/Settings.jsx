import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Loader, Building2, Brain, Key, CheckCircle, Circle, Wallet, PiggyBank, TrendingUp, CreditCard, RefreshCw, Clock, DollarSign, Zap } from 'lucide-react';
import { getAccounts, createAccount, updateAccount, deleteAccount, recalculateAccountBalance, getAIConfig, saveAIConfig, deleteAIConfig, activateAIConfig, getSettings, updateSettings, calculateExpectedIncome, updateExpectedFromActual } from '../utils/api';
import AddAccountModal from './AddAccountModal';

function Settings() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [recalculatingAccountId, setRecalculatingAccountId] = useState(null);

  // AI Configuration state
  const [aiConfigs, setAIConfigs] = useState([]);
  const [aiLoading, setAILoading] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  const [aiFormData, setAIFormData] = useState({
    provider: 'claude',
    apiKey: ''
  });
  const [aiError, setAIError] = useState('');
  const [aiSuccess, setAISuccess] = useState('');

  // Expected Income state
  const [expectedIncome, setExpectedIncome] = useState(0);
  const [savingIncome, setSavingIncome] = useState(false);
  const [incomeSuccess, setIncomeSuccess] = useState('');
  const [calculatingIncome, setCalculatingIncome] = useState(false);
  const [calculationData, setCalculationData] = useState(null);

  useEffect(() => {
    fetchAccounts();
    fetchAIConfigs();
    fetchSettings();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await getAccounts();
      setAccounts(data.accounts);
    } catch (err) {
      setError('Failed to load accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = () => {
    setEditingAccount(null);
    setShowAddModal(true);
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setShowAddModal(true);
  };

  const handleSaveAccount = async (accountData) => {
    try {
      console.log('🔧 Settings.handleSaveAccount called with:', accountData);
      console.log('   Keys in accountData:', Object.keys(accountData));
      console.log('   creditLimit value:', accountData.creditLimit);
      console.log('   initialAmount value:', accountData.initialAmount);
      
      if (editingAccount) {
        await updateAccount(editingAccount.id, accountData);
      } else {
        await createAccount(accountData);
      }
      fetchAccounts();
      setShowAddModal(false);
      setEditingAccount(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account?')) {
      return;
    }

    try {
      await deleteAccount(id);
      fetchAccounts();
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  const handleRecalculateBalance = async (id) => {
    try {
      setRecalculatingAccountId(id);
      setError('');
      await recalculateAccountBalance(id);
      fetchAccounts(); // Reload accounts to get updated balance
    } catch (err) {
      setError('Failed to recalculate balance');
      console.error(err);
    } finally {
      setRecalculatingAccountId(null);
    }
  };

  const getAccountIcon = (accountType) => {
    const iconMap = {
      'checking': Wallet,
      'savings': PiggyBank,
      'investment': TrendingUp,
      'credit': CreditCard
    };
    const Icon = iconMap[accountType] || Building2;
    return <Icon className="w-6 h-6 text-white" />;
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getBalanceSourceBadge = (source) => {
    const badges = {
      'csv': { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', label: '🟢 CSV' },
      'calculated': { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', label: '🔵 Calculado' },
      'manual': { color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', label: '🟡 Manual' }
    };
    return badges[source] || badges['manual'];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // AI Configuration functions
  const fetchAIConfigs = async () => {
    try {
      setAILoading(true);
      const data = await getAIConfig();
      setAIConfigs(data.configs);
    } catch (err) {
      console.error('Failed to load AI configs:', err);
    } finally {
      setAILoading(false);
    }
  };

  const handleSaveAIConfig = async (e) => {
    e.preventDefault();
    setAIError('');
    setAISuccess('');

    if (!aiFormData.provider || !aiFormData.apiKey) {
      setAIError('Provider and API key are required');
      return;
    }

    try {
      setAILoading(true);
      await saveAIConfig(aiFormData.provider, aiFormData.apiKey);
      setAISuccess('AI configuration saved successfully!');
      setShowAIForm(false);
      setAIFormData({ provider: 'claude', apiKey: '' });
      fetchAIConfigs();
      
      // Clear success message after 3 seconds
      setTimeout(() => setAISuccess(''), 3000);
    } catch (err) {
      setAIError(err.response?.data?.error || 'Failed to save AI configuration');
    } finally {
      setAILoading(false);
    }
  };

  const handleDeleteAIConfig = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this AI configuration?')) {
      return;
    }

    try {
      setAILoading(true);
      await deleteAIConfig(configId);
      setAISuccess('Configuration deleted successfully!');
      fetchAIConfigs();
      setTimeout(() => setAISuccess(''), 3000);
    } catch (err) {
      setAIError('Failed to delete configuration');
    } finally {
      setAILoading(false);
    }
  };

  const handleActivateAIConfig = async (configId) => {
    try {
      setAILoading(true);
      await activateAIConfig(configId);
      setAISuccess('Configuration activated successfully!');
      fetchAIConfigs();
      setTimeout(() => setAISuccess(''), 3000);
    } catch (err) {
      setAIError('Failed to activate configuration');
    } finally {
      setAILoading(false);
    }
  };

  const getProviderName = (provider) => {
    const names = {
      'openai': 'OpenAI (GPT-4)',
      'claude': 'Anthropic Claude',
      'gemini': 'Google Gemini'
    };
    return names[provider] || provider;
  };

  const getProviderColor = (provider) => {
    const colors = {
      'openai': '#10a37f',
      'claude': '#d97706',
      'gemini': '#4285f4'
    };
    return colors[provider] || '#6366f1';
  };

  // Expected Income functions
  const fetchSettings = async () => {
    try {
      const data = await getSettings();
      setExpectedIncome(data.expectedMonthlyIncome || 0);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSaveExpectedIncome = async () => {
    try {
      setSavingIncome(true);
      setIncomeSuccess('');
      await updateSettings({ expectedMonthlyIncome: expectedIncome });
      setIncomeSuccess('Expected income saved successfully!');
      setTimeout(() => setIncomeSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save expected income');
    } finally {
      setSavingIncome(false);
    }
  };

  const handleCalculateExpectedIncome = async () => {
    try {
      setCalculatingIncome(true);
      const data = await calculateExpectedIncome();
      setCalculationData(data);
    } catch (err) {
      console.error('Failed to calculate expected income:', err);
      setIncomeSuccess('❌ Failed to calculate. Need at least 3 months of income data.');
      setTimeout(() => setIncomeSuccess(''), 3000);
    } finally {
      setCalculatingIncome(false);
    }
  };

  const handleUpdateFromActual = async () => {
    try {
      setSavingIncome(true);
      setIncomeSuccess('');
      const result = await updateExpectedFromActual();
      setExpectedIncome(result.expectedMonthlyIncome);
      setCalculationData(null);
      setIncomeSuccess(`✅ Expected income updated to €${result.expectedMonthlyIncome.toFixed(2)} (average of last 3 months)`);
      setTimeout(() => setIncomeSuccess(''), 5000);
    } catch (err) {
      console.error('Failed to update expected income:', err);
      setIncomeSuccess('❌ Failed to update. Need at least 3 months of income data.');
      setTimeout(() => setIncomeSuccess(''), 3000);
    } finally {
      setSavingIncome(false);
    }
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
      <div className="card bg-white dark:bg-slate-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage your bank accounts and preferences</p>
      </div>

      {/* Accounts Section */}
      <div className="card bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Accounts</h3>
          <button
            onClick={handleAddAccount}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>

        {/* Show Archived Toggle */}
        <div className="flex items-center space-x-2 mb-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">Show Archived</span>
          </label>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-danger rounded-lg">
            {error}
          </div>
        )}

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts Yet</h3>
            <p className="text-gray-600 mb-4">Add your first bank account to get started</p>
            <button onClick={handleAddAccount} className="btn-primary">
              <Plus className="w-4 h-4 inline mr-2" />
              Add Account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Account Icon */}
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: account.color }}
                  >
                    {getAccountIcon(account.account_type)}
                  </div>

                  {/* Account Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {account.name}
                      </h4>
                      {account.account_type === 'savings' && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                          Ahorro
                        </span>
                      )}
                      {account.account_type === 'investment' && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded-full">
                          Inversión
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{account.account_type}</p>
                  </div>

                  {/* Status Badge */}
                  {account.exclude_from_stats && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                        Excluded from statistics
                      </span>
                    </div>
                  )}

                  {/* Balance Info */}
                  <div className="text-right mr-4">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(parseFloat(account.balance), account.currency)}
                      </p>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${getBalanceSourceBadge(account.balance_source).color}`}>
                        {getBalanceSourceBadge(account.balance_source).label}
                      </span>
                    </div>
                    {account.balance_updated_at && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 justify-end">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(account.balance_updated_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRecalculateBalance(account.id)}
                    disabled={recalculatingAccountId === account.id}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                    aria-label="Recalculate balance"
                    title="Recalcular balance desde transacciones"
                  >
                    {recalculatingAccountId === account.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEditAccount(account)}
                    className="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Edit account"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="p-2 text-gray-600 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Delete account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expected Monthly Income Section */}
      <div className="card bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              Expected Monthly Income
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Set your expected monthly income to track your financial goals
            </p>
          </div>
        </div>

        {/* Success Message */}
        {incomeSuccess && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {incomeSuccess}
          </div>
        )}

        {/* Input Form */}
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expected Income (€)
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              value={expectedIncome}
              onChange={(e) => setExpectedIncome(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-gray-100"
              placeholder="e.g. 3000"
            />
            <button
              onClick={handleSaveExpectedIncome}
              disabled={savingIncome}
              className="btn-primary flex items-center gap-2 min-w-[100px] justify-center"
            >
              {savingIncome ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            This will be used to calculate your income achievement ratio and financial goals
          </p>

          {/* Auto-Calculate from Actual Income */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  Auto-Calculate from Actual Income
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Calculate expected income based on average of last 3 months
                </p>
              </div>
              <button
                onClick={handleCalculateExpectedIncome}
                disabled={calculatingIncome}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {calculatingIncome ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Calculate</span>
                  </>
                )}
              </button>
            </div>

            {/* Calculation Results */}
            {calculationData && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Suggested Expected Income: 
                    <span className="ml-2 text-lg text-blue-600 dark:text-blue-400">
                      €{calculationData.suggestedExpectedIncome.toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Based on {calculationData.basedOnMonths} months of actual income
                  </p>
                </div>

                {/* Monthly breakdown */}
                <div className="space-y-2 mb-3">
                  {calculationData.monthsData.map((monthData, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{monthData.month}:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        €{monthData.income.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUpdateFromActual}
                  disabled={savingIncome}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {savingIncome ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Update Expected Income</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Configuration Section */}
      <div className="card bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              AI Assistant Configuration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure AI providers to enable the financial chatbot in Insights
            </p>
          </div>
          <button
            onClick={() => setShowAIForm(!showAIForm)}
            className="btn-primary flex items-center space-x-2"
            disabled={aiLoading}
          >
            <Plus className="w-4 h-4" />
            <span>Add Provider</span>
          </button>
        </div>

        {/* Success/Error Messages */}
        {aiSuccess && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {aiSuccess}
          </div>
        )}
        {aiError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            {aiError}
          </div>
        )}

        {/* Add Provider Form */}
        {showAIForm && (
          <div className="mb-6 p-6 bg-gray-50 dark:bg-slate-700 rounded-xl border-2 border-purple-200 dark:border-purple-800">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Add AI Provider
            </h4>
            <form onSubmit={handleSaveAIConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provider
                </label>
                <select
                  value={aiFormData.provider}
                  onChange={(e) => setAIFormData({ ...aiFormData, provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-gray-100"
                >
                  <option value="claude">Anthropic Claude</option>
                  <option value="openai">OpenAI (GPT-4)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={aiFormData.apiKey}
                  onChange={(e) => setAIFormData({ ...aiFormData, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-gray-100"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your API key is stored securely and never shared
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={aiLoading}
                >
                  {aiLoading ? 'Saving...' : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAIForm(false);
                    setAIFormData({ provider: 'claude', apiKey: '' });
                    setAIError('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AI Configurations List */}
        {aiLoading && aiConfigs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 text-purple-600 animate-spin" />
          </div>
        ) : aiConfigs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-700 rounded-xl">
            <Brain className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No AI Providers Configured</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add an AI provider to enable intelligent financial insights and chatbot
            </p>
            <button onClick={() => setShowAIForm(true)} className="btn-primary">
              <Plus className="w-4 h-4 inline mr-2" />
              Add Your First Provider
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {aiConfigs.map((config) => (
              <div
                key={config.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  config.is_active
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                    : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Provider Icon */}
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: getProviderColor(config.provider) }}
                  >
                    <Brain className="w-6 h-6 text-white" />
                  </div>

                  {/* Provider Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {getProviderName(config.provider)}
                      </h4>
                      {config.is_active && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      API Key: {config.api_key_preview}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {!config.is_active && (
                    <button
                      onClick={() => handleActivateAIConfig(config.id)}
                      className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors flex items-center gap-1"
                      disabled={aiLoading}
                    >
                      <Circle className="w-4 h-4" />
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAIConfig(config.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Delete configuration"
                    disabled={aiLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            How to get API keys:
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
            <li>• <strong>Claude:</strong> Get your API key at <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a></li>
            <li>• <strong>OpenAI:</strong> Get your API key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com/api-keys</a></li>
            <li>• <strong>Gemini:</strong> Get your API key at <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">makersuite.google.com</a></li>
          </ul>
        </div>
      </div>

      {/* Add/Edit Account Modal */}
      {showAddModal && (
        <AddAccountModal
          account={editingAccount}
          onClose={() => {
            setShowAddModal(false);
            setEditingAccount(null);
          }}
          onSave={handleSaveAccount}
        />
      )}
    </div>
  );
}

export default Settings;

