import React, { useState, useEffect } from 'react';
import { Loader, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { getSpendingPrediction } from '../../utils/api';
import PredictionKPICards from './PredictionKPICards';
import PredictionChart from './PredictionChart';
import PendingPaymentsList from './PendingPaymentsList';
import BudgetAlert from './BudgetAlert';

function SpendingPrediction({ language = 'es' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const t = {
    es: {
      title: 'Predicci\u00F3n de Gastos',
      subtitle: '\u00BFCu\u00E1nto dinero te queda realmente hasta fin de mes?',
      loading: 'Analizando tus patrones de gasto...',
      error: 'Error al cargar predicciones',
      retry: 'Reintentar',
      refresh: 'Actualizar',
      noData: 'No hay suficientes datos hist\u00F3ricos',
      noDataDesc: 'Necesitamos al menos 2 meses de transacciones para generar predicciones precisas.',
      confidence: 'Confianza de la predicci\u00F3n',
      daysRemaining: 'd\u00EDas restantes',
      basedOn: 'Basado en',
      monthsData: 'meses de datos'
    },
    en: {
      title: 'Spending Prediction',
      subtitle: 'How much money do you really have left until month end?',
      loading: 'Analyzing your spending patterns...',
      error: 'Error loading predictions',
      retry: 'Retry',
      refresh: 'Refresh',
      noData: 'Not enough historical data',
      noDataDesc: 'We need at least 2 months of transactions to generate accurate predictions.',
      confidence: 'Prediction confidence',
      daysRemaining: 'days remaining',
      basedOn: 'Based on',
      monthsData: 'months of data'
    }
  }[language];

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSpendingPrediction();
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || t.error);
      }
    } catch (err) {
      console.error('Error fetching prediction:', err);
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, []);

  // Listen for transaction updates
  useEffect(() => {
    const handleTransactionUpdate = () => {
      fetchPrediction();
    };
    window.addEventListener('transactionUpdated', handleTransactionUpdate);
    return () => {
      window.removeEventListener('transactionUpdated', handleTransactionUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchPrediction}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.monthsOfData < 1) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t.noData}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            {t.noDataDesc}
          </p>
        </div>
      </div>
    );
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
    if (confidence >= 50) return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gradient flex items-center gap-2">
              <TrendingUp className="w-8 h-8" />
              {t.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              {t.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Confidence badge */}
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${getConfidenceColor(data.confidence)}`}>
              {t.confidence}: {data.confidence}%
            </div>
            {/* Days remaining badge */}
            <div className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              {data.daysRemaining} {t.daysRemaining}
            </div>
            {/* Refresh button */}
            <button
              onClick={fetchPrediction}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t.refresh}
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        {/* Data source info */}
        <p className="text-xs text-gray-400 mt-2">
          {t.basedOn} {data.monthsOfData} {t.monthsData}
        </p>
      </div>

      {/* KPI Cards */}
      <PredictionKPICards data={data} language={language} />

      {/* Budget Alert */}
      <BudgetAlert data={data} language={language} />

      {/* Main Chart */}
      <PredictionChart data={data} language={language} />

      {/* Pending Payments */}
      <PendingPaymentsList
        payments={data.pendingRecurring}
        total={data.pendingRecurringTotal}
        language={language}
      />
    </div>
  );
}

export default SpendingPrediction;
