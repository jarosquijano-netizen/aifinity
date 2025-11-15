/**
 * Pre-generated Insight Templates
 * Used for cost optimization (70% of insights use templates, 30% use AI)
 */

import { getBenchmark } from '../data/benchmarks.js';

const INSIGHT_TEMPLATES = {
  // OVER BUDGET INSIGHTS
  overBudget: {
    'Compras > Compras': (data) => {
      const avgForFamily = getBenchmark(data.category, data.familySize).avg;
      const overspend = data.spent - avgForFamily;
      return `🔴 Shopping is ${data.percentage.toFixed(0)}% over budget and ${overspend.toFixed(0)}€ above the family average. Review: Are these necessary purchases? Consider a 30-day rule for non-essentials.`;
    },
    'Alimentación > Restaurante': (data) => {
      const mealsPerWeek = Math.floor(data.transactionCount / 4);
      const costPerMeal = data.averageTransaction;
      return `🔴 ${data.percentage.toFixed(0)}% over budget with ~${mealsPerWeek} restaurant meals/week at ${costPerMeal.toFixed(0)}€ each. Cooking 2 more meals at home could save ${(costPerMeal * 8).toFixed(0)}€/month.`;
    },
    'Finanzas > Préstamos': (data) => {
      const incomePercent = ((data.spent / data.monthlyIncome) * 100).toFixed(1);
      return `🔴 Loan payments at ${incomePercent}% of income (recommended max: 20%). Consider debt consolidation or refinancing to reduce monthly burden.`;
    },
    'Servicios > Servicios y productos online': (data) => {
      return `🔴 Online services ${data.percentage.toFixed(0)}% over budget. Review subscriptions: Cancel unused services. Average person has 3-5 forgotten subscriptions worth ~40€/month.`;
    },
    generic: (data) => {
      return `🔴 ${data.percentage.toFixed(0)}% over budget. This category needs immediate attention. Review recent transactions and identify areas to cut back.`;
    }
  },
  
  // CLOSE TO LIMIT (90-99%)
  warning: {
    generic: (data) => {
      const daysLeft = 30 - new Date().getDate();
      const dailyRemaining = data.remaining / Math.max(daysLeft, 1);
      return `⚠️ ${data.percentage.toFixed(0)}% used with ${daysLeft} days left. Limit spending to ${dailyRemaining.toFixed(2)}€/day to stay within budget.`;
    }
  },
  
  // WATCH (75-89%)
  caution: {
    generic: (data) => {
      const daysLeft = 30 - new Date().getDate();
      return `⚡ ${data.percentage.toFixed(0)}% used - watch carefully for the next ${daysLeft} days. You have ${data.remaining.toFixed(2)}€ remaining.`;
    }
  },
  
  // NO BUDGET SET
  noBudget: {
    'Compras > Compras': (data) => {
      const recommended = getBenchmark(data.category, data.familySize).avg;
      return `⚠️ No budget set. You've spent ${data.spent.toFixed(2)}€. For a family of ${data.familySize}, typical range is ${recommended}€/month. Set a budget now.`;
    },
    'Ocio > Vacation': (data) => {
      return `⚠️ ${data.spent.toFixed(2)}€ spent on travel with no budget. If you travel quarterly, budget ~${(data.spent * 4 / 12).toFixed(0)}€/month or ${(data.spent * 4).toFixed(0)}€/year.`;
    },
    generic: (data) => {
      return `⚠️ No budget set but ${data.spent.toFixed(2)}€ spent. Set a budget to track and control spending in this category.`;
    }
  },
  
  // SAFE (0-49%)
  safe: {
    excellent: (data) => {
      return `✅ Excellent! Only ${data.percentage.toFixed(0)}% used - well below average. Keep up the disciplined spending!`;
    },
    good: (data) => {
      const savingsPotential = data.remaining * 0.5;
      return `✅ Great control at ${data.percentage.toFixed(0)}%. You could reallocate ${savingsPotential.toFixed(0)}€ to savings or other priorities.`;
    }
  },
  
  // ON TRACK (50-74%)
  onTrack: {
    generic: (data) => {
      return `📊 ${data.percentage.toFixed(0)}% - right on track! Maintain this pace to finish the month within budget.`;
    }
  }
};

/**
 * Get template insight for a category
 * @param {string} status - Status (overBudget, warning, caution, noBudget, safe, onTrack)
 * @param {string} category - Category name
 * @param {object} data - Category data
 * @returns {string} Insight text
 */
export function getTemplateInsight(status, category, data) {
  const templates = INSIGHT_TEMPLATES[status];
  if (!templates) return null;
  
  const template = templates[category] || templates.generic;
  if (!template) return null;
  
  return template(data);
}

export default INSIGHT_TEMPLATES;

