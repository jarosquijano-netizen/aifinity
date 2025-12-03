import React, { useState, useEffect } from 'react';
import { Loader, Save, Sparkles, TrendingUp, AlertCircle, CheckCircle, Search, DollarSign, Users, MapPin, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { getTransactionCategories, getBudgetSuggestions, updateCategoryBudget, getBudgetOverview } from '../utils/api';
import { parseCategory } from '../utils/categoryFormat';
import { getCategoryIcon } from '../utils/categoryIcons';
import { getCategoryColor } from '../utils/categoryColors';

// Setup Budget component with AI-powered income-adaptive suggestions

function SetupBudget({ onBudgetSaved }) {
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [budgets, setBudgets] = useState({});
  const [originalBudgets, setOriginalBudgets] = useState({}); // Track original values for comparison
  const [allCategoryBudgets, setAllCategoryBudgets] = useState({}); // All budgets from database (for accurate totals)
  const [isAnnual, setIsAnnual] = useState({}); // Track which categories are annual
  const [errors, setErrors] = useState({});
  const [successMessages, setSuccessMessages] = useState({});
  const [overallInsights, setOverallInsights] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(false);
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch suggestions (which includes transaction categories)
      const suggestionsData = await getBudgetSuggestions();
      
      setUserProfile(suggestionsData.userProfile);
      
      // Convert suggestions array to map
      const suggestionsMap = {};
      suggestionsData.suggestions?.forEach(item => {
        suggestionsMap[item.category] = item;
      });
      setSuggestions(suggestionsMap);
      
      // Store overall insights and metadata if available
      if (suggestionsData.overallInsights) {
        setOverallInsights(suggestionsData.overallInsights);
      }
      if (suggestionsData.metadata) {
        setMetadata(suggestionsData.metadata);
      }
      
      // FIRST: Fetch existing budget categories to get IDs and ALL budgets from database
      // This is critical - we need to load budgets from DB first, not just from suggestions
      let categoriesData = { categories: [] }; // Initialize with default value
      try {
        categoriesData = await getTransactionCategories();
        setCategories(categoriesData.categories || []);
      } catch (err) {
        console.error('Failed to load budget categories:', err);
        categoriesData = { categories: [] }; // Ensure it's always defined
      }
      
      // Ensure categoriesData is always an object with categories array
      if (!categoriesData || !categoriesData.categories) {
        categoriesData = { categories: [] };
      }
      
      // Initialize budgets from database FIRST (this is the source of truth)
      const budgetsMap = {};
      const originalBudgetsMap = {};
      const isAnnualMap = {};
      
      // Load budgets from database categories
      // IMPORTANT: Load ALL budgets from DB, even if 0, to preserve the state
      (categoriesData.categories || []).forEach(cat => {
        // Always set budget, even if 0, to preserve state
        const budgetAmount = parseFloat(cat.budget_amount || 0);
        budgetsMap[cat.name] = budgetAmount;
        originalBudgetsMap[cat.name] = budgetAmount;
        
        if (cat.is_annual) {
          isAnnualMap[cat.name] = true;
        }
      });
      
      console.log('📊 Loaded budgets from database:', Object.keys(budgetsMap).length, 'categories');
      console.log('📊 Budgets map:', budgetsMap);
      
      // Then, add budgets from suggestions for categories that don't have budgets in DB yet
      // This ensures we show all transaction categories, even if they don't have budgets set
      // IMPORTANT: Only add if category doesn't exist in budgetsMap AND currentBudget > 0
      suggestionsData.suggestions?.forEach(item => {
        // Only add if category doesn't already have a budget from DB AND currentBudget > 0
        if (!budgetsMap.hasOwnProperty(item.category) && item.currentBudget && item.currentBudget > 0) {
          budgetsMap[item.category] = item.currentBudget;
          originalBudgetsMap[item.category] = item.currentBudget;
        }
      });
      
      setBudgets(budgetsMap);
      setOriginalBudgets(originalBudgetsMap);
      setIsAnnual(isAnnualMap);
      
      // Helper function to check if two categories are duplicates
      const isDuplicateCategory = (name1, name2) => {
        if (name1 === name2) return true;
        if (name1.includes(' > ')) {
          const subcategory = name1.split(' > ')[1];
          if (subcategory === name2) return true;
        }
        if (name2.includes(' > ')) {
          const subcategory = name2.split(' > ')[1];
          if (subcategory === name1) return true;
        }
        return false;
      };
      
      // Create a map of ALL category budgets from database (for accurate totals)
      // Exclude transfers and NC categories (same logic as Overview)
      // IMPORTANT: Deduplicate to avoid double-counting budgets
      const excludedCategories = [
        'Finanzas > Transferencias',
        'Transferencias',
        'NC',
        'nc'
      ];
      const allBudgetsMap = {};
      
      // Helper function to check if a category is a parent of any other category
      const isParentCategory = (categoryName, budgetsMap) => {
        // A category is a parent if it matches the group part of any hierarchical category
        // e.g., "Alimentación" is a parent of "Alimentación > Supermercado"
        if (!categoryName || categoryName.includes(' > ')) {
          return false; // Hierarchical categories are not parents
        }
        
        // Check if any category in budgetsMap starts with this category name + " > "
        for (const key in budgetsMap) {
          if (key.startsWith(categoryName + ' > ')) {
            return true; // Found a child category
          }
        }
        return false;
      };
      
      // Deduplicate categories: prefer hierarchical format over old format
      // Ensure categoriesData is defined before using it
      if (categoriesData && categoriesData.categories) {
        (categoriesData.categories || []).forEach(cat => {
        if (cat.budget_amount && parseFloat(cat.budget_amount) > 0) {
          // Exclude transfers and NC categories
          if (excludedCategories.includes(cat.name)) {
            return;
          }
          
          // Check if this category is a duplicate
          let isDuplicate = false;
          let existingKey = null;
          
          for (const key in allBudgetsMap) {
            if (isDuplicateCategory(cat.name, key)) {
              isDuplicate = true;
              // Prefer hierarchical format
              if (cat.name.includes(' > ')) {
                // New category is hierarchical, replace old format
                existingKey = key;
                break;
              } else if (key.includes(' > ')) {
                // Existing category is hierarchical, keep it and merge budget
                existingKey = key;
                break;
              } else {
                // Both are old format, use existing
                existingKey = key;
                break;
              }
            }
          }
          
          if (!isDuplicate) {
            // No duplicate found, add the category
            allBudgetsMap[cat.name] = parseFloat(cat.budget_amount);
          } else if (existingKey && cat.name.includes(' > ')) {
            // Duplicate found and new category is hierarchical - replace old format
            const oldBudget = allBudgetsMap[existingKey] || 0;
            const newBudget = parseFloat(cat.budget_amount);
            delete allBudgetsMap[existingKey];
            allBudgetsMap[cat.name] = oldBudget + newBudget;
          } else if (existingKey && existingKey.includes(' > ')) {
            // Duplicate found and existing category is hierarchical - merge budget into existing
            const existingBudget = allBudgetsMap[existingKey] || 0;
            const newBudget = parseFloat(cat.budget_amount);
            allBudgetsMap[existingKey] = existingBudget + newBudget;
          }
        }
      });
      
      // Remove parent categories that have children (to avoid double-counting)
      const finalBudgetsMap = {};
      const excludedParents = [];
      const totalBeforeExclusion = Object.values(allBudgetsMap).reduce((sum, b) => sum + (b || 0), 0);
      
      // Log all category names to see what we're working with
      const allCategoryNames = Object.keys(allBudgetsMap).sort();
      console.log('🔍 Budget calculation - Total before exclusion:', totalBeforeExclusion);
      console.log('🔍 Budget calculation - All categories:', allCategoryNames.length);
      console.log('🔍 All category names:', allCategoryNames);
      
      // Check each category to see if it's a parent
      for (const [catName, budgetAmount] of Object.entries(allBudgetsMap)) {
        const isParent = isParentCategory(catName, allBudgetsMap);
        if (isParent) {
          excludedParents.push({ name: catName, amount: budgetAmount });
          console.log(`🚫 Excluding parent category: ${catName} (€${budgetAmount})`);
          // Show which children were found
          const children = Object.keys(allBudgetsMap).filter(k => k.startsWith(catName + ' > '));
          console.log(`   └─ Children found:`, children);
          continue; // Skip parent category
        }
        finalBudgetsMap[catName] = budgetAmount;
      }
      
      const totalAfterExclusion = Object.values(finalBudgetsMap).reduce((sum, b) => sum + (b || 0), 0);
      
      // Debug log
      console.log('📊 Budget calculation results:');
      console.log('  - Excluded parent categories:', excludedParents.length, excludedParents);
      console.log('  - Total before exclusion: €' + totalBeforeExclusion.toFixed(2));
      console.log('  - Total after exclusion: €' + totalAfterExclusion.toFixed(2));
      console.log('  - Difference: €' + (totalBeforeExclusion - totalAfterExclusion).toFixed(2));
      
      setAllCategoryBudgets(finalBudgetsMap);
    } catch (err) {
      console.error('Failed to load setup budget data:', err);
      // Error is handled by setting loading to false, UI will show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefreshAnalysis = async () => {
    await fetchData(true);
  };

  const handleBudgetChange = (categoryName, value) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      setErrors(prev => ({ ...prev, [categoryName]: 'Please enter a valid number' }));
      return;
    }
    
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[categoryName];
      return newErrors;
    });
    
    setBudgets(prev => ({
      ...prev,
      [categoryName]: numValue
    }));
  };

  const handleSaveBudget = async (categoryName, budgetAmountOverride = null) => {
    try {
      setSaving(prev => ({ ...prev, [categoryName]: true }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[categoryName];
        return newErrors;
      });
      
      // Find category ID if it exists
      const category = categories.find(c => c.name === categoryName);
      const categoryId = category?.id || null;
      
      // Use override value if provided (for Use button), otherwise use state
      const budgetAmount = budgetAmountOverride !== null ? budgetAmountOverride : (budgets[categoryName] || 0);
      const isAnnualValue = isAnnual[categoryName] || false;
      
      await updateCategoryBudget(categoryId, budgetAmount, categoryName, isAnnualValue);
      
      setSuccessMessages(prev => ({ ...prev, [categoryName]: 'Budget saved!' }));
      setTimeout(() => {
        setSuccessMessages(prev => {
          const updated = { ...prev };
          delete updated[categoryName];
          return updated;
        });
      }, 3000);
      
      // Refresh categories to get updated IDs and budgets
      const updatedCategories = await getTransactionCategories();
      setCategories(updatedCategories.categories || []);
      
      // Rebuild allCategoryBudgets map from refreshed categories (ensures accurate totals)
      // Exclude transfers and NC categories (same logic as Overview)
      // IMPORTANT: Deduplicate to avoid double-counting budgets
      const excludedCategories = [
        'Finanzas > Transferencias',
        'Transferencias',
        'NC',
        'nc'
      ];
      
      // Helper function to check if two categories are duplicates
      const isDuplicateCategory = (name1, name2) => {
        if (name1 === name2) return true;
        if (name1.includes(' > ')) {
          const subcategory = name1.split(' > ')[1];
          if (subcategory === name2) return true;
        }
        if (name2.includes(' > ')) {
          const subcategory = name2.split(' > ')[1];
          if (subcategory === name1) return true;
        }
        return false;
      };
      
      // Helper function to check if a category is a parent of any other category
      const isParentCategory = (categoryName, budgetsMap) => {
        // A category is a parent if it matches the group part of any hierarchical category
        // e.g., "Alimentación" is a parent of "Alimentación > Supermercado"
        if (!categoryName || categoryName.includes(' > ')) {
          return false; // Hierarchical categories are not parents
        }
        
        // Check if any category in budgetsMap starts with this category name + " > "
        for (const key in budgetsMap) {
          if (key.startsWith(categoryName + ' > ')) {
            return true; // Found a child category
          }
        }
        return false;
      };
      
      const allBudgetsMap = {};
      (updatedCategories.categories || []).forEach(cat => {
        if (cat.budget_amount && parseFloat(cat.budget_amount) > 0) {
          // Exclude transfers and NC categories
          if (excludedCategories.includes(cat.name)) {
            return;
          }
          
          // Check if this category is a duplicate
          let isDuplicate = false;
          let existingKey = null;
          
          for (const key in allBudgetsMap) {
            if (isDuplicateCategory(cat.name, key)) {
              isDuplicate = true;
              // Prefer hierarchical format
              if (cat.name.includes(' > ')) {
                // New category is hierarchical, replace old format
                existingKey = key;
                break;
              } else if (key.includes(' > ')) {
                // Existing category is hierarchical, keep it and merge budget
                existingKey = key;
                break;
              } else {
                // Both are old format, use existing
                existingKey = key;
                break;
              }
            }
          }
          
          if (!isDuplicate) {
            // No duplicate found, add the category
            allBudgetsMap[cat.name] = parseFloat(cat.budget_amount);
          } else if (existingKey && cat.name.includes(' > ')) {
            // Duplicate found and new category is hierarchical - replace old format
            const oldBudget = allBudgetsMap[existingKey] || 0;
            const newBudget = parseFloat(cat.budget_amount);
            delete allBudgetsMap[existingKey];
            allBudgetsMap[cat.name] = oldBudget + newBudget;
          } else if (existingKey && existingKey.includes(' > ')) {
            // Duplicate found and existing category is hierarchical - merge budget into existing
            const existingBudget = allBudgetsMap[existingKey] || 0;
            const newBudget = parseFloat(cat.budget_amount);
            allBudgetsMap[existingKey] = existingBudget + newBudget;
          }
        }
      });
      
      // Remove parent categories that have children (to avoid double-counting)
      const finalBudgetsMap = {};
      const excludedParents = [];
      const totalBeforeExclusion = Object.values(allBudgetsMap).reduce((sum, b) => sum + (b || 0), 0);
      
      console.log('🔍 Budget calculation (after save) - Total before exclusion:', totalBeforeExclusion);
      
      for (const [catName, budgetAmount] of Object.entries(allBudgetsMap)) {
        // Exclude parent categories that have children
        if (isParentCategory(catName, allBudgetsMap)) {
          excludedParents.push({ name: catName, amount: budgetAmount });
          console.log(`🚫 Excluding parent category: ${catName} (€${budgetAmount})`);
          continue; // Skip parent category
        }
        finalBudgetsMap[catName] = budgetAmount;
      }
      
      const totalAfterExclusion = Object.values(finalBudgetsMap).reduce((sum, b) => sum + (b || 0), 0);
      
      console.log('📊 Budget calculation (after save) results:');
      console.log('  - Excluded:', excludedParents.length, excludedParents);
      console.log('  - Total before: €' + totalBeforeExclusion.toFixed(2));
      console.log('  - Total after: €' + totalAfterExclusion.toFixed(2));
      
      setAllCategoryBudgets(finalBudgetsMap);
      
      // Also update budgets state to reflect saved value (keeps UI in sync)
      setBudgets(prev => ({
        ...prev,
        [categoryName]: budgetAmount
      }));
      
      // Update original budget to reflect saved value
      setOriginalBudgets(prev => ({
        ...prev,
        [categoryName]: budgetAmount
      }));
      
      // Notify parent component to refresh overview
      if (onBudgetSaved) {
        onBudgetSaved();
      }
    } catch (err) {
      console.error('Failed to save budget:', err);
      setErrors(prev => ({ ...prev, [categoryName]: 'Failed to save budget' }));
      throw err; // Re-throw so caller can handle it
    } finally {
      setSaving(prev => {
        const updated = { ...prev };
        delete updated[categoryName];
        return updated;
      });
    }
  };

  const handleUseSuggestion = async (categoryName) => {
    const suggestion = suggestions[categoryName];
    if (suggestion) {
      // Set the budget value in state for UI update
      setBudgets(prev => ({
        ...prev,
        [categoryName]: suggestion.suggestedBudget
      }));
      
      // Immediately save the budget with the suggested amount (pass directly to avoid state timing issues)
      try {
        await handleSaveBudget(categoryName, suggestion.suggestedBudget);
      } catch (err) {
        console.error('Failed to save budget when using suggestion:', err);
        setErrors(prev => ({ ...prev, [categoryName]: 'Failed to save suggestion' }));
      }
    }
  };

  // Get all unique transaction categories (from suggestions)
  // If suggestions are empty, show empty state
  const allTransactionCategories = Object.keys(suggestions).sort();

  // Filter categories based on search
  const filteredCategories = allTransactionCategories.filter(categoryName => {
    const parsed = parseCategory(categoryName);
    const displayName = parsed.category || parsed.displayName || categoryName;
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           categoryName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with User Profile Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 border border-blue-200 dark:border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            AI Budget Setup
          </h2>
          <button
            onClick={handleRefreshAnalysis}
            disabled={refreshing || loading}
            className="px-4 py-2 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="Refresh AI analysis based on latest transactions"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating...' : 'Update Analysis'}
          </button>
        </div>
        
        {userProfile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-lg p-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Family Size</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {userProfile.familySize} {userProfile.familySize === 1 ? 'person' : 'people'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-lg p-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Monthly Income</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {userProfile.monthlyIncome?.toLocaleString('es-ES')}€
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-lg p-3">
              <MapPin className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Location</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {userProfile.location || 'Spain'}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-4">
          💡 Budget suggestions are personalized based on your family profile and location. 
          Review and adjust as needed, then save to activate budgets.
        </p>
        
        {/* Overall AI Insights - Collapsible */}
        {overallInsights && (
          <div className="mt-4 bg-white dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
            <button
              onClick={() => setIsInsightsExpanded(!isInsightsExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                AI Budget Analysis
              </h3>
              {isInsightsExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            {isInsightsExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {overallInsights.topRecommendations && overallInsights.topRecommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Top Recommendations:</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {overallInsights.topRecommendations.map((rec, idx) => (
                        <li key={idx}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {overallInsights.warnings && overallInsights.warnings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">⚠️ Warnings:</p>
                    <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                      {overallInsights.warnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {overallInsights.strengths && overallInsights.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">✅ Strengths:</p>
                    <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
                      {overallInsights.strengths.map((strength, idx) => (
                        <li key={idx}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {metadata && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                    Analysis based on {metadata.basedOnTransactions || 0} transactions
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Budget Summary - Moved to top */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Budget Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Budget Set</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Object.values(allCategoryBudgets).reduce((sum, budget) => sum + (budget || 0), 0).toLocaleString('es-ES')}€
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              (Frontend calculated)
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Categories with Budget</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Object.values(allCategoryBudgets).filter(b => b > 0).length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Suggested Total</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Object.values(suggestions).reduce((sum, s) => sum + (s.suggestedBudget || 0), 0).toLocaleString('es-ES')}€
            </div>
          </div>
        </div>
        {userProfile && userProfile.monthlyIncome && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Income</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {userProfile.monthlyIncome.toLocaleString('es-ES')}€
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Budget Usage</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {((Object.values(budgets).reduce((sum, budget) => sum + (budget || 0), 0) / userProfile.monthlyIncome) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((Object.values(budgets).reduce((sum, budget) => sum + (budget || 0), 0) / userProfile.monthlyIncome) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-primary pl-10 w-full"
        />
      </div>

      {/* Categories List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No categories found. Make sure you have transactions categorized.
            </div>
          ) : (
            filteredCategories.map((categoryName) => {
              const parsed = parseCategory(categoryName);
              const displayName = parsed.category || parsed.displayName || categoryName;
              const groupName = parsed.group;
              const suggestion = suggestions[categoryName];
              const currentBudget = budgets[categoryName] || 0;
              const Icon = getCategoryIcon(categoryName);
              const colorClass = getCategoryColor(categoryName);
              const isSaving = saving[categoryName];
              const error = errors[categoryName];
              const success = successMessages[categoryName];

              return (
                <div
                  key={categoryName}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Category Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          {Icon && <Icon className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {groupName ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                {groupName}
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {displayName}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {displayName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Suggestion */}
                      {suggestion && (
                        <div className="ml-11 mt-2 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Suggested: <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {suggestion.suggestedBudget.toLocaleString('es-ES')}€
                              </span>
                            </span>
                            {suggestion.confidence && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                suggestion.confidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                suggestion.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {suggestion.confidence === 'high' ? '✓ High confidence' :
                                 suggestion.confidence === 'medium' ? '~ Medium confidence' :
                                 '? Low confidence'}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              (Range: {suggestion.benchmark.min}-{suggestion.benchmark.max}€)
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                            {suggestion.reason}
                          </p>
                          {suggestion.insights && suggestion.insights.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {suggestion.insights.map((insight, idx) => (
                                <p key={idx} className="text-xs text-blue-600 dark:text-blue-400">
                                  💡 {insight}
                                </p>
                              ))}
                            </div>
                          )}
                          {suggestion.comparison && (
                            <div className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                              {suggestion.comparison.variance === 'above' && '📈 Above average'}
                              {suggestion.comparison.variance === 'below' && '📉 Below average'}
                              {suggestion.comparison.variance === 'on-track' && '✅ On track'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Budget Input */}
                    <div className="flex items-center gap-3 md:w-80">
                      <div className="flex-1">
                        <div className="relative">
                          <input
                            type="number"
                            value={currentBudget === 0 ? '' : currentBudget}
                            onChange={(e) => handleBudgetChange(categoryName, e.target.value)}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            className={`input-primary w-full pr-20 ${
                              error ? 'border-red-500' : ''
                            }`}
                            disabled={isSaving}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                            {isAnnual[categoryName] ? '€/año' : '€'}
                          </span>
                        </div>
                        {isAnnual[categoryName] && currentBudget > 0 && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            ≈ {(currentBudget / 12).toFixed(2)}€/mes
                          </p>
                        )}
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAnnual[categoryName] || false}
                            onChange={(e) => {
                              setIsAnnual(prev => ({
                                ...prev,
                                [categoryName]: e.target.checked
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            disabled={isSaving}
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Pago anual (se divide entre 12 meses)
                          </span>
                        </label>
                        {error && (
                          <p className="text-xs text-red-500 mt-1">{error}</p>
                        )}
                        {success && (
                          <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {success}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {suggestion && currentBudget !== suggestion.suggestedBudget && (
                          <button
                            onClick={() => handleUseSuggestion(categoryName)}
                            className="px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1"
                            disabled={isSaving}
                            title="Use AI suggestion"
                          >
                            <TrendingUp className="w-3 h-3" />
                            Use
                          </button>
                        )}
                        <button
                          onClick={() => handleSaveBudget(categoryName)}
                          disabled={isSaving || currentBudget === (originalBudgets[categoryName] || 0)}
                          className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

export default SetupBudget;

