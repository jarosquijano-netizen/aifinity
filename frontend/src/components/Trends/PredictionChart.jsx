import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';
import { useChartTheme } from '../DarkModeChart';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

function PredictionChart({ data, language = 'es' }) {
  const chartTheme = useChartTheme();

  const t = {
    es: {
      actualSpending: 'Gasto Real',
      prediction: 'Predicci\u00F3n',
      budgetLimit: 'L\u00EDmite Budget',
      today: 'Hoy',
      previousMonth: 'Mes Anterior',
      day: 'D\u00EDa',
      confidenceBand: 'Banda de Confianza'
    },
    en: {
      actualSpending: 'Actual Spending',
      prediction: 'Prediction',
      budgetLimit: 'Budget Limit',
      today: 'Today',
      previousMonth: 'Previous Month',
      day: 'Day',
      confidenceBand: 'Confidence Band'
    }
  }[language];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const actualValue = payload.find(p => p.dataKey === 'actual')?.value;
    const predictedValue = payload.find(p => p.dataKey === 'predicted')?.value;
    const prevMonth1 = payload.find(p => p.dataKey === 'prevMonth1')?.value;

    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t.day} {label}
        </p>
        {actualValue !== null && actualValue !== undefined && (
          <p className="text-blue-600 dark:text-blue-400">
            {t.actualSpending}: {formatCurrency(actualValue)}
          </p>
        )}
        {predictedValue !== null && predictedValue !== undefined && (
          <p className="text-blue-400 dark:text-blue-300">
            {t.prediction}: {formatCurrency(predictedValue)}
          </p>
        )}
        {prevMonth1 !== null && prevMonth1 !== undefined && (
          <p className="text-gray-400 dark:text-gray-500">
            {t.previousMonth}: {formatCurrency(prevMonth1)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {language === 'es' ? 'Proyecci\u00F3n de Gasto Acumulado' : 'Cumulative Spending Projection'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'es' ? 'Gasto real vs predicci\u00F3n hasta fin de mes' : 'Actual spending vs prediction until month end'}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data.dailyProjection}>
          <defs>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} opacity={0.3} />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: chartTheme.textColor }}
            stroke={chartTheme.axisColor}
            label={{
              value: t.day,
              position: 'insideBottom',
              offset: -5,
              fill: chartTheme.textColor
            }}
          />

          <YAxis
            tick={{ fontSize: 12, fill: chartTheme.textColor }}
            stroke={chartTheme.axisColor}
            tickFormatter={(value) => formatCurrency(value)}
          />

          {/* Confidence band (high prediction) */}
          <Area
            dataKey="predictedHigh"
            stroke="none"
            fill="url(#confidenceGradient)"
            fillOpacity={1}
            name={t.confidenceBand}
          />

          {/* Previous months for reference */}
          <Line
            dataKey="prevMonth1"
            stroke="#9ca3af"
            strokeWidth={1}
            dot={false}
            strokeDasharray="4 4"
            name={t.previousMonth}
          />

          {/* Actual spending line */}
          <Line
            dataKey="actual"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            name={t.actualSpending}
            connectNulls={false}
          />

          {/* Predicted spending line */}
          <Line
            dataKey="predicted"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
            name={t.prediction}
            connectNulls={false}
          />

          {/* Budget limit reference line */}
          {data.monthlyBudget > 0 && (
            <ReferenceLine
              y={data.monthlyBudget}
              stroke="#ef4444"
              strokeDasharray="8 4"
              strokeWidth={2}
              label={{
                value: t.budgetLimit,
                fill: '#ef4444',
                fontSize: 12,
                position: 'right'
              }}
            />
          )}

          {/* Today marker */}
          <ReferenceLine
            x={data.dayOfMonth}
            stroke="#f59e0b"
            strokeWidth={2}
            label={{
              value: t.today,
              fill: '#f59e0b',
              fontSize: 12,
              position: 'top'
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-400">{t.actualSpending}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-blue-600 border-dashed border-b-2 border-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-400">{t.prediction}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-red-500 border-dashed border-b-2 border-red-500"></div>
          <span className="text-gray-600 dark:text-gray-400">{t.budgetLimit}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-200 opacity-50"></div>
          <span className="text-gray-600 dark:text-gray-400">{t.confidenceBand}</span>
        </div>
      </div>
    </div>
  );
}

export default PredictionChart;
