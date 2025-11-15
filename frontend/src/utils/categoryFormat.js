/**
 * Utility functions for formatting hierarchical categories
 * Format: "Group > Category" (e.g., "Vivienda > Hogar")
 */

/**
 * Extract group and category from hierarchical format
 * @param {string} categoryName - Full category name (e.g., "Vivienda > Hogar")
 * @returns {Object} - { group: "Vivienda", category: "Hogar", displayName: "Hogar" }
 */
export function parseCategory(categoryName) {
  if (!categoryName) {
    return { group: null, category: null, displayName: categoryName };
  }

  if (categoryName.includes(' > ')) {
    const parts = categoryName.split(' > ');
    return {
      group: parts[0],
      category: parts[1],
      displayName: parts[1], // Show just the category name
      fullName: categoryName // Keep full name for filtering
    };
  }

  // Not hierarchical, return as-is
  return {
    group: null,
    category: categoryName,
    displayName: categoryName,
    fullName: categoryName
  };
}

/**
 * Get category group for sorting/grouping
 * @param {string} categoryName - Full category name
 * @returns {string} - Group name or null
 */
export function getCategoryGroup(categoryName) {
  return parseCategory(categoryName).group;
}

/**
 * Sort categories by group, then by name
 * @param {Array} categories - Array of category objects with 'name' property
 * @returns {Array} - Sorted categories
 */
export function sortCategoriesByGroup(categories) {
  return [...categories].sort((a, b) => {
    const aParsed = parseCategory(a.name);
    const bParsed = parseCategory(b.name);
    
    // If both have groups, sort by group first
    if (aParsed.group && bParsed.group) {
      const groupCompare = aParsed.group.localeCompare(bParsed.group);
      if (groupCompare !== 0) return groupCompare;
      // Same group, sort by category name
      return aParsed.category.localeCompare(bParsed.category);
    }
    
    // If only one has a group, groups come first
    if (aParsed.group && !bParsed.group) return -1;
    if (!aParsed.group && bParsed.group) return 1;
    
    // Neither has group, sort alphabetically
    return aParsed.displayName.localeCompare(bParsed.displayName);
  });
}

/**
 * Group categories by their group name
 * @param {Array} categories - Array of category objects
 * @returns {Object} - { "Vivienda": [...], "Alimentación": [...], etc. }
 */
export function groupCategoriesByGroup(categories) {
  const grouped = {};
  
  categories.forEach(cat => {
    const parsed = parseCategory(cat.name);
    const group = parsed.group || 'Otros';
    
    if (!grouped[group]) {
      grouped[group] = [];
    }
    
    grouped[group].push({
      ...cat,
      parsedCategory: parsed
    });
  });
  
  return grouped;
}

