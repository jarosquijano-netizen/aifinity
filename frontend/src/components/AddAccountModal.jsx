import React, { useState, useEffect } from 'react';
import { X, Info, Wallet, PiggyBank, TrendingUp, CreditCard } from 'lucide-react';

function AddAccountModal({ account, onClose, onSave }) {
  const accountTypes = [
    { value: 'checking', label: 'Cuenta Corriente', icon: Wallet, color: '#3b82f6', description: 'Para gastos diarios' },
    { value: 'savings', label: 'Cuenta de Ahorro', icon: PiggyBank, color: '#22c55e', description: 'Para ahorrar dinero' },
    { value: 'investment', label: 'Inversión', icon: TrendingUp, color: '#8b5cf6', description: 'Acciones, fondos, cripto' },
    { value: 'credit', label: 'Tarjeta de Crédito', icon: CreditCard, color: '#ef4444', description: 'Crédito y deudas' }
  ];

  const [formData, setFormData] = useState({
    name: '',
    accountType: 'checking',
    color: '#3b82f6',
    initialAmount: 0,
    currency: 'EUR',
    excludeFromStats: false,
    creditLimit: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        accountType: account.account_type || 'checking',
        color: account.color || '#3b82f6',
        initialAmount: Math.abs(parseFloat(account.balance)) || 0,
        currency: account.currency || 'EUR',
        excludeFromStats: account.exclude_from_stats || false,
        creditLimit: parseFloat(account.credit_limit) || 0
      });
    }
  }, [account]);

  // Update color when account type changes
  useEffect(() => {
    const selectedType = accountTypes.find(t => t.value === formData.accountType);
    if (selectedType && !account) {
      setFormData(prev => ({ ...prev, color: selectedType.color }));
    }
  }, [formData.accountType, account]);

  const currencies = [
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Account name is required');
      return;
    }

    setLoading(true);

    try {
      console.log('💾 Saving account with data:', formData);
      console.log('   - Credit Limit:', formData.creditLimit);
      console.log('   - Current Debt:', formData.initialAmount);
      await onSave(formData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save account');
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {account ? 'Edit Account' : 'Add Account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name and Color Row */}
          <div className="flex space-x-4">
            {/* Name */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Account name"
                required
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <span className="text-xs text-gray-600">{formData.color}</span>
              </div>
            </div>
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Cuenta
            </label>
            <div className="grid grid-cols-2 gap-3">
              {accountTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.accountType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('accountType', type.value)}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${type.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: type.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{type.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Initial Amount and Currency Row */}
          <div className="flex space-x-4">
            {/* Initial Amount */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.accountType === 'credit' ? 'Current Debt' : 'Initial Amount'}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.initialAmount}
                onChange={(e) => handleChange('initialAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {formData.accountType === 'credit' && (
                <p className="text-xs text-gray-500 mt-1">
                  Enter as positive number (e.g., 1226.75)
                </p>
              )}
            </div>

            {/* Currency */}
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Credit Limit - Only for Credit Cards */}
          {formData.accountType === 'credit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Limit <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.creditLimit}
                onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="2000"
                required={formData.accountType === 'credit'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum credit available on this card
              </p>
            </div>
          )}

          {/* Exclude from statistics */}
          <div className="flex items-start space-x-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.excludeFromStats}
                onChange={(e) => handleChange('excludeFromStats', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Exclude from statistics</span>
                <Info className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This account won't be included in reports and statistics
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (account ? 'Update account' : 'Create account')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddAccountModal;





