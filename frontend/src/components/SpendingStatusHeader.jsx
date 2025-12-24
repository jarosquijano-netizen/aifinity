import React, { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormat';

const SpendingStatusHeader = ({ 
  balance = 0, 
  monthlyBudget = 0, 
  totalSpent = 0, 
  expectedIncome = 0,
  actualIncome = 0,
  language = 'es'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Calculate metrics
  const budgetRemaining = monthlyBudget - totalSpent;
  const isOverBudget = budgetRemaining < 0;
  const isWarning = budgetRemaining > 0 && budgetRemaining < (monthlyBudget * 0.1);
  const isGood = budgetRemaining >= (monthlyBudget * 0.1);
  const incomePercentage = expectedIncome > 0 ? (actualIncome / expectedIncome) * 100 : 0;
  const incomeReceived = incomePercentage >= 100;

  // Get days remaining in month
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysRemaining = Math.max(0, lastDay.getDate() - today.getDate());

  // Determine status
  const getStatusConfig = () => {
    if (isOverBudget) {
      return {
        color: 'red',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-700',
        textColor: 'text-red-700 dark:text-red-300',
        icon: AlertCircle,
        iconColor: 'text-red-500 dark:text-red-400',
        status: language === 'es' ? 'EXCEDIDO' : 'EXCEEDED',
        statusBg: 'bg-red-100 dark:bg-red-900/30',
        emoji: '🔴',
        message: language === 'es' 
          ? 'Has excedido tu presupuesto. Enfócate solo en lo esencial.'
          : 'You\'ve overspent your budget. Focus on essentials only.',
        action: language === 'es' ? 'DETENER' : 'STOP'
      };
    } else if (isWarning) {
      return {
        color: 'yellow',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-700',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        icon: AlertTriangle,
        iconColor: 'text-yellow-500 dark:text-yellow-400',
        status: language === 'es' ? 'ADVERTENCIA' : 'WARNING',
        statusBg: 'bg-yellow-100 dark:bg-yellow-900/30',
        emoji: '🟡',
        message: language === 'es'
          ? 'Estás cerca del límite de tu presupuesto. Ten cuidado con los gastos.'
          : 'You\'re close to your budget limit. Be cautious with spending.',
        action: language === 'es' ? 'PRECAUCIÓN' : 'CAUTION'
      };
    } else {
      return {
        color: 'green',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-700',
        textColor: 'text-green-700 dark:text-green-300',
        icon: CheckCircle,
        iconColor: 'text-green-500 dark:text-green-400',
        status: language === 'es' ? 'EN CONTROL' : 'ON TRACK',
        statusBg: 'bg-green-100 dark:bg-green-900/30',
        emoji: '🟢',
        message: language === 'es'
          ? 'Estás dentro del presupuesto. Continúa monitoreando tus gastos.'
          : 'You\'re within budget. Continue monitoring your spending.',
        action: language === 'es' ? 'CONTINUAR' : 'GO'
      };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  const monthName = today.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' });
  const daysRemainingText = language === 'es' ? `${daysRemaining} días restantes` : `${daysRemaining} days remaining`;

  return (
    <div className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-6 mb-6 transition-all`}>
      {/* Header - Clickable to collapse/expand */}
      <div 
        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3 flex-1">
          <StatusIcon className={`w-8 h-8 ${config.iconColor}`} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {language === 'es' ? 'Estado de Gastos del Mes' : 'This Month\'s Spending Status'} {config.emoji}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {monthName} • {daysRemainingText}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-lg ${config.statusBg} ${config.textColor} font-bold text-sm`}>
            {config.status}
          </div>
          <div className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="mt-6">

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Balance Available */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
            {language === 'es' ? 'Balance Disponible' : 'Balance Available'}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(balance)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {language === 'es' ? 'En tus cuentas' : 'In your accounts'}
          </p>
        </div>

        {/* Income Status */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
            {language === 'es' ? 'Estado de Ingresos' : 'Income Status'}
          </p>
          <div className="flex items-baseline gap-2">
            {incomeReceived ? (
              <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            )}
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {incomePercentage.toFixed(0)}%
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {formatCurrency(actualIncome)} {language === 'es' ? 'de' : 'of'} {formatCurrency(expectedIncome)}
          </p>
        </div>

        {/* Budget Health */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
            {language === 'es' ? 'Salud del Presupuesto' : 'Budget Health'}
          </p>
          <div className="flex items-baseline gap-2">
            <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
            <p className={`text-3xl font-bold ${isOverBudget ? 'text-red-600 dark:text-red-400' : config.textColor}`}>
              {isOverBudget ? '-' : ''}
              {formatCurrency(Math.abs(budgetRemaining))}
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {isOverBudget 
              ? (language === 'es' ? 'Sobre presupuesto' : 'Over budget')
              : (language === 'es' ? 'Presupuesto restante' : 'Remaining budget')
            }
          </p>
        </div>
      </div>

      {/* Budget Breakdown Bar */}
      {monthlyBudget > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {language === 'es' ? 'Utilización del Presupuesto' : 'Budget Utilization'}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {((totalSpent / monthlyBudget) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                isOverBudget ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((totalSpent / monthlyBudget) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>
              {language === 'es' ? 'Gastado:' : 'Spent:'} {formatCurrency(totalSpent)}
            </span>
            <span>
              {language === 'es' ? 'Presupuesto:' : 'Budget:'} {formatCurrency(monthlyBudget)}
            </span>
          </div>
        </div>
      )}

      {/* Spending Recommendation */}
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 border-l-4 ${config.borderColor}`}>
        <div className="flex items-start gap-3">
          <div className={`px-3 py-1 rounded-md ${config.statusBg} ${config.textColor} font-bold text-xs`}>
            {config.action}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {language === 'es' ? 'Recomendación de Gastos:' : 'Spending Recommendation:'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{config.message}</p>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default SpendingStatusHeader;

