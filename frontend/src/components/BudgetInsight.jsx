import React from 'react';
import { Lightbulb, Loader } from 'lucide-react';

/**
 * Budget Insight Component
 * Displays AI-generated or template-based insights for budget categories
 */
const BudgetInsight = ({ insight, loading, category }) => {
  if (loading) {
    return (
      <div className="mt-2 flex items-start gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg animate-pulse">
        <Loader className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!insight) {
    return null;
  }

  return (
    <div 
      className="mt-2 flex items-start gap-2 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
      style={{
        fontSize: '13px',
        lineHeight: '1.5',
        color: '#4B5563'
      }}
    >
      <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700 dark:text-gray-300 flex-1">
        {insight}
      </span>
    </div>
  );
};

export default BudgetInsight;

