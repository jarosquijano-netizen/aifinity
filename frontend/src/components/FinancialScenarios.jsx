import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  Home,
  CreditCard,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Briefcase,
  Scissors,
  Minus,
  XCircle
} from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormat';

const FinancialScenarios = ({ 
  salary1 = 5000,      // Primary income
  salary2 = 3000,      // Secondary income
  otherIncome = 0,     // Other income (freelance, investments, etc)
  monthlyBudget = 7657.89,
  budgetCategories = [],
  debts = [],
  mortgage = null
}) => {
  // Individual income changes
  const [salary1Change, setSalary1Change] = useState(0);
  const [salary2Change, setSalary2Change] = useState(0);
  const [otherIncomeChange, setOtherIncomeChange] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Calculate current incomes
  const currentSalary1 = salary1;
  const currentSalary2 = salary2;
  const currentOtherIncome = otherIncome;
  const currentTotalIncome = currentSalary1 + currentSalary2 + currentOtherIncome;

  // Calculate new incomes based on changes
  const newSalary1 = currentSalary1 * (1 + salary1Change / 100);
  const newSalary2 = currentSalary2 * (1 + salary2Change / 100);
  const newOtherIncome = currentOtherIncome * (1 + otherIncomeChange / 100);
  const newTotalIncome = newSalary1 + newSalary2 + newOtherIncome;

  // Calculate differences
  const salary1Difference = newSalary1 - currentSalary1;
  const salary2Difference = newSalary2 - currentSalary2;
  const otherIncomeDifference = newOtherIncome - currentOtherIncome;
  const totalIncomeDifference = newTotalIncome - currentTotalIncome;

  const isDecrease = totalIncomeDifference < 0;
  const isIncrease = totalIncomeDifference > 0;

  // Calculate financial metrics
  // Essential expenses: Food for 4, Electricity, Housing, Transport, Health, Insurance
  const essentialFoodFor4 = budgetCategories
    .filter(cat => {
      const catName = (cat.name || '').toLowerCase();
      return catName.includes('food') || catName.includes('comida') || 
             catName.includes('groceries') || catName.includes('supermercado');
    })
    .reduce((sum, cat) => sum + cat.amount, 0) || 700; // Default 700 EUR for 4 people if not found
  
  const essentialElectricity = budgetCategories
    .filter(cat => {
      const catName = (cat.name || '').toLowerCase();
      return catName.includes('electricity') || catName.includes('electricidad') ||
             catName.includes('utilities') || catName.includes('servicios');
    })
    .reduce((sum, cat) => sum + cat.amount, 0) || 150; // Default 150 EUR if not found
  
  const otherEssentials = budgetCategories
    .filter(cat => {
      const catName = (cat.name || '').toLowerCase();
      return cat.priority === 'essential' && 
             !catName.includes('food') && !catName.includes('comida') &&
             !catName.includes('groceries') && !catName.includes('supermercado') &&
             !catName.includes('electricity') && !catName.includes('electricidad') &&
             !catName.includes('utilities') && !catName.includes('servicios');
    })
    .reduce((sum, cat) => sum + cat.amount, 0);
  
  const totalEssentials = essentialFoodFor4 + essentialElectricity + otherEssentials;
  
  const totalDiscretionary = budgetCategories
    .filter(cat => cat.priority === 'discretionary')
    .reduce((sum, cat) => sum + cat.amount, 0);

  const totalDebts = debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  // Set mortgage to 975 EUR as specified
  const mortgagePayment = 975;

  const totalFixedCosts = totalEssentials + totalDebts + mortgagePayment;
  const essentialsOnlyBudget = mortgagePayment + essentialFoodFor4 + essentialElectricity + otherEssentials + totalDebts;
  const budgetAfterIncome = newTotalIncome - totalFixedCosts;
  const savingsCapacity = newTotalIncome - monthlyBudget;
  const essentialsOnlyCapacity = newTotalIncome - essentialsOnlyBudget;

  // Categorize spending recommendations
  const getSpendingRecommendations = () => {
    if (isIncrease) {
      return {
        status: 'increase',
        color: 'green',
        icon: TrendingUp,
        title: 'Income Increase Opportunities',
        recommendations: [
          {
            action: 'increase_savings',
            priority: 'high',
            category: 'Savings',
            amount: totalIncomeDifference * 0.5,
            description: 'Increase emergency fund or investments',
            icon: DollarSign
          },
          {
            action: 'accelerate_debt',
            priority: 'high',
            category: 'Debt Payments',
            amount: totalIncomeDifference * 0.3,
            description: 'Pay down high-interest debts faster',
            icon: CreditCard
          },
          {
            action: 'improve_lifestyle',
            priority: 'medium',
            category: 'Lifestyle',
            amount: totalIncomeDifference * 0.2,
            description: 'Modest lifestyle improvements',
            icon: TrendingUp
          }
        ]
      };
    } else if (isDecrease) {
      const deficit = budgetAfterIncome < 0 ? Math.abs(budgetAfterIncome) : 0;
      const severity = deficit > newTotalIncome * 0.3 ? 'severe' : deficit > 0 ? 'moderate' : 'mild';
      
      // Calculate essentials-only budget recommendation
      const essentialsOnlyBudgetTotal = mortgagePayment + essentialFoodFor4 + essentialElectricity + otherEssentials + totalDebts;
      const canAffordEssentialsOnly = newTotalIncome >= essentialsOnlyBudgetTotal;
      const essentialsOnlySurplus = newTotalIncome - essentialsOnlyBudgetTotal;

      // Sort discretionary categories by amount (highest first)
      const discretionarySorted = [...budgetCategories]
        .filter(cat => cat.priority === 'discretionary')
        .sort((a, b) => b.amount - a.amount);

      const recommendations = [];
      
      // First recommendation: Switch to essentials-only budget if income is reduced
      if (isDecrease && newTotalIncome < monthlyBudget) {
        recommendations.push({
          action: 'essentials_only',
          priority: 'critical',
          category: 'Essentials-Only Budget',
          currentAmount: monthlyBudget,
          newAmount: essentialsOnlyBudgetTotal,
          cutAmount: monthlyBudget - essentialsOnlyBudgetTotal,
          cutPercentage: ((monthlyBudget - essentialsOnlyBudgetTotal) / monthlyBudget) * 100,
          description: canAffordEssentialsOnly 
            ? `Switch to essentials-only budget: ${formatCurrency(essentialsOnlyBudgetTotal)}/month. This covers: Mortgage (${formatCurrency(mortgagePayment)}), Food for 4 (${formatCurrency(essentialFoodFor4)}), Electricity (${formatCurrency(essentialElectricity)}), Other essentials (${formatCurrency(otherEssentials)}), and Debts (${formatCurrency(totalDebts)}). Remaining: ${formatCurrency(essentialsOnlySurplus)}`
            : `Income too low for essentials-only budget. Need ${formatCurrency(essentialsOnlyBudgetTotal - newTotalIncome)} more/month.`,
          icon: AlertTriangle,
          breakdown: {
            mortgage: mortgagePayment,
            food: essentialFoodFor4,
            electricity: essentialElectricity,
            otherEssentials: otherEssentials,
            debts: totalDebts,
            total: essentialsOnlyBudgetTotal
          }
        });
      }
      
      let remainingToCut = Math.abs(totalIncomeDifference);
      const alreadyCut = monthlyBudget - essentialsOnlyBudgetTotal;
      remainingToCut = Math.max(0, remainingToCut - alreadyCut);

      // Phase 1: Cut discretionary spending (if still needed after essentials-only)
      if (remainingToCut > 0) {
        discretionarySorted.forEach(cat => {
          if (remainingToCut > 0) {
            const cutAmount = Math.min(cat.amount, remainingToCut);
            const cutPercentage = (cutAmount / cat.amount) * 100;
            
            recommendations.push({
              action: cutPercentage >= 90 ? 'eliminate' : cutPercentage >= 50 ? 'reduce_major' : 'reduce_minor',
              priority: 'high',
              category: cat.name,
              currentAmount: cat.amount,
              newAmount: cat.amount - cutAmount,
              cutAmount: cutAmount,
              cutPercentage: cutPercentage,
              description: cutPercentage >= 90 
                ? `Eliminate completely to save ${formatCurrency(cutAmount)}/month`
                : `Reduce by ${cutPercentage.toFixed(0)}% to save ${formatCurrency(cutAmount)}/month`,
              icon: cutPercentage >= 90 ? XCircle : cutPercentage >= 50 ? Scissors : Minus
            });
            
            remainingToCut -= cutAmount;
          }
        });
      }

      // Phase 2: If still need to cut, look at essentials (only if severe)
      if (remainingToCut > 0 && severity === 'severe') {
        const essentialsSorted = [...budgetCategories]
          .filter(cat => {
            const catName = (cat.name || '').toLowerCase();
            return cat.priority === 'essential' && cat.canReduce &&
                   !catName.includes('mortgage') && !catName.includes('hipoteca');
          })
          .sort((a, b) => b.amount - a.amount);

        essentialsSorted.forEach(cat => {
          if (remainingToCut > 0) {
            // Food and electricity can be reduced but not eliminated
            const catName = (cat.name || '').toLowerCase();
            const isFoodOrElectricity = catName.includes('food') || catName.includes('comida') ||
                                       catName.includes('electricity') || catName.includes('electricidad');
            const maxCut = isFoodOrElectricity ? cat.amount * 0.2 : cat.amount * 0.3; // Max 20% for food/electricity, 30% for others
            const cutAmount = Math.min(maxCut, remainingToCut);
            
            recommendations.push({
              action: 'reduce_minor',
              priority: 'critical',
              category: cat.name,
              currentAmount: cat.amount,
              newAmount: cat.amount - cutAmount,
              cutAmount: cutAmount,
              cutPercentage: (cutAmount / cat.amount) * 100,
              description: isFoodOrElectricity
                ? `Reduce by ${(cutAmount / cat.amount * 100).toFixed(0)}% (e.g., meal planning, energy efficiency)`
                : `Find ways to reduce (e.g., cheaper alternatives, negotiate bills)`,
              icon: AlertTriangle
            });
            
            remainingToCut -= cutAmount;
          }
        });
      }

      return {
        status: 'decrease',
        color: 'red',
        icon: TrendingDown,
        title: 'Income Reduction Impact',
        severity: severity,
        recommendations: recommendations,
        essentialsOnlyBudget: essentialsOnlyBudgetTotal,
        canAffordEssentialsOnly: canAffordEssentialsOnly
      };
    }

    return null;
  };

  const scenarioData = getSpendingRecommendations();

  // Get status color and config
  const getStatusConfig = () => {
    if (budgetAfterIncome < 0) {
      return {
        color: 'red',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-300 dark:border-red-700',
        textColor: 'text-red-700 dark:text-red-400',
        label: 'DEFICIT',
        emoji: '🔴'
      };
    } else if (budgetAfterIncome < currentTotalIncome * 0.1) {
      return {
        color: 'yellow',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-300 dark:border-yellow-700',
        textColor: 'text-yellow-700 dark:text-yellow-400',
        label: 'TIGHT',
        emoji: '🟡'
      };
    } else {
      return {
        color: 'green',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-300 dark:border-green-700',
        textColor: 'text-green-700 dark:text-green-400',
        label: 'HEALTHY',
        emoji: '🟢'
      };
    }
  };

  const statusConfig = getStatusConfig();

  // Income slider component
  const IncomeSlider = ({ 
    label, 
    icon: Icon, 
    currentAmount, 
    change, 
    onChange, 
    color 
  }) => {
    const newAmount = currentAmount * (1 + change / 100);
    const difference = newAmount - currentAmount;
    
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-5 border-2 ${color === 'blue' ? 'border-blue-200 dark:border-blue-700' : color === 'purple' ? 'border-purple-200 dark:border-purple-700' : 'border-green-200 dark:border-green-700'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-5 h-5 ${color === 'blue' ? 'text-blue-600 dark:text-blue-400' : color === 'purple' ? 'text-purple-600 dark:text-purple-400' : 'text-green-600 dark:text-green-400'}`} />
          <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base">{label}</h4>
        </div>
        
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(newAmount)}
            </span>
            {change !== 0 && (
              <span className={`text-xs sm:text-sm font-semibold ${difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Current: {formatCurrency(currentAmount)}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Adjust:</span>
            <span className={`text-base sm:text-lg font-bold ${change > 0 ? 'text-green-600 dark:text-green-400' : change < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
          
          <input
            type="range"
            min="-100"
            max="100"
            step="5"
            value={change}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>-100%</span>
            <span>0%</span>
            <span>+100%</span>
          </div>
        </div>
      </div>
    );
  };

  // Helper function for specific actions
  const getSpecificActions = (category, action) => {
    const actions = {
      'Entertainment': {
        'eliminate': [
          'Cancel streaming subscriptions (Netflix, Spotify, etc.)',
          'Stop dining out and eating at home',
          'Postpone concerts, movies, and events'
        ],
        'reduce_major': [
          'Keep one streaming service, cancel others',
          'Limit dining out to once per month',
          'Look for free entertainment options'
        ],
        'reduce_minor': [
          'Share streaming subscriptions with family',
          'Use discount codes for dining',
          'Choose cheaper entertainment venues'
        ]
      },
      'Shopping': {
        'eliminate': [
          'Stop all non-essential purchases',
          'Freeze clothing and accessory buying',
          'Cancel subscriptions boxes'
        ],
        'reduce_major': [
          'Only buy absolute necessities',
          'Use what you already own',
          'Wait 30 days before any purchase'
        ],
        'reduce_minor': [
          'Shop sales and clearance only',
          'Use cashback and discount apps',
          'Buy second-hand when possible'
        ]
      },
      'Transport': {
        'eliminate': [
          'Sell second car if you have one',
          'Use public transportation exclusively',
          'Bike or walk when possible'
        ],
        'reduce_major': [
          'Reduce car usage by 50%',
          'Carpool for commuting',
          'Combine trips to save fuel'
        ],
        'reduce_minor': [
          'Compare fuel prices',
          'Maintain car for better efficiency',
          'Consider cheaper insurance'
        ]
      },
      'Food': {
        'reduce_minor': [
          'Meal plan and batch cook',
          'Buy store brands instead of name brands',
          'Shop at discount supermarkets',
          'Reduce meat consumption',
          'Use coupons and loyalty programs'
        ]
      },
      'Utilities': {
        'reduce_minor': [
          'Lower thermostat in winter, raise in summer',
          'Unplug devices when not in use',
          'Switch to LED bulbs',
          'Take shorter showers',
          'Negotiate with service providers'
        ]
      },
      'Savings': {
        'increase_savings': [
          'Open high-yield savings account',
          'Automate transfers to savings',
          'Build 6-month emergency fund',
          'Consider investment options'
        ]
      },
      'Debt Payments': {
        'accelerate_debt': [
          'Focus on highest interest debt first',
          'Make bi-weekly payments instead of monthly',
          'Round up payments to nearest hundred',
          'Avoid taking on new debt'
        ]
      },
      'Lifestyle': {
        'improve_lifestyle': [
          'Invest in quality items that last',
          'Consider hobby or skill development',
          'Modest upgrades to living space',
          'Maintain balance between saving and enjoying'
        ]
      },
      'Essentials-Only Budget': {
        'essentials_only': [
          'Eliminate all discretionary spending (entertainment, shopping, dining out)',
          'Focus only on: Mortgage (€975), Food for 4, Electricity, Other essentials, and Debt payments',
          'This is your survival budget - covers only absolute necessities',
          'Any remaining income can go to emergency savings',
          'Review monthly to ensure you stay within this budget'
        ]
      }
    };

    return actions[category]?.[action] || [
      'Review this category carefully',
      'Look for cost-saving alternatives',
      'Consider if this expense is necessary'
    ];
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Financial Scenarios 📊
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Adjust each income source to see how changes affect your budget, debts, and financial health
        </p>
      </div>

      {/* Income Sources Control Panel */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 sm:p-6 border-2 border-blue-200 dark:border-blue-700">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6 flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Household Income Sources
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <IncomeSlider
            label="Salary 1 (Primary)"
            icon={User}
            currentAmount={currentSalary1}
            change={salary1Change}
            onChange={setSalary1Change}
            color="blue"
          />
          
          <IncomeSlider
            label="Salary 2 (Secondary)"
            icon={Users}
            currentAmount={currentSalary2}
            change={salary2Change}
            onChange={setSalary2Change}
            color="purple"
          />
          
          <IncomeSlider
            label="Other Income"
            icon={DollarSign}
            currentAmount={currentOtherIncome}
            change={otherIncomeChange}
            onChange={setOtherIncomeChange}
            color="green"
          />
        </div>

        {/* Quick Reset Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSalary1Change(0);
              setSalary2Change(0);
              setOtherIncomeChange(0);
            }}
            className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
          >
            Reset All to Current
          </button>
        </div>
      </div>

      {/* Total Income Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Current Total Income */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Current Total Income</span>
            <span className="px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-xs font-bold">
              BASELINE
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {formatCurrency(currentTotalIncome)}
          </div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <User className="w-4 h-4" /> Salary 1:
              </span>
              <span className="font-semibold">{formatCurrency(currentSalary1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Users className="w-4 h-4" /> Salary 2:
              </span>
              <span className="font-semibold">{formatCurrency(currentSalary2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> Other:
              </span>
              <span className="font-semibold">{formatCurrency(currentOtherIncome)}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Savings Capacity:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(currentTotalIncome - monthlyBudget)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* New Total Income */}
        <div className={`rounded-lg p-4 sm:p-5 border-2 ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Scenario Total Income</span>
            <span className={`px-2 sm:px-3 py-1 ${statusConfig.textColor} bg-white dark:bg-slate-800 rounded-full text-xs font-bold`}>
              {statusConfig.label} {statusConfig.emoji}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {formatCurrency(newTotalIncome)}
          </div>
          <div className={`text-xs sm:text-sm font-semibold mb-4 ${isIncrease ? 'text-green-600 dark:text-green-400' : isDecrease ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
            {isIncrease && <TrendingUp className="inline w-4 h-4 mr-1" />}
            {isDecrease && <TrendingDown className="inline w-4 h-4 mr-1" />}
            {totalIncomeDifference >= 0 ? '+' : ''}{formatCurrency(totalIncomeDifference)} from current
          </div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <User className="w-4 h-4" /> Salary 1:
              </span>
              <div className="text-right">
                <span className="font-semibold">{formatCurrency(newSalary1)}</span>
                {salary1Change !== 0 && (
                  <span className={`ml-2 text-xs ${salary1Difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ({salary1Change > 0 ? '+' : ''}{salary1Change}%)
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Users className="w-4 h-4" /> Salary 2:
              </span>
              <div className="text-right">
                <span className="font-semibold">{formatCurrency(newSalary2)}</span>
                {salary2Change !== 0 && (
                  <span className={`ml-2 text-xs ${salary2Difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ({salary2Change > 0 ? '+' : ''}{salary2Change}%)
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> Other:
              </span>
              <div className="text-right">
                <span className="font-semibold">{formatCurrency(newOtherIncome)}</span>
                {otherIncomeChange !== 0 && (
                  <span className={`ml-2 text-xs ${otherIncomeDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ({otherIncomeChange > 0 ? '+' : ''}{otherIncomeChange}%)
                  </span>
                )}
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">After Fixed Costs:</span>
                <span className={`font-semibold ${budgetAfterIncome < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(budgetAfterIncome)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-700 dark:text-gray-300">New Savings Capacity:</span>
                <span className={`font-semibold ${savingsCapacity < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(savingsCapacity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Income Change Breakdown */}
      {(salary1Change !== 0 || salary2Change !== 0 || otherIncomeChange !== 0) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 sm:p-5 border border-blue-200 dark:border-blue-700">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">💰 Income Changes Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {salary1Change !== 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Salary 1 Impact</span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold ${salary1Difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {salary1Difference >= 0 ? '+' : ''}{formatCurrency(salary1Difference)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {salary1Change > 0 ? '+' : ''}{salary1Change}% change
                </div>
              </div>
            )}
            
            {salary2Change !== 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Salary 2 Impact</span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold ${salary2Difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {salary2Difference >= 0 ? '+' : ''}{formatCurrency(salary2Difference)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {salary2Change > 0 ? '+' : ''}{salary2Change}% change
                </div>
              </div>
            )}
            
            {otherIncomeChange !== 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Other Income Impact</span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold ${otherIncomeDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {otherIncomeDifference >= 0 ? '+' : ''}{formatCurrency(otherIncomeDifference)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {otherIncomeChange > 0 ? '+' : ''}{otherIncomeChange}% change
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Costs Breakdown */}
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Home className="w-5 h-5" />
          Fixed Monthly Costs
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mortgage Payment</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(mortgagePayment)}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {newTotalIncome > 0 ? ((mortgagePayment / newTotalIncome) * 100).toFixed(1) : 0}% of new income
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Food for 4</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(essentialFoodFor4)}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {newTotalIncome > 0 ? ((essentialFoodFor4 / newTotalIncome) * 100).toFixed(1) : 0}% of new income
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Electricity</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(essentialElectricity)}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {newTotalIncome > 0 ? ((essentialElectricity / newTotalIncome) * 100).toFixed(1) : 0}% of new income
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Other Essentials + Debts</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(otherEssentials + totalDebts)}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Essentials: {formatCurrency(otherEssentials)} | Debts: {formatCurrency(totalDebts)}
            </p>
          </div>
        </div>
        
        {/* Essentials-Only Budget Summary */}
        {isDecrease && scenarioData && scenarioData.essentialsOnlyBudget && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                Essentials-Only Budget Total
              </h4>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                scenarioData.canAffordEssentialsOnly 
                  ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' 
                  : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
              }`}>
                {scenarioData.canAffordEssentialsOnly ? 'AFFORDABLE' : 'INSUFFICIENT'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {formatCurrency(scenarioData.essentialsOnlyBudget)}
            </div>
            <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>Mortgage:</span>
                <span className="font-semibold">{formatCurrency(mortgagePayment)}</span>
              </div>
              <div className="flex justify-between">
                <span>Food for 4:</span>
                <span className="font-semibold">{formatCurrency(essentialFoodFor4)}</span>
              </div>
              <div className="flex justify-between">
                <span>Electricity:</span>
                <span className="font-semibold">{formatCurrency(essentialElectricity)}</span>
              </div>
              <div className="flex justify-between">
                <span>Other Essentials:</span>
                <span className="font-semibold">{formatCurrency(otherEssentials)}</span>
              </div>
              <div className="flex justify-between">
                <span>Debt Payments:</span>
                <span className="font-semibold">{formatCurrency(totalDebts)}</span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2 flex justify-between">
                <span className="font-bold">Remaining after essentials:</span>
                <span className={`font-bold ${
                  essentialsOnlySurplus >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(essentialsOnlySurplus)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {scenarioData && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            {scenarioData.icon && <scenarioData.icon className={`w-6 h-6 text-${scenarioData.color}-500`} />}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {scenarioData.title}
            </h3>
          </div>

          {isDecrease && scenarioData.severity === 'severe' && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-300 mb-1">Critical Situation</p>
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-400">
                    This income reduction would put you in a severe deficit. You'll need to make significant cuts
                    to essential expenses and consider additional income sources.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {scenarioData.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`rounded-lg border-2 transition-all ${
                  rec.priority === 'critical' 
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' 
                    : rec.priority === 'high'
                    ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <div
                  className="p-3 sm:p-4 cursor-pointer"
                  onClick={() => setExpandedCategory(expandedCategory === index ? null : index)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {rec.icon && <rec.icon className="w-5 h-5 text-gray-700 dark:text-gray-300 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base">{rec.category}</h4>
                          {rec.action === 'essentials_only' && (
                            <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs font-bold">
                              ESSENTIALS ONLY
                            </span>
                          )}
                          {rec.action === 'eliminate' && (
                            <span className="px-2 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded text-xs font-bold">
                              ELIMINATE
                            </span>
                          )}
                          {rec.action === 'reduce_major' && (
                            <span className="px-2 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded text-xs font-bold">
                              MAJOR CUT
                            </span>
                          )}
                          {rec.action === 'reduce_minor' && (
                            <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded text-xs font-bold">
                              REDUCE
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{rec.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {rec.action === 'essentials_only' && rec.breakdown ? (
                          <>
                            <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(rec.breakdown.total)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Total budget
                            </div>
                          </>
                        ) : rec.cutAmount !== undefined ? (
                          <>
                            <div className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                              -{formatCurrency(rec.cutAmount)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {rec.cutPercentage?.toFixed(0)}% reduction
                            </div>
                          </>
                        ) : (
                          <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                            +{formatCurrency(rec.amount)}
                          </div>
                        )}
                      </div>
                      {expandedCategory === index ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedCategory === index && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 bg-white dark:bg-slate-800">
                    {rec.action === 'essentials_only' && rec.breakdown && (
                      <div className="mb-4">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">📋 Essentials-Only Budget Breakdown:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          <div className="bg-gray-50 dark:bg-slate-700 rounded p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mortgage</p>
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.mortgage)}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-700 rounded p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Food for 4</p>
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.food)}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-700 rounded p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Electricity</p>
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.electricity)}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-700 rounded p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Other Essentials</p>
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.otherEssentials)}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-700 rounded p-3 sm:col-span-2">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Debt Payments</p>
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.debts)}</p>
                          </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 border border-blue-200 dark:border-blue-700">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total Essentials-Only Budget:</span>
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(rec.breakdown.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {rec.currentAmount !== undefined && rec.action !== 'essentials_only' && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Amount</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(rec.currentAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">New Amount</p>
                          <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(rec.newAmount)}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 dark:bg-slate-700 rounded p-3">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">💡 Specific Actions:</p>
                      <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                        {getSpecificActions(rec.category, rec.action).map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Impact */}
      {(salary1Change !== 0 || salary2Change !== 0 || otherIncomeChange !== 0) && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6 border border-purple-200 dark:border-purple-700">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">📈 Overall Impact Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2">Financial Health:</p>
              <div className={`text-xl sm:text-2xl font-bold ${statusConfig.textColor}`}>
                {statusConfig.label} {statusConfig.emoji}
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2">Total Income Change:</p>
              <div className={`text-xl sm:text-2xl font-bold ${totalIncomeDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {totalIncomeDifference >= 0 ? '+' : ''}{formatCurrency(totalIncomeDifference)}
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2">Monthly Outcome:</p>
              <div className={`text-xl sm:text-2xl font-bold ${savingsCapacity >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {savingsCapacity >= 0 ? 'Surplus' : 'Deficit'}: {formatCurrency(Math.abs(savingsCapacity))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialScenarios;

