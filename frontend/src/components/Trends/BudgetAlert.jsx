import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

function BudgetAlert({ data, language = 'es' }) {
  const t = {
    es: {
      alertTitle: 'ALERTA: Se proyecta exceder el budget en',
      onTrackTitle: 'En camino de cumplir el presupuesto',
      monthlyBudget: 'Budget mensual',
      currentSpend: 'Gasto actual',
      predictedSpend: 'Gasto previsto',
      totalProjected: 'Total proyectado',
      withinBudget: 'Dentro del budget',
      overBudget: 'Sobre el budget',
      progress: 'Progreso'
    },
    en: {
      alertTitle: 'ALERT: Projected to exceed budget by',
      onTrackTitle: 'On track to meet budget',
      monthlyBudget: 'Monthly budget',
      currentSpend: 'Current spend',
      predictedSpend: 'Predicted spend',
      totalProjected: 'Total projected',
      withinBudget: 'Within budget',
      overBudget: 'Over budget',
      progress: 'Progress'
    }
  }[language];

  if (data.monthlyBudget <= 0) {
    return null; // Don't show if no budget set
  }

  const isOverBudget = data.willExceedBudget;
  const progressPercent = Math.min(100, data.budgetProgress);

  return (
    <div className={`rounded-2xl shadow-lg p-4 sm:p-6 border ${
      isOverBudget
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {isOverBudget ? (
          <>
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-bold text-red-800 dark:text-red-200">
              {t.alertTitle} {formatCurrency(data.projectedOverspend)}
            </h3>
          </>
        ) : (
          <>
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
              {t.onTrackTitle}
            </h3>
          </>
        )}
      </div>

      {/* Budget breakdown */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{t.monthlyBudget}:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatCurrency(data.monthlyBudget)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{t.currentSpend}:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatCurrency(data.spentSoFar)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{t.predictedSpend}:</span>
          <span className="font-medium text-amber-600 dark:text-amber-400">
            {formatCurrency(data.totalPredictedRemaining)}
          </span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {t.totalProjected}:
            </span>
            <span className={`font-bold ${
              isOverBudget
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {formatCurrency(data.projectedTotalSpend)}
              {' '}
              {isOverBudget ? (
                <span className="text-xs">({t.overBudget})</span>
              ) : (
                <span className="text-xs">({t.withinBudget})</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">{t.progress}</span>
          <span className={`font-medium ${
            progressPercent >= 100
              ? 'text-red-600 dark:text-red-400'
              : progressPercent >= 80
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
            {progressPercent.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent >= 100
                ? 'bg-red-500'
                : progressPercent >= 80
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
        {progressPercent > 100 && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400 text-right">
            +{(progressPercent - 100).toFixed(0)}% {language === 'es' ? 'sobre el l\u00EDmite' : 'over limit'}
          </div>
        )}
      </div>
    </div>
  );
}

export default BudgetAlert;
