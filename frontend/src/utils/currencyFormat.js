/**
 * Format currency in European format (Spanish)
 * Format: 1.234,56 €
 * - Thousands separator: point (.)
 * - Decimal separator: comma (,)
 * - Currency symbol: € (at the end)
 */
export const formatCurrency = (amount, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true,
    currency = 'EUR'
  } = options;

  const num = parseFloat(amount || 0);
  
  if (isNaN(num)) {
    return showSymbol ? '0,00 €' : '0,00';
  }

  // Format number with European format (point for thousands, comma for decimals)
  // Use 'es-ES' locale which gives us: 1.234,56 format
  const formatted = new Intl.NumberFormat('es-ES', {
    style: 'decimal',
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits,
    useGrouping: true // Enable thousands separator
  }).format(num);

  // Add currency symbol at the end if needed
  // Format: 1.234,56 € (European format)
  return showSymbol ? `${formatted} €` : formatted;
};

/**
 * Format currency without symbol (just numbers with European format)
 */
export const formatCurrencyNumber = (amount, decimals = 2) => {
  return formatCurrency(amount, { 
    showSymbol: false, 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
};

/**
 * Format currency with custom decimals
 */
export const formatCurrencyDecimals = (amount, decimals = 2) => {
  return formatCurrency(amount, { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
};

