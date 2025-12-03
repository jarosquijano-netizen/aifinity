/**
 * Master Category List - Single source of truth for all categories
 * All categories must be in hierarchical format: "Group > Category"
 */

import { getAllCategoriesWithIcons } from './categoryIcons';

/**
 * Get the master list of all valid categories
 * @returns {Array<string>} - Array of category names in hierarchical format
 */
export function getMasterCategoryList() {
  const categories = getAllCategoriesWithIcons();
  return categories.map(cat => cat.name);
}

/**
 * Normalize a category name to the master format
 * Maps old/non-hierarchical categories to hierarchical format
 * @param {string} category - Category name (can be old format)
 * @returns {string} - Normalized category name in hierarchical format
 */
export function normalizeCategory(category) {
  if (!category) return 'Otros > Sin categoría';
  
  const categoryLower = category.toLowerCase().trim();
  
  // Category normalization mapping
  const categoryMap = {
    // Income categories -> Finanzas > Ingresos
    'ingresos': 'Finanzas > Ingresos',
    'salary': 'Finanzas > Ingresos',
    'payroll': 'Finanzas > Ingresos',
    'nomina': 'Finanzas > Ingresos',
    'nómina': 'Finanzas > Ingresos',
    'salario': 'Finanzas > Ingresos',
    'sueldo': 'Finanzas > Ingresos',
    
    // Transfer categories -> Finanzas > Transferencias
    'transferencias': 'Finanzas > Transferencias',
    'transferencia': 'Finanzas > Transferencias',
    'transfer': 'Finanzas > Transferencias',
    'traspaso': 'Finanzas > Transferencias',
    'bizum': 'Finanzas > Transferencias',
    
    // Cash -> Finanzas > Efectivo
    'efectivo': 'Finanzas > Efectivo',
    'cash': 'Finanzas > Efectivo',
    
    // Loans -> Finanzas > Préstamos
    'préstamos': 'Finanzas > Préstamos',
    'prestamos': 'Finanzas > Préstamos',
    'loan': 'Finanzas > Préstamos',
    'loans': 'Finanzas > Préstamos',
    
    // Savings -> Finanzas > Ahorro e inversiones
    'ahorro': 'Finanzas > Ahorro e inversiones',
    'inversiones': 'Finanzas > Ahorro e inversiones',
    'investment': 'Finanzas > Ahorro e inversiones',
    'investments': 'Finanzas > Ahorro e inversiones',
    
    // Groceries -> Alimentación > Supermercado
    'supermercado': 'Alimentación > Supermercado',
    'groceries': 'Alimentación > Supermercado',
    'alimentación': 'Alimentación > Supermercado',
    'alimentacion': 'Alimentación > Supermercado',
    
    // Restaurants -> Alimentación > Restaurante
    'restaurante': 'Alimentación > Restaurante',
    'restaurant': 'Alimentación > Restaurante',
    'food & dining': 'Alimentación > Restaurante',
    
    // Housing -> Vivienda > Hogar
    'hogar': 'Vivienda > Hogar',
    'housing': 'Vivienda > Hogar',
    'home': 'Vivienda > Hogar',
    
    // Mortgage -> Vivienda > Hipoteca
    'hipoteca': 'Vivienda > Hipoteca',
    'mortgage': 'Vivienda > Hipoteca',
    
    // Domestic Service -> Vivienda > Servicio doméstico
    'servicio doméstico': 'Vivienda > Servicio doméstico',
    'servicio domestico': 'Vivienda > Servicio doméstico',
    'domestic service': 'Vivienda > Servicio doméstico',
    
    // Transport -> Transporte > Transportes
    'transportes': 'Transporte > Transportes',
    'transport': 'Transporte > Transportes',
    'transportation': 'Transporte > Transportes',
    
    // Gas -> Transporte > Gasolina
    'gasolina': 'Transporte > Gasolina',
    'gas': 'Transporte > Gasolina',
    'fuel': 'Transporte > Gasolina',
    
    // Health -> Salud > Médico
    'médico': 'Salud > Médico',
    'medico': 'Salud > Médico',
    'healthcare': 'Salud > Médico',
    
    // Pharmacy -> Salud > Farmacia
    'farmacia': 'Salud > Farmacia',
    'pharmacy': 'Salud > Farmacia',
    
    // Shopping -> Compras > Compras
    'compras': 'Compras > Compras',
    'shopping': 'Compras > Compras',
    
    // Entertainment -> Ocio > Entretenimiento
    'entretenimiento': 'Ocio > Entretenimiento',
    'entertainment': 'Ocio > Entretenimiento',
    
    // Education -> Educación > Estudios
    'estudios': 'Educación > Estudios',
    'education': 'Educación > Estudios',
    
    // Sports -> Deporte > Deporte
    'deporte': 'Deporte > Deporte',
    'sports': 'Deporte > Deporte',
    
    // Others -> Otros > Otros
    'otros': 'Otros > Otros',
    'other': 'Otros > Otros',
    'others': 'Otros > Otros',
    'uncategorized': 'Otros > Sin categoría',
    'sin categoría': 'Otros > Sin categoría',
    'sin categoria': 'Otros > Sin categoría',
  };
  
  // Check exact match first
  if (categoryMap[categoryLower]) {
    return categoryMap[categoryLower];
  }
  
  // Check if already in hierarchical format
  if (category.includes(' > ')) {
    // Verify it's a valid master category
    const masterList = getMasterCategoryList();
    if (masterList.includes(category)) {
      return category;
    }
    // If not in master list, try to normalize the subcategory
    const parts = category.split(' > ');
    const subcategory = parts[1]?.toLowerCase().trim();
    if (subcategory && categoryMap[subcategory]) {
      return categoryMap[subcategory];
    }
  }
  
  // Default fallback
  return 'Otros > Sin categoría';
}

/**
 * Check if a category is valid (exists in master list)
 * @param {string} category - Category name to check
 * @returns {boolean} - True if category is valid
 */
export function isValidCategory(category) {
  if (!category) return false;
  const masterList = getMasterCategoryList();
  return masterList.includes(category);
}

/**
 * Get all valid categories for a specific group
 * @param {string} group - Group name (e.g., 'Finanzas', 'Vivienda')
 * @returns {Array<string>} - Array of category names in that group
 */
export function getCategoriesByGroup(group) {
  const masterList = getMasterCategoryList();
  return masterList.filter(cat => {
    if (cat.includes(' > ')) {
      return cat.split(' > ')[0] === group;
    }
    return false;
  });
}

