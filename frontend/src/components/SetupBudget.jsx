import React, { useState, useEffect } from 'react';
import { Loader, Save, Sparkles, TrendingUp, AlertCircle, CheckCircle, Search, DollarSign, Users, MapPin } from 'lucide-react';
import { getTransactionCategories, getBudgetSuggestions, updateCategoryBudget } from '../utils/api';
import { parseCategory } from '../utils/categoryFormat';
import { getCategoryIcon } from '../utils/categoryIcons';
import { getCategoryColor } from '../utils/categoryColors';

function SetupBudget({ onBudgetSaved }) {
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [budgets, setBudgets] = useState({});
  const [errors, setErrors] = useState({});
  const [successMessages, setSuccessMessages] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories and suggestions in parallel
      const [categoriesData, suggestionsData] = await Promise.all([
        getTransactionCategories(),
        getBudgetSuggestions()
      ]);
      
      setCategories(categoriesData.categories || []);
      setUserProfile(suggestionsData.userProfile);
      
      // Convert suggestions array to map
      const suggestionsMap = {};
      suggestionsData.suggestions?.forEach(item => {
        suggestionsMap[item.category] = item;
      });
      setSuggestions(suggestionsMap);
      
      // Initialize budgets from existing categories
      const budgetsMap = {};
      categoriesData.categories?.forEach(cat => {
        budgetsMap[cat.name] = parseFloat(cat.budget_amount || 0);
      });
      setBudgets(budgetsMap);
    } catch (err) {
      console.error('Failed to load setup budget data:', err);
    } finally {
      setLoading(false);
    }
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

  const handleSaveBudget = async (categoryName) => {
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
      
      const budgetAmount = budgets[categoryName] || 0;
      
      await updateCategoryBudget(categoryId, budgetAmount, categoryName);
      
      setSuccessMessages(prev => ({ ...prev, [categoryName]: 'Budget saved!' }));
      setTimeout(() => {
        setSuccessMessages(prev => {
          const updated = { ...prev };
          delete updated[categoryName];
          return updated;
        });
      }, 3000);
      
      // Refresh categories to get updated IDs
      const updatedCategories = await getTransactionCategories();
      setCategories(updatedCategories.categories || []);
      
      // Notify parent component to refresh overview
      if (onBudgetSaved) {
        onBudgetSaved();
      }
    } catch (err) {
      console.error('Failed to save budget:', err);
      setErrors(prev => ({ ...prev, [categoryName]: 'Failed to save budget' }));
    } finally {
      setSaving(prev => {
        const new = { ...prev };
        delete new[categoryName];
        return new;
      });
    }
  };

  const handleUseSuggestion = (categoryName) => {
    const suggestion = suggestions[categoryName];
    if (suggestion) {
      setBudgets(prev => ({
        ...prev,
        [categoryName]: suggestion.suggestedBudget
      }));
      // Auto-save when using suggestion
      setTimeout(() => {
        handleSaveBudget(categoryName);
      }, 100);
    }
  };

  // Get all unique transaction categories (from suggestions)
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
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              (Range: {suggestion.benchmark.min}-{suggestion.benchmark.max}€)
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                            {suggestion.reason}
                          </p>
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
                            €
                          </span>
                        </div>
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
                          disabled={isSaving || currentBudget === (budgets[categoryName] || 0)}
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

      {/* Summary */}
      {filteredCategories.length > 0 && (
        <div className="bg-blue-50 dark:bg-slate-700 rounded-2xl p-6 border border-blue-200 dark:border-slate-600">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Budget Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Budget Set</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Object.values(budgets).reduce((sum, budget) => sum + (budget || 0), 0).toLocaleString('es-ES')}€
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Categories with Budget</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Object.values(budgets).filter(b => b > 0).length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Suggested Total</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Object.values(suggestions).reduce((sum, s) => sum + (s.suggestedBudget || 0), 0).toLocaleString('es-ES')}€
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SetupBudget;

