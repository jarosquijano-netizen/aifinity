import React from 'react';
import { Wallet, TrendingDown, Clock, CheckCircle } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

function PredictionKPICards({ data, language = 'es' }) {
  const t = {
    es: {
      availableBalance: 'Saldo Disponible',
      spentThisMonth: 'Gastado Este Mes',
      predictedRemaining: 'Previsto Resto Mes',
      freeToSpend: 'Libre Para Gastar',
      ofBudget: 'de presupuesto',
      prediction: 'predicción',
      safe: 'seguro'
    },
    en: {
      availableBalance: 'Available Balance',
      spentThisMonth: 'Spent This Month',
      predictedRemaining: 'Predicted Remaining',
      freeToSpend: 'Free to Spend',
      ofBudget: 'of budget',
      prediction: 'prediction',
      safe: 'safe'
    }
  }[language];

  const cards = [
    {
      title: t.availableBalance,
      value: data.currentBalance,
      icon: Wallet,
      color: 'blue',
      subtitle: null
    },
    {
      title: t.spentThisMonth,
      value: data.spentSoFar,
      icon: TrendingDown,
      color: 'red',
      subtitle: data.monthlyBudget > 0 ? `${t.ofBudget} ${formatCurrency(data.monthlyBudget)}` : null
    },
    {
      title: t.predictedRemaining,
      value: data.totalPredictedRemaining,
      icon: Clock,
      color: 'amber',
      subtitle: `(${t.prediction})`
    },
    {
      title: t.freeToSpend,
      value: data.freeToSpend,
      icon: CheckCircle,
      color: data.freeToSpend > 0 ? 'green' : 'red',
      subtitle: `(${t.safe})`
    }
  ];

  const colorClasses = {
    blue: {
      bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      border: 'border-blue-200 dark:border-blue-700',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-700 dark:text-blue-300',
      value: 'text-blue-900 dark:text-blue-100',
      subtitle: 'text-blue-600 dark:text-blue-400'
    },
    red: {
      bg: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      border: 'border-red-200 dark:border-red-700',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-700 dark:text-red-300',
      value: 'text-red-900 dark:text-red-100',
      subtitle: 'text-red-600 dark:text-red-400'
    },
    amber: {
      bg: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20',
      border: 'border-amber-200 dark:border-amber-700',
      icon: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-700 dark:text-amber-300',
      value: 'text-amber-900 dark:text-amber-100',
      subtitle: 'text-amber-600 dark:text-amber-400'
    },
    green: {
      bg: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
      border: 'border-green-200 dark:border-green-700',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-700 dark:text-green-300',
      value: 'text-green-900 dark:text-green-100',
      subtitle: 'text-green-600 dark:text-green-400'
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const colors = colorClasses[card.color];
        const Icon = card.icon;

        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${colors.bg} rounded-2xl shadow-lg p-4 sm:p-6 border ${colors.border}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs sm:text-sm font-medium ${colors.title}`}>
                {card.title}
              </span>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.icon}`} />
            </div>
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${colors.value}`}>
              {formatCurrency(card.value)}
            </p>
            {card.subtitle && (
              <p className={`text-xs mt-1 ${colors.subtitle}`}>
                {card.subtitle}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PredictionKPICards;
