import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Scissors,
  Minus,
  DollarSign,
  Home,
  CreditCard,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Briefcase,
  Zap,
  Award,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormat';

const FinancialScenarios = ({ 
  salary1 = 5640,
  salary2 = 2820,
  otherIncome = 0,
  monthlyBudget = 7657.89,
  budgetCategories = [],
  debts = [],
  mortgage = null
}) => {
  const [salary1Change, setSalary1Change] = useState(0);
  const [salary2Change, setSalary2Change] = useState(0);
  const [otherIncomeChange, setOtherIncomeChange] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);

  // Preset scenarios
  const presetScenarios = [
    {
      id: 'job_loss_1',
      name: 'Lose Primary Job',
      icon: AlertTriangle,
      color: 'red',
      description: 'What if the primary earner loses their job?',
      changes: { salary1: -100, salary2: 0, other: 0 }
    },
    {
      id: 'job_loss_2',
      name: 'Lose Secondary Job',
      icon: AlertTriangle,
      color: 'red',
      description: 'What if the secondary earner loses their job?',
      changes: { salary1: 0, salary2: -100, other: 0 }
    },
    {
      id: 'salary_cut',
      name: 'Salary Cut (20%)',
      icon: TrendingDown,
      color: 'orange',
      description: 'Both salaries reduced by 20%',
      changes: { salary1: -20, salary2: -20, other: 0 }
    },
    {
      id: 'promotion_1',
      name: 'Primary Promotion',
      icon: Award,
      color: 'green',
      description: 'Primary earner gets 15% raise',
      changes: { salary1: 15, salary2: 0, other: 0 }
    },
    {
      id: 'side_income',
      name: 'Start Side Hustle',
      icon: Zap,
      color: 'blue',
      description: 'Add €1,000/month in other income',
      changes: { salary1: 0, salary2: 0, other: 100000 } // Large % because base is 0
    },
    {
      id: 'both_raise',
      name: 'Both Get Raises',
      icon: TrendingUp,
      color: 'green',
      description: '10% raise for both earners',
      changes: { salary1: 10, salary2: 10, other: 0 }
    }
  ];

  // Apply preset scenario
  const applyScenario = (scenario) => {
    setActiveScenario(scenario.id);
    setSalary1Change(scenario.changes.salary1);
    setSalary2Change(scenario.changes.salary2);
    
    // Handle other income specially since base might be 0
    if (scenario.id === 'side_income') {
      setOtherIncomeChange(1000); // Special handling
    } else {
      setOtherIncomeChange(scenario.changes.other);
    }
  };

  // Reset all sliders
  const resetSliders = () => {
    setSalary1Change(0);
    setSalary2Change(0);
    setOtherIncomeChange(0);
    setActiveScenario(null);
  };

  // Income slider component
  const IncomeSlider = ({ label, icon: Icon, currentAmount, change, onChange, color, isOtherIncome = false }) => {
    // Special handling for other income when base is 0
    let newAmount, difference;
    if (isOtherIncome && currentAmount === 0 && change > 0) {
      // Treat change as absolute amount when base is 0
      newAmount = change;
      difference = change;
    } else {
      newAmount = currentAmount * (1 + change / 100);
      difference = newAmount - currentAmount;
    }
    
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-5 border-2 ${
        color === 'blue' ? 'border-blue-200 dark:border-blue-800' : 
        color === 'purple' ? 'border-purple-200 dark:border-purple-800' : 
        'border-green-200 dark:border-green-800'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-5 h-5 ${
            color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 
            color === 'purple' ? 'text-purple-600 dark:text-purple-400' : 
            'text-green-600 dark:text-green-400'
          }`} />
          <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{label}</h4>
        </div>
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(newAmount)}
            </span>
            {change !== 0 && (
              <span className={`text-xs sm:text-sm font-semibold ${
                difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
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
            <span className={`text-base sm:text-lg font-bold ${
              change > 0 ? 'text-green-600 dark:text-green-400' : 
              change < 0 ? 'text-red-600 dark:text-red-400' : 
              'text-gray-600 dark:text-gray-400'
            }`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
          <input 
            type="range" 
            min="-100" 
            max="100" 
            step="5" 
            value={change} 
            onChange={(e) => {
              const newValue = Number(e.target.value);
              onChange(newValue);
              setActiveScenario(null); // Clear scenario when manually adjusting
            }}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, 
                #ef4444 0%, 
                #ef4444 ${Math.max(0, change + 100)}%, 
                #e5e7eb ${Math.max(0, change + 100)}%, 
                #e5e7eb 100%)`
            }}
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

  // Calculate current incomes with safety checks
  const currentSalary1 = Number(salary1) || 0;
  const currentSalary2 = Number(salary2) || 0;
  const currentOtherIncome = Number(otherIncome) || 0;
  const currentTotalIncome = currentSalary1 + currentSalary2 + currentOtherIncome;

  // Calculate new incomes based on changes with safety checks
  const salary1ChangeSafe = Number(salary1Change) || 0;
  const salary2ChangeSafe = Number(salary2Change) || 0;
  const otherIncomeChangeSafe = Number(otherIncomeChange) || 0;
  
  const newSalary1 = Math.max(0, currentSalary1 * (1 + salary1ChangeSafe / 100));
  const newSalary2 = Math.max(0, currentSalary2 * (1 + salary2ChangeSafe / 100));
  
  // Special handling for other income
  // If base is 0 and change is positive, treat as absolute amount
  // Otherwise use percentage
  let newOtherIncome;
  if (activeScenario === 'side_income') {
    newOtherIncome = currentOtherIncome + 1000;
  } else if (currentOtherIncome === 0 && otherIncomeChangeSafe > 0) {
    // If base is 0 and we're adding, treat change as absolute amount
    newOtherIncome = otherIncomeChangeSafe;
  } else {
    newOtherIncome = Math.max(0, currentOtherIncome * (1 + otherIncomeChangeSafe / 100));
  }
  
  const newTotalIncome = newSalary1 + newSalary2 + newOtherIncome;

  // Calculate differences
  const salary1Difference = newSalary1 - currentSalary1;
  const salary2Difference = newSalary2 - currentSalary2;
  const otherIncomeDifference = newOtherIncome - currentOtherIncome;
  const totalIncomeDifference = newTotalIncome - currentTotalIncome;

  const isDecrease = totalIncomeDifference < 0;
  const isIncrease = totalIncomeDifference > 0;

  // Calculate financial metrics with safety checks - USE ACTUAL BUDGET DATA
  const safeBudgetCategories = Array.isArray(budgetCategories) ? budgetCategories : [];
  const safeDebts = Array.isArray(debts) ? debts : [];
  
  // Get Food budget from actual budget categories
  const essentialFoodFor4 = safeBudgetCategories
    .filter(cat => {
      const catName = (cat?.name || '').toLowerCase();
      return catName.includes('food') || catName.includes('comida') || 
             catName.includes('groceries') || catName.includes('supermercado');
    })
    .reduce((sum, cat) => sum + (Number(cat?.amount) || 0), 0) || 600; // Default 600 EUR if not found
  
  // Get Electricity/Utilities budget from actual budget categories
  const essentialElectricity = safeBudgetCategories
    .filter(cat => {
      const catName = (cat?.name || '').toLowerCase();
      return catName.includes('electricity') || catName.includes('electricidad') ||
             catName.includes('utilities') || catName.includes('servicios') ||
             catName.includes('internet');
    })
    .reduce((sum, cat) => sum + (Number(cat?.amount) || 0), 0) || 150; // Default 150 EUR if not found
  
  // Get other essential expenses (excluding food and electricity)
  const otherEssentials = safeBudgetCategories
    .filter(cat => {
      const catName = (cat?.name || '').toLowerCase();
      return cat?.priority === 'essential' && 
             !catName.includes('food') && !catName.includes('comida') &&
             !catName.includes('groceries') && !catName.includes('supermercado') &&
             !catName.includes('electricity') && !catName.includes('electricidad') &&
             !catName.includes('utilities') && !catName.includes('servicios') &&
             !catName.includes('internet');
    })
    .reduce((sum, cat) => sum + (Number(cat?.amount) || 0), 0);
  
  const totalEssentials = safeBudgetCategories
    .filter(cat => cat?.priority === 'essential')
    .reduce((sum, cat) => sum + (Number(cat?.amount) || 0), 0);
  
  const totalDiscretionary = safeBudgetCategories
    .filter(cat => cat?.priority === 'discretionary')
    .reduce((sum, cat) => sum + (Number(cat?.amount) || 0), 0);

  const totalDebts = safeDebts.reduce((sum, debt) => sum + (Number(debt?.monthlyPayment) || 0), 0);
  
  // Use actual mortgage payment from system, or default to 975
  const mortgagePayment = Number(mortgage?.monthlyPayment) || 975;

  const totalFixedCosts = totalEssentials + totalDebts + mortgagePayment;
  const essentialsOnlyBudget = mortgagePayment + essentialFoodFor4 + essentialElectricity + otherEssentials + totalDebts;
  const safeMonthlyBudget = Number(monthlyBudget) || 0;
  const budgetAfterIncome = newTotalIncome - totalFixedCosts;
  const savingsCapacity = newTotalIncome - safeMonthlyBudget;
  const essentialsOnlySurplus = newTotalIncome - essentialsOnlyBudget;

  // Get spending recommendations
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

      // Sort discretionary categories by amount (highest first)
      const discretionarySorted = [...safeBudgetCategories]
        .filter(cat => cat?.priority === 'discretionary')
        .map(cat => ({ ...cat, amount: Number(cat?.amount) || 0 }))
        .sort((a, b) => b.amount - a.amount);

      const recommendations = [];
      
      // First recommendation: Switch to essentials-only budget if income is reduced
      if (isDecrease && newTotalIncome < safeMonthlyBudget && safeMonthlyBudget > 0) {
        const cutAmount = safeMonthlyBudget - essentialsOnlyBudget;
        const cutPercentage = safeMonthlyBudget > 0 ? ((cutAmount / safeMonthlyBudget) * 100) : 0;
        const canAffordEssentialsOnly = newTotalIncome >= essentialsOnlyBudget;
        
        recommendations.push({
          action: 'essentials_only',
          priority: 'critical',
          category: 'Essentials-Only Budget',
          currentAmount: safeMonthlyBudget,
          newAmount: essentialsOnlyBudget,
          cutAmount: cutAmount,
          cutPercentage: cutPercentage,
          description: canAffordEssentialsOnly 
            ? `Switch to essentials-only budget: ${formatCurrency(essentialsOnlyBudget)}/month. This covers: Mortgage (${formatCurrency(mortgagePayment)}), Food (${formatCurrency(essentialFoodFor4)}), Electricity (${formatCurrency(essentialElectricity)}), Other essentials (${formatCurrency(otherEssentials)}), and Debts (${formatCurrency(totalDebts)}). Remaining: ${formatCurrency(essentialsOnlySurplus)}`
            : `Income too low for essentials-only budget. Need ${formatCurrency(essentialsOnlyBudget - newTotalIncome)} more/month.`,
          icon: AlertTriangle,
          breakdown: {
            mortgage: mortgagePayment,
            food: essentialFoodFor4,
            electricity: essentialElectricity,
            otherEssentials: otherEssentials,
            debts: totalDebts,
            total: essentialsOnlyBudget
          }
        });
      }
      
      let remainingToCut = Math.abs(totalIncomeDifference);
      const alreadyCut = safeMonthlyBudget - essentialsOnlyBudget;
      remainingToCut = Math.max(0, remainingToCut - alreadyCut);

      // Phase 1: Cut discretionary spending (if still needed after essentials-only)
      if (remainingToCut > 0) {
        discretionarySorted.forEach(cat => {
          if (remainingToCut > 0 && cat.amount > 0) {
            const cutAmount = Math.min(cat.amount, remainingToCut);
            const cutPercentage = cat.amount > 0 ? (cutAmount / cat.amount) * 100 : 0;
            
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

      // Phase 2: If still need to cut, look at essentials
      if (remainingToCut > 0 && severity === 'severe') {
        const essentialsSorted = [...safeBudgetCategories]
          .filter(cat => cat?.priority === 'essential' && cat?.canReduce)
          .map(cat => ({ ...cat, amount: Number(cat?.amount) || 0 }))
          .sort((a, b) => b.amount - a.amount);

        essentialsSorted.forEach(cat => {
          if (remainingToCut > 0 && cat.amount > 0) {
            const maxCut = cat.amount * 0.3; // Max 30% cut on essentials
            const cutAmount = Math.min(maxCut, remainingToCut);
            
            recommendations.push({
              action: 'reduce_minor',
              priority: 'critical',
              category: cat.name,
              currentAmount: cat.amount,
              newAmount: cat.amount - cutAmount,
              cutAmount: cutAmount,
              cutPercentage: cat.amount > 0 ? (cutAmount / cat.amount) * 100 : 0,
              description: `Find ways to reduce (e.g., cheaper alternatives, negotiate bills)`,
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
        title: 'Required Budget Adjustments',
        severity: severity,
        recommendations: recommendations
      };
    }

    return null;
  };

  const scenarioData = getSpendingRecommendations();

  // Get status config
  const getStatusConfig = () => {
    if (budgetAfterIncome < 0) {
      return {
        color: 'red',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-400',
        textColor: 'text-red-700 dark:text-red-400',
        label: 'DEFICIT',
        emoji: '🔴'
      };
    } else if (budgetAfterIncome < currentTotalIncome * 0.1) {
      return {
        color: 'yellow',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-400',
        textColor: 'text-yellow-700 dark:text-yellow-400',
        label: 'TIGHT',
        emoji: '🟡'
      };
    } else {
      return {
        color: 'green',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-400',
        textColor: 'text-green-700 dark:text-green-400',
        label: 'HEALTHY',
        emoji: '🟢'
      };
    }
  };

  const statusConfig = getStatusConfig();

  // Get Food category from budget for display
  const foodCategory = safeBudgetCategories.find(c => {
    const name = (c?.name || '').toLowerCase();
    return name.includes('food') || name.includes('comida') || 
           name.includes('groceries') || name.includes('supermercado');
  });
  const foodAmount = foodCategory ? (Number(foodCategory.amount) || 0) : essentialFoodFor4;

  // Get Electricity category from budget for display
  const electricityCategory = safeBudgetCategories.find(c => {
    const name = (c?.name || '').toLowerCase();
    return name.includes('electricity') || name.includes('electricidad') ||
           name.includes('utilities') || name.includes('servicios') ||
           name.includes('internet');
  });
  const electricityAmount = electricityCategory ? (Number(electricityCategory.amount) || 0) : essentialElectricity;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Financial Scenarios 📊
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Choose a scenario to see how income changes affect your finances
        </p>
      </div>

      {/* Preset Scenarios - PROMINENTLY DISPLAYED */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          🎯 Quick Scenarios - Click to See Impact
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {presetScenarios.map((scenario) => {
            const Icon = scenario.icon;
            const isActive = activeScenario === scenario.id;
            
            return (
              <button
                key={scenario.id}
                onClick={() => applyScenario(scenario)}
                className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all transform hover:scale-105 ${
                  isActive 
                    ? scenario.color === 'red' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg' :
                      scenario.color === 'orange' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-lg' :
                      scenario.color === 'green' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg' :
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mt-0.5 flex-shrink-0 ${
                    scenario.color === 'red' ? 'text-red-500' :
                    scenario.color === 'orange' ? 'text-orange-500' :
                    scenario.color === 'green' ? 'text-green-500' :
                    'text-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 mb-1">
                      {scenario.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {scenario.description}
                    </p>
                    {isActive && (
                      <div className="mt-2 text-xs font-semibold text-green-600 dark:text-green-400">
                        ✓ Active Scenario
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Income Sources Control Panel with Sliders */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Household Income Sources
          </h3>
          {(salary1Change !== 0 || salary2Change !== 0 || otherIncomeChange !== 0) && (
            <button 
              onClick={resetSliders}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            >
              Reset All
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
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
            isOtherIncome={true}
          />
        </div>
      </div>

      {/* Impact Alert - SHOW WHEN SCENARIO IS ACTIVE OR SLIDERS ARE ADJUSTED */}
      {(activeScenario || salary1Change !== 0 || salary2Change !== 0 || otherIncomeChange !== 0) && (
        <div className={`mb-6 sm:mb-8 rounded-xl border-2 p-4 sm:p-6 ${
          isDecrease 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-400' 
            : isIncrease 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-400' 
            : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
        }`}>
          <div className="flex items-start gap-3 sm:gap-4">
            {isDecrease && <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />}
            {isIncrease && <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {isDecrease ? '⚠️ Financial Impact Warning' : '🎉 Positive Financial Impact'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Income Change</p>
                  <p className={`text-xl sm:text-2xl font-bold ${
                    totalIncomeDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {totalIncomeDifference >= 0 ? '+' : ''}{formatCurrency(totalIncomeDifference)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {currentTotalIncome > 0 ? ((totalIncomeDifference / currentTotalIncome) * 100).toFixed(1) : '0'}% change
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">New Monthly Outcome</p>
                  <p className={`text-xl sm:text-2xl font-bold ${
                    savingsCapacity >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {savingsCapacity >= 0 ? 'Surplus' : 'Deficit'}
                  </p>
                  <p className="text-base sm:text-lg font-semibold">
                    {formatCurrency(Math.abs(savingsCapacity))}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Financial Status</p>
                  <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg ${statusConfig.bgColor} border-2 ${statusConfig.borderColor}`}>
                    <span className="text-xl sm:text-2xl">{statusConfig.emoji}</span>
                    <span className={`font-bold text-sm sm:text-base ${statusConfig.textColor}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              </div>

              {isDecrease && budgetAfterIncome < 0 && (
                <div className="bg-white dark:bg-slate-700 rounded-lg p-3 sm:p-4 border-l-4 border-red-500">
                  <p className="text-xs sm:text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                    🚨 Critical Action Required
                  </p>
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-400">
                    You would be <strong>{formatCurrency(Math.abs(budgetAfterIncome))}</strong> short each month.
                    Scroll down to see which expenses you need to cut.
                  </p>
                </div>
              )}

              {isIncrease && (
                <div className="bg-white dark:bg-slate-700 rounded-lg p-3 sm:p-4 border-l-4 border-green-500">
                  <p className="text-xs sm:text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                    💡 Smart Money Move
                  </p>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-400">
                    With this extra income, you could save <strong>{formatCurrency(totalIncomeDifference * 0.5)}</strong> monthly
                    while still enjoying a better lifestyle. See recommendations below.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Income Sources Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Current Income */}
        <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 sm:p-6 border-2 border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Current Income</h3>
            <span className="px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-xs font-bold">
              BASELINE
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
            {formatCurrency(currentTotalIncome)}
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Salary 1:</span>
              </div>
              <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{formatCurrency(currentSalary1)}</span>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Salary 2:</span>
              </div>
              <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{formatCurrency(currentSalary2)}</span>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Other:</span>
              </div>
              <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{formatCurrency(currentOtherIncome)}</span>
            </div>
          </div>
        </div>

        {/* Scenario Income */}
        <div className={`rounded-xl p-4 sm:p-6 border-2 ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Scenario Income</h3>
            <span className={`px-2 sm:px-3 py-1 bg-white dark:bg-slate-800 ${statusConfig.textColor} rounded-full text-xs font-bold flex items-center gap-1`}>
              {statusConfig.emoji} {statusConfig.label}
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {formatCurrency(newTotalIncome)}
          </div>
          <div className={`text-base sm:text-lg font-semibold mb-4 sm:mb-6 ${
            totalIncomeDifference > 0 ? 'text-green-600 dark:text-green-400' : 
            totalIncomeDifference < 0 ? 'text-red-600 dark:text-red-400' : 
            'text-gray-600 dark:text-gray-400'
          }`}>
            {totalIncomeDifference > 0 && <TrendingUp className="inline w-4 h-4 sm:w-5 sm:h-5 mr-1" />}
            {totalIncomeDifference < 0 && <TrendingDown className="inline w-4 h-4 sm:w-5 sm:h-5 mr-1" />}
            {totalIncomeDifference >= 0 ? '+' : ''}{formatCurrency(totalIncomeDifference)}
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Salary 1:</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{formatCurrency(newSalary1)}</span>
                {salary1Change !== 0 && (
                  <span className={`ml-2 text-xs ${salary1Difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ({salary1Change > 0 ? '+' : ''}{salary1Change}%)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Salary 2:</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{formatCurrency(newSalary2)}</span>
                {salary2Change !== 0 && (
                  <span className={`ml-2 text-xs ${salary2Difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ({salary2Change > 0 ? '+' : ''}{salary2Change}%)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Other:</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{formatCurrency(newOtherIncome)}</span>
                {otherIncomeDifference !== 0 && (
                  <span className={`ml-2 text-xs ${otherIncomeDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ({otherIncomeDifference >= 0 ? '+' : ''}{formatCurrency(otherIncomeDifference)})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Costs Impact - USE ACTUAL BUDGET DATA */}
      <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border-2 border-gray-200 dark:border-gray-600">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Home className="w-5 h-5" />
          Fixed Monthly Costs (% of new income)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mortgage</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(mortgagePayment)}</p>
            <div className="mt-2">
              <div className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                newTotalIncome > 0 && (mortgagePayment / newTotalIncome) > 0.28 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                newTotalIncome > 0 && (mortgagePayment / newTotalIncome) > 0.25 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              }`}>
                {newTotalIncome > 0 ? ((mortgagePayment / newTotalIncome) * 100).toFixed(1) : '0'}%
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Food</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(foodAmount)}
            </p>
            <div className="mt-2">
              <div className="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {newTotalIncome > 0 ? ((foodAmount / newTotalIncome) * 100).toFixed(1) : '0'}%
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Electricity</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(electricityAmount)}
            </p>
            <div className="mt-2">
              <div className="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {newTotalIncome > 0 ? ((electricityAmount / newTotalIncome) * 100).toFixed(1) : '0'}%
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Other + Debts</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(Math.max(0, totalEssentials + totalDebts - mortgagePayment - foodAmount - electricityAmount))}
            </p>
            <div className="mt-2">
              <div className="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {newTotalIncome > 0 ? (((totalEssentials + totalDebts - mortgagePayment - foodAmount - electricityAmount) / newTotalIncome) * 100).toFixed(1) : '0'}%
              </div>
            </div>
            {/* Breakdown tooltip/details */}
            <details className="mt-2">
              <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                Ver desglose
              </summary>
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 space-y-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Incluye:</p>
                {/* Other Essential Categories */}
                {safeBudgetCategories
                  .filter(cat => {
                    const catName = (cat?.name || '').toLowerCase();
                    return cat?.priority === 'essential' && 
                           !catName.includes('food') && !catName.includes('comida') &&
                           !catName.includes('groceries') && !catName.includes('supermercado') &&
                           !catName.includes('electricity') && !catName.includes('electricidad') &&
                           !catName.includes('utilities') && !catName.includes('servicios') &&
                           !catName.includes('internet') &&
                           !catName.includes('mortgage') && !catName.includes('hipoteca') &&
                           (Number(cat?.amount) || 0) > 0;
                  })
                  .map((cat, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{cat.name}:</span>
                      <span className="font-semibold">{formatCurrency(Number(cat?.amount) || 0)}</span>
                    </div>
                  ))}
                {/* Debts */}
                {safeDebts.length > 0 && (
                  <>
                    <div className="pt-1 mt-1 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Deudas:</p>
                      {safeDebts.map((debt, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>{debt.name || 'Debt'}:</span>
                          <span className="font-semibold">{formatCurrency(Number(debt?.monthlyPayment) || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {/* Total breakdown */}
                <div className="pt-1 mt-1 border-t border-gray-300 dark:border-gray-500">
                  <div className="flex justify-between text-xs font-bold text-gray-900 dark:text-gray-100">
                    <span>Total:</span>
                    <span>{formatCurrency(Math.max(0, totalEssentials + totalDebts - mortgagePayment - foodAmount - electricityAmount))}</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Recommendations - SHOW WHEN SCENARIO IS ACTIVE OR SLIDERS ARE ADJUSTED */}
      {(activeScenario || salary1Change !== 0 || salary2Change !== 0 || otherIncomeChange !== 0) && scenarioData && scenarioData.recommendations && scenarioData.recommendations.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            {scenarioData.icon && <scenarioData.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
              scenarioData.color === 'red' ? 'text-red-500' : 'text-green-500'
            }`} />}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {scenarioData.title}
            </h3>
          </div>

          {isDecrease && scenarioData.severity === 'severe' && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm sm:text-base text-red-800 dark:text-red-300 mb-1">🚨 Critical Situation</p>
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-400">
                    This income loss would require <strong>immediate and severe budget cuts</strong>. 
                    You may need to tap into emergency savings and consider finding alternative income sources quickly.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 sm:space-y-3">
            {scenarioData.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`rounded-lg border-2 transition-all ${
                  rec.priority === 'critical' 
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
                    : rec.priority === 'high'
                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <div
                  className="p-3 sm:p-4 cursor-pointer hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setExpandedCategory(expandedCategory === index ? null : index)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {rec.icon && <rec.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">{rec.category}</h4>
                          {rec.action === 'eliminate' && (
                            <span className="px-2 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded text-xs font-bold">
                              ✂️ ELIMINATE
                            </span>
                          )}
                          {rec.action === 'reduce_major' && (
                            <span className="px-2 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded text-xs font-bold">
                              📉 MAJOR CUT
                            </span>
                          )}
                          {rec.action === 'reduce_minor' && (
                            <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded text-xs font-bold">
                              ⬇️ REDUCE
                            </span>
                          )}
                          {rec.action === 'increase_savings' && (
                            <span className="px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-xs font-bold">
                              💰 SAVE MORE
                            </span>
                          )}
                          {rec.action === 'essentials_only' && (
                            <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded text-xs font-bold">
                              🏠 ESSENTIALS ONLY
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{rec.description}</p>
                      </div>
                    </div>
                    <div className="text-right ml-2 sm:ml-4 flex-shrink-0">
                      {rec.cutAmount !== undefined ? (
                        <>
                          <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">
                            -{formatCurrency(rec.cutAmount)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {rec.cutPercentage?.toFixed(0)}% reduction
                          </div>
                        </>
                      ) : (
                        <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                          +{formatCurrency(rec.amount)}
                        </div>
                      )}
                    </div>
                    {expandedCategory === index ? (
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 ml-1 sm:ml-2 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 ml-1 sm:ml-2 flex-shrink-0" />
                    )}
                  </div>
                </div>

                {expandedCategory === index && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t-2 border-gray-200 dark:border-gray-600 pt-3 sm:pt-4 bg-white dark:bg-slate-800">
                    {rec.currentAmount !== undefined && (
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-2 sm:p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Amount</p>
                          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(rec.currentAmount)}
                          </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 sm:p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">New Amount</p>
                          <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(rec.newAmount)}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {rec.breakdown && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-purple-200 dark:border-purple-800">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3">
                          Essentials-Only Budget Breakdown:
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Mortgage:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.mortgage)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Food:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.food)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Electricity:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.electricity)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Other Essentials:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.otherEssentials)}</span>
                          </div>
                          <div className="flex justify-between col-span-2 border-t border-purple-200 dark:border-purple-700 pt-2">
                            <span className="font-bold text-gray-900 dark:text-gray-100">Total:</span>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(rec.breakdown.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Specific Actions You Can Take:
                      </p>
                      <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1 sm:space-y-2">
                        {getSpecificActions(rec.category, rec.action).map((action, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                            <span>{action}</span>
                          </li>
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

      {/* Call to Action when no scenario selected and no sliders adjusted */}
      {!activeScenario && salary1Change === 0 && salary2Change === 0 && otherIncomeChange === 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 sm:p-8 text-center border-2 border-blue-200 dark:border-blue-800">
          <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Choose a Scenario Above
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Select one of the preset scenarios to see exactly how it would impact your finances
            and what actions you'd need to take.
          </p>
        </div>
      )}
    </div>
  );
};

// Helper function for specific actions
const getSpecificActions = (category, action) => {
  const actions = {
    'Entertainment': {
      'eliminate': [
        'Cancel ALL streaming services (Netflix, Spotify, Disney+, etc.)',
        'Stop all dining out - meal prep at home exclusively',
        'Cancel gym membership - use free outdoor exercise or YouTube workouts',
        'Postpone ALL concerts, movies, theater, and paid events'
      ],
      'reduce_major': [
        'Keep ONLY one streaming service, cancel the rest',
        'Limit dining out to 1-2 times per month maximum',
        'Switch to free entertainment (parks, free concerts, hiking)',
        'Cancel premium subscriptions, use free alternatives'
      ],
      'reduce_minor': [
        'Share family streaming accounts instead of individual subscriptions',
        'Use restaurant discount apps and coupons',
        'Choose matinee movie times for cheaper tickets',
        'Look for free community events and activities'
      ]
    },
    'Shopping': {
      'eliminate': [
        'Implement a complete shopping freeze - buy NOTHING non-essential',
        'Use only what you already own',
        'Cancel ALL subscription boxes',
        'Unsubscribe from marketing emails to reduce temptation'
      ],
      'reduce_major': [
        'Buy only absolute necessities - no wants',
        'Implement a 30-day waiting period before ANY purchase',
        'Shop secondhand stores exclusively',
        'Cancel all non-essential subscriptions immediately'
      ],
      'reduce_minor': [
        'Shop clearance and sales only',
        'Use cashback apps (Rakuten, Honey)',
        'Buy generic/store brands',
        'Wait for major sales events (Black Friday, end of season)'
      ]
    },
    'Transport': {
      'eliminate': [
        'Sell your car if you have multiple vehicles',
        'Use public transportation for ALL trips',
        'Bike or walk whenever possible',
        'Cancel car insurance on unused vehicles'
      ],
      'reduce_major': [
        'Reduce car usage by 50% - combine trips',
        'Set up carpooling for daily commute',
        'Switch to cheaper car insurance provider',
        'Cancel premium fuel - use regular gasoline'
      ],
      'reduce_minor': [
        'Use GasBuddy app to find cheapest fuel prices',
        'Keep tires properly inflated for better fuel economy',
        'Remove excess weight from car',
        'Maintain car regularly to prevent costly repairs'
      ]
    },
    'Food': {
      'reduce_minor': [
        'Meal plan for the entire week before shopping',
        'Buy store brands instead of name brands (save 30-40%)',
        'Shop at discount supermarkets (Aldi, Lidl)',
        'Reduce meat consumption - beans and lentils are cheaper protein',
        'Use loyalty programs and digital coupons',
        'Buy in bulk for non-perishables',
        'Avoid pre-packaged convenience foods'
      ]
    },
    'Utilities': {
      'reduce_minor': [
        'Lower thermostat by 2-3°C in winter, raise in summer',
        'Unplug devices and appliances when not in use',
        'Switch ALL bulbs to LED (saves €100-200/year)',
        'Take 5-minute showers instead of baths',
        'Call providers to negotiate better rates',
        'Use cold water for laundry',
        'Air dry clothes instead of using dryer'
      ]
    },
    'Savings': {
      'increase_savings': [
        'Set up automatic transfer to high-yield savings account',
        'Build emergency fund to 6 months of expenses',
        'Contribute to retirement accounts (tax advantages)',
        'Consider low-cost index fund investments',
        'Pay yourself first - save before spending'
      ]
    },
    'Debt Payments': {
      'accelerate_debt': [
        'Target highest interest rate debt first (avalanche method)',
        'Make bi-weekly payments instead of monthly',
        'Round up payments to nearest €100',
        'Put ALL bonuses and windfalls toward debt',
        'Call creditors to negotiate lower interest rates',
        'Consolidate high-interest debts if possible'
      ]
    },
    'Lifestyle': {
      'improve_lifestyle': [
        'Invest in quality items that last longer',
        'Take a modest vacation or weekend trip',
        'Upgrade one major home item',
        'Invest in a hobby or skill development course',
        'Treat yourself occasionally while maintaining balance'
      ]
    },
    'Essentials-Only Budget': {
      'essentials_only': [
        'Prioritize mortgage, food, electricity, and other essential bills.',
        'Temporarily halt all discretionary spending.',
        'Explore options to reduce essential costs (e.g., energy-saving habits, cheaper food alternatives).',
        'Consider temporary additional income sources if a deficit persists.'
      ]
    }
  };

  return actions[category]?.[action] || [
    'Review this category carefully for cost-saving opportunities',
    'Research cheaper alternatives',
    'Track spending in this category for a month',
    'Consider if this expense is truly necessary'
  ];
};

export default FinancialScenarios;
