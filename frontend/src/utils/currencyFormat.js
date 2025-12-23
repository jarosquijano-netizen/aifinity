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

  // Use Intl.NumberFormat with Spanish locale for European format
  const formatter = new Intl.NumberFormat('es-ES', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits
  });

  return formatter.format(num);
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

