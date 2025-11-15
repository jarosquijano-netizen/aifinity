import React, { useState, useEffect } from 'react';
import { X, Tag, AlertCircle, CheckCircle2, Search, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryColor } from '../utils/categoryColors';
import { getCategoryIcon, getAllCategoriesWithIcons } from '../utils/categoryIcons';
import { parseCategory } from '../utils/categoryFormat';

function CategoryModal({ transaction, categories, onClose, onUpdate }) {
  const [selectedCategory, setSelectedCategory] = useState(transaction?.category || '');
  const [updateSimilar, setUpdateSimilar] = useState(false);
  const [isComputable, setIsComputable] = useState(transaction?.computable !== false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    if (transaction) {
      setSelectedCategory(transaction.category);
    }
  }, [transaction]);

  // Get all categories organized by groups
  const allCategoriesWithGroups = getAllCategoriesWithIcons();
  
  // Filter categories based on search term
  const filteredCategories = searchTerm 
    ? allCategoriesWithGroups.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allCategoriesWithGroups;
  
  // Group filtered categories by group
  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    if (!acc[cat.group]) {
      acc[cat.group] = [];
    }
    acc[cat.group].push(cat);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      setMessage({ type: 'error', text: t('selectCategory') || 'Por favor selecciona una categoría' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await onUpdate(transaction.id, selectedCategory, updateSimilar, isComputable);
      
      if (result.similarUpdated > 0) {
        setMessage({
          type: 'success',
          text: `✅ Categoría actualizada exitosamente!\n📊 ${result.updatedCount} transacciones actualizadas en total\n🔍 ${result.similarUpdated} transacciones similares (≥90%) encontradas y actualizadas`
        });
      } else if (updateSimilar) {
        setMessage({
          type: 'success',
          text: '✅ Categoría actualizada exitosamente\n🔍 No se encontraron transacciones similares (≥90%)'
        });
      } else {
        setMessage({
          type: 'success',
          text: '✅ Categoría actualizada exitosamente'
        });
      }

      // Close modal after 2 seconds (more time to read the detailed message)
      setTimeout(() => {
        onClose(true); // true indicates success
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: '❌ Error al actualizar la categoría'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('reassignCategory') || 'Reasignar Categoría'}
            </h3>
          </div>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Transaction Info */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('transaction') || 'Transacción'}
                </p>
                <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                  {transaction.description}
                </p>
              </div>
              <span className={`ml-2 font-bold ${
                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}
                {parseFloat(transaction.amount).toFixed(2)}€
              </span>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('currentCategory') || 'Categoría actual'}:
              </span>
              <div className="flex items-center space-x-1">
                {React.createElement(getCategoryIcon(transaction.category), {
                  className: "w-4 h-4 text-gray-600 dark:text-gray-400"
                })}
                <span className={getCategoryColor(transaction.category)}>
                  {transaction.category}
                </span>
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('selectNewCategory') || 'Selecciona nueva categoría'}
            </label>
            
            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchCategories') || 'Buscar categorías...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-slate-700 dark:text-gray-100 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Categories Grid - Organized by Groups */}
            <div className="space-y-4 pr-2 custom-scrollbar">
              {Object.keys(groupedCategories).length > 0 ? (
                Object.entries(groupedCategories).map(([group, cats]) => (
                  <div key={group}>
                    {/* Group Header */}
                    <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-800 py-1 z-10">
                      {group} ({cats.length})
                    </h4>
                    
                    {/* Categories in this group */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {cats.map((cat) => {
                        const IconComponent = cat.icon;
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`flex items-center space-x-1.5 text-left px-2.5 py-2 rounded-lg border-2 transition-all transform hover:scale-105 ${
                              selectedCategory === cat.name
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md ring-2 ring-purple-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm'
                            }`}
                            title={cat.name}
                          >
                            <IconComponent className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                            <span className={`${getCategoryColor(cat.name)} text-[10px] leading-tight flex-1 line-clamp-2`}>
                              {(() => {
                                const parsed = parseCategory(cat.name);
                                return parsed.category || parsed.displayName || cat.name;
                              })()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('noCategoriesFound') || 'No se encontraron categorías'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-6 space-y-4 flex-shrink-0">
            {/* Update Similar Checkbox */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateSimilar}
                  onChange={(e) => setUpdateSimilar(e.target.checked)}
                  className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {t('updateSimilarTransactions') || 'Actualizar transacciones similares'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('updateSimilarDescription') || 
                      'Se actualizarán automáticamente todas las transacciones con descripciones 90% similares a esta'}
                  </p>
                </div>
              </label>
            </div>

            {/* Computable Checkbox */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!isComputable}
                  onChange={(e) => setIsComputable(!e.target.checked)}
                  className="mt-1 w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {t('notComputable') || 'No Computable'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('notComputableDescription') || 
                      'Marca esta opción para transferencias entre tus cuentas. No se contarán como ingresos ni gastos en las estadísticas.'}
                  </p>
                </div>
              </label>
            </div>

            {/* Message */}
            {message && (
              <div className={`flex items-start space-x-3 p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm whitespace-pre-line leading-relaxed">{message.text}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => onClose(false)}
                disabled={loading}
                className="flex-1 btn-secondary"
              >
                {t('cancel') || 'Cancelar'}
              </button>
              <button
                type="submit"
                disabled={loading || !selectedCategory}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('updating') || 'Actualizando...'}
                  </span>
                ) : (
                  t('update') || 'Actualizar'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal;

