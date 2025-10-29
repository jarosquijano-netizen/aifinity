import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';

function TransferModal({ isOpen, onClose, accounts, onTransfer }) {
  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: 'Transferencia entre cuentas'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Filter out credit cards (only allow transfers between regular accounts)
  const transferableAccounts = accounts.filter(acc => acc.account_type !== 'credit');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fromAccountId || !formData.toAccountId) {
      setError('Selecciona ambas cuentas');
      return;
    }

    if (formData.fromAccountId === formData.toAccountId) {
      setError('No puedes transferir a la misma cuenta');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    setLoading(true);

    try {
      await onTransfer(
        formData.fromAccountId,
        formData.toAccountId,
        parseFloat(formData.amount),
        formData.date,
        formData.description
      );

      // Reset form
      setFormData({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: 'Transferencia entre cuentas'
      });
      
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear transferencia');
    } finally {
      setLoading(false);
    }
  };

  const fromAccount = transferableAccounts.find(a => a.id.toString() === formData.fromAccountId);
  const toAccount = transferableAccounts.find(a => a.id.toString() === formData.toAccountId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            🔄 Nueva Transferencia
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* From Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Desde
            </label>
            <select
              value={formData.fromAccountId}
              onChange={(e) => setFormData({ ...formData, fromAccountId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Selecciona cuenta origen</option>
              {transferableAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} - €{parseFloat(account.balance).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-3">
              <ArrowRight className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>

          {/* To Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hacia
            </label>
            <select
              value={formData.toAccountId}
              onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Selecciona cuenta destino</option>
              {transferableAccounts
                .filter(acc => acc.id.toString() !== formData.fromAccountId)
                .map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} - €{parseFloat(account.balance).toFixed(2)}
                  </option>
                ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-500 dark:text-gray-400">€</span>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
                required
              />
            </div>
            {fromAccount && formData.amount && parseFloat(formData.amount) > parseFloat(fromAccount.balance) && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                ⚠️ El monto excede el saldo disponible
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              placeholder="Ej: Ahorro mensual"
            />
          </div>

          {/* Summary */}
          {formData.fromAccountId && formData.toAccountId && formData.amount && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Resumen
              </p>
              <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <div className="flex justify-between">
                  <span>{fromAccount?.name}:</span>
                  <span className="font-semibold">-€{parseFloat(formData.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{toAccount?.name}:</span>
                  <span className="font-semibold text-green-600">+€{parseFloat(formData.amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.fromAccountId || !formData.toAccountId || !formData.amount}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransferModal;


