import React from 'react';
import { Calendar, AlertCircle } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

function PendingPaymentsList({ payments, total, language = 'es' }) {
  const t = {
    es: {
      title: 'Pagos esperados antes de fin de mes',
      expectedDay: 'D\u00EDa',
      confidence: 'confianza',
      totalExpected: 'Total previsto',
      noPayments: 'No se detectaron pagos recurrentes pendientes',
      basedOnHistory: 'Basado en tu historial de transacciones'
    },
    en: {
      title: 'Expected payments before month end',
      expectedDay: 'Day',
      confidence: 'confidence',
      totalExpected: 'Total expected',
      noPayments: 'No pending recurring payments detected',
      basedOnHistory: 'Based on your transaction history'
    }
  }[language];

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  };

  if (!payments || payments.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t.title}
          </h3>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t.noPayments}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.basedOnHistory}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-amber-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {t.title}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t.expectedDay}
              </th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'Descripci\u00F3n' : 'Description'}
              </th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'Monto Est.' : 'Est. Amount'}
              </th>
              <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t.confidence}
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => (
              <tr
                key={index}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                        {payment.expectedDay}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                      {payment.description}
                    </p>
                    {payment.category && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {payment.category}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ~{formatCurrency(payment.estimatedAmount)}
                  </span>
                </td>
                <td className="py-3 px-2 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(payment.confidence)}`}>
                    {payment.confidence}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 dark:border-gray-600">
              <td colSpan="2" className="py-3 px-2">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {t.totalExpected}:
                </span>
              </td>
              <td className="py-3 px-2 text-right">
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  ~{formatCurrency(total)}
                </span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default PendingPaymentsList;
