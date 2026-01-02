import React, { useState, useEffect } from 'react';
import { Loader, TrendingUp, TrendingDown, AlertCircle, Target } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import { getTrends, getSettings, getActualIncome } from '../utils/api';
import { useChartTheme } from './DarkModeChart';

function Trends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expectedIncome, setExpectedIncome] = useState(0);
  const chartTheme = useChartTheme();

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for transaction updates to refresh data
  useEffect(() => {
    const handleTransactionUpdate = () => {
      fetchData();
    };
    window.addEventListener('transactionUpdated', handleTransactionUpdate);
    return () => {
      window.removeEventListener('transactionUpdated', handleTransactionUpdate);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [trends, settings] = await Promise.all([
        getTrends(),
        getSettings().catch(() => ({ expectedMonthlyIncome: 0 }))
      ]);
      setData(trends);
      setExpectedIncome(settings.expectedMonthlyIncome || 0);
    } catch (err) {
      setError('Failed to load trends data');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!data || data.monthlyTrends.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center py-12">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Trends Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Upload transactions from multiple months to see trends.</p>
      </div>
    );
  }

  // Format month labels and calculate progress
  const formattedData = data.monthlyTrends.map((trend, index, arr) => {
    const prevBalance = index > 0 ? arr[index - 1].netBalance : 0;
    const balanceChange = trend.netBalance - prevBalance;
    const savingsRate = trend.income > 0 ? ((trend.netBalance / trend.income) * 100) : 0;
    
    return {
      ...trend,
      monthLabel: new Date(trend.month + '-01').toLocaleDateString('es-ES', { 
        month: 'short', 
        year: 'numeric' 
      }),
      balanceChange: index > 0 ? balanceChange : 0,
      savingsRate: savingsRate,
      trend: balanceChange >= 0 ? 'mejorando' : 'empeorando'
    };
  });

  // Calculate overall health
  const avgSavingsRate = formattedData.reduce((sum, d) => sum + d.savingsRate, 0) / formattedData.length;
  const positiveMonths = formattedData.filter(d => d.netBalance > 0).length;
  const totalMonths = formattedData.length;
  
  // Calculate average income and comparison with expected
  const avgActualIncome = formattedData.reduce((sum, d) => sum + d.income, 0) / formattedData.length;
  const incomeAchievementRate = expectedIncome > 0 ? (avgActualIncome / expectedIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Monthly Summary Table - NOW AT TOP */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700 overflow-x-hidden">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Resumen Mensual</h3>
        <div className="overflow-x-auto -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full" style={{ minWidth: '600px' }}>
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Mes</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Ingresos</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Gastos</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Balance</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Ahorro</th>
                <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</th>
              </tr>
            </thead>
            <tbody>
              {[...formattedData].reverse().map((trend, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                    {trend.monthLabel}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-success font-medium">
                    €{trend.income.toFixed(2)}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right text-danger font-medium">
                    €{trend.expenses.toFixed(2)}
                  </td>
                  <td className={`py-3 px-4 text-sm text-right font-bold ${
                    trend.netBalance >= 0 ? 'text-success' : 'text-danger'
                  }`}>
                    €{trend.netBalance.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trend.savingsRate >= 20 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      trend.savingsRate >= 10 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      trend.savingsRate >= 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {trend.savingsRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {trend.netBalance >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-success inline-block" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-danger inline-block" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Health Overview - NEW! */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl shadow-lg p-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Tasa de Ahorro Promedio</span>
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {avgSavingsRate.toFixed(1)}%
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {avgSavingsRate >= 20 ? '¡Excelente!' : avgSavingsRate >= 10 ? 'Bien' : 'Mejorable'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl shadow-lg p-6 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Meses Positivos</span>
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {positiveMonths}/{totalMonths}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {((positiveMonths/totalMonths)*100).toFixed(0)}% del tiempo
          </p>
        </div>

        <div className={`bg-gradient-to-br ${
          formattedData[formattedData.length - 1]?.balanceChange >= 0 
            ? 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700'
            : 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700'
        } rounded-2xl shadow-lg p-6 border`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${
              formattedData[formattedData.length - 1]?.balanceChange >= 0
                ? 'text-purple-700 dark:text-purple-300'
                : 'text-orange-700 dark:text-orange-300'
            }`}>Tendencia Actual</span>
            {formattedData[formattedData.length - 1]?.balanceChange >= 0 ? (
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            )}
          </div>
          <p className={`text-3xl font-bold ${
            formattedData[formattedData.length - 1]?.balanceChange >= 0
              ? 'text-purple-900 dark:text-purple-100'
              : 'text-orange-900 dark:text-orange-100'
          }`}>
            {formattedData[formattedData.length - 1]?.trend === 'mejorando' ? '📈 Mejorando' : '📉 Cuidado'}
          </p>
          <p className={`text-xs mt-1 ${
            formattedData[formattedData.length - 1]?.balanceChange >= 0
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            vs mes anterior
          </p>
        </div>

        {/* Expected Income Card */}
        {expectedIncome > 0 && (
          <div className={`bg-gradient-to-br ${
            incomeAchievementRate >= 100 
              ? 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700'
              : incomeAchievementRate >= 75
              ? 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700'
              : 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700'
          } rounded-2xl shadow-lg p-6 border`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${
                incomeAchievementRate >= 100
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : incomeAchievementRate >= 75
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>Income Achievement</span>
              <Target className={`w-5 h-5 ${
                incomeAchievementRate >= 100
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : incomeAchievementRate >= 75
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
            <p className={`text-3xl font-bold ${
              incomeAchievementRate >= 100
                ? 'text-emerald-900 dark:text-emerald-100'
                : incomeAchievementRate >= 75
                ? 'text-amber-900 dark:text-amber-100'
                : 'text-red-900 dark:text-red-100'
            }`}>
              {incomeAchievementRate.toFixed(1)}%
            </p>
            <p className={`text-xs mt-1 ${
              incomeAchievementRate >= 100
                ? 'text-emerald-600 dark:text-emerald-400'
                : incomeAchievementRate >= 75
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              €{avgActualIncome.toFixed(0)} vs €{expectedIncome.toFixed(0)}
            </p>
          </div>
        )}
      </div>

      {/* Monthly Trends - Area Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Ingresos vs Gastos Mensuales</h2>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: chartTheme.textColor }} stroke={chartTheme.axisColor} />
            <YAxis tick={{ fontSize: 12, fill: chartTheme.textColor }} stroke={chartTheme.axisColor} />
            <Tooltip 
              formatter={(value) => `€${value.toFixed(2)}`}
              contentStyle={{ 
                borderRadius: '12px', 
                border: `1px solid ${chartTheme.tooltipBorder}`,
                backgroundColor: chartTheme.tooltipBg,
                color: chartTheme.tooltipText
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="income" 
              stroke="#22c55e" 
              fillOpacity={1} 
              fill="url(#colorIncome)" 
              name="Ingresos"
            />
            <Area 
              type="monotone" 
              dataKey="expenses" 
              stroke="#ef4444" 
              fillOpacity={1} 
              fill="url(#colorExpenses)" 
              name="Gastos"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Progress - NEW CHART! */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Progreso Financiero</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cambio en tu balance mes a mes</p>
          </div>
          <AlertCircle className="w-5 h-5 text-gray-400" />
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 12, fill: chartTheme.textColor }}
              stroke={chartTheme.axisColor}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: chartTheme.textColor }}
              tickFormatter={(value) => `€${(value/1000).toFixed(1)}k`}
              stroke={chartTheme.axisColor}
            />
            <Tooltip 
              formatter={(value) => [`€${value.toFixed(2)}`, 'Cambio']}
              contentStyle={{ 
                borderRadius: '12px', 
                border: `1px solid ${chartTheme.tooltipBorder}`,
                backgroundColor: chartTheme.tooltipBg,
                color: chartTheme.tooltipText
              }}
            />
            <ReferenceLine 
              y={0} 
              stroke={chartTheme.textColor} 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <Bar dataKey="balanceChange" radius={[8, 8, 0, 0]}>
              {formattedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.balanceChange >= 0 ? '#22c55e' : '#ef4444'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Mejora (Balance +)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Empeora (Balance -)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Trends;


