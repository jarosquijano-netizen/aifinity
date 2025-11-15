/**
 * Spending Benchmarks for Budget Insights
 * Based on Spanish family spending patterns
 */

const SPENDING_BENCHMARKS = {
  'Alimentación > Supermercado': {
    family1: { min: 200, avg: 300, max: 400 },
    family2: { min: 350, avg: 450, max: 600 },
    family3: { min: 450, avg: 600, max: 800 },
    family4: { min: 600, avg: 800, max: 1000 },
    percentOfIncome: { min: 10, avg: 15, max: 20 }
  },
  'Alimentación > Restaurante': {
    family1: { min: 80, avg: 150, max: 250 },
    family2: { min: 120, avg: 200, max: 350 },
    family3: { min: 150, avg: 250, max: 450 },
    family4: { min: 180, avg: 300, max: 500 },
    percentOfIncome: { min: 5, avg: 8, max: 12 }
  },
  'Vivienda > Hipoteca': {
    percentOfIncome: { min: 25, avg: 30, max: 35 }
  },
  'Vivienda > Alquiler y compra': {
    percentOfIncome: { min: 25, avg: 30, max: 35 }
  },
  'Transporte > Gasolina': {
    family1: { min: 60, avg: 100, max: 150 },
    family2: { min: 80, avg: 120, max: 180 },
    family3: { min: 100, avg: 150, max: 220 },
    family4: { min: 120, avg: 180, max: 250 }
  },
  'Transporte > Transportes': {
    family1: { min: 40, avg: 80, max: 120 },
    family2: { min: 60, avg: 100, max: 150 },
    family3: { min: 80, avg: 120, max: 180 },
    family4: { min: 100, avg: 150, max: 200 }
  },
  'Compras > Compras': {
    family1: { min: 100, avg: 200, max: 350 },
    family2: { min: 150, avg: 300, max: 500 },
    family3: { min: 200, avg: 400, max: 650 },
    family4: { min: 250, avg: 500, max: 800 },
    percentOfIncome: { min: 5, avg: 10, max: 15 }
  },
  'Finanzas > Préstamos': {
    percentOfIncome: { min: 10, avg: 15, max: 20 }
  },
  'Servicios > Servicios y productos online': {
    family1: { min: 20, avg: 40, max: 80 },
    family2: { min: 30, avg: 60, max: 100 },
    family3: { min: 40, avg: 80, max: 130 },
    family4: { min: 50, avg: 100, max: 160 }
  },
  'Servicios > Internet': {
    family1: { min: 30, avg: 40, max: 50 },
    family2: { min: 30, avg: 40, max: 50 },
    family3: { min: 30, avg: 40, max: 50 },
    family4: { min: 30, avg: 40, max: 50 }
  },
  'Servicios > Móvil': {
    family1: { min: 20, avg: 30, max: 40 },
    family2: { min: 40, avg: 60, max: 80 },
    family3: { min: 60, avg: 90, max: 120 },
    family4: { min: 80, avg: 120, max: 160 }
  },
  'Salud > Médico': {
    family1: { min: 50, avg: 100, max: 200 },
    family2: { min: 100, avg: 200, max: 400 },
    family3: { min: 150, avg: 300, max: 600 },
    family4: { min: 200, avg: 400, max: 800 }
  },
  'Ocio > Entretenimiento': {
    family1: { min: 50, avg: 100, max: 200 },
    family2: { min: 80, avg: 150, max: 300 },
    family3: { min: 100, avg: 200, max: 400 },
    family4: { min: 120, avg: 250, max: 500 }
  },
  'Ocio > Vacation': {
    family1: { min: 0, avg: 100, max: 300 },
    family2: { min: 0, avg: 150, max: 400 },
    family3: { min: 0, avg: 200, max: 500 },
    family4: { min: 0, avg: 250, max: 600 }
  }
};

/**
 * Get benchmark data for a category
 * @param {string} category - Category name
 * @param {object} userProfile - User profile with familySize, monthlyIncome, location
 * @returns {string} Formatted benchmark text
 */
export function getCategoryBenchmark(category, userProfile) {
  const benchmark = SPENDING_BENCHMARKS[category];
  if (!benchmark) return 'No benchmark data available';
  
  const familySize = userProfile?.familySize || 1;
  const familyKey = `family${familySize}`;
  const familyBenchmark = benchmark[familyKey];
  
  let result = '';
  
  if (familyBenchmark) {
    result += `Average for family of ${familySize}: ${familyBenchmark.avg}€/month (range: ${familyBenchmark.min}-${familyBenchmark.max}€)\n`;
  }
  
  if (benchmark.percentOfIncome && userProfile?.monthlyIncome) {
    const avgPercent = benchmark.percentOfIncome.avg;
    const recommendedAmount = (userProfile.monthlyIncome * avgPercent) / 100;
    result += `Recommended for your income (${userProfile.monthlyIncome}€): ${avgPercent}% = ${recommendedAmount.toFixed(0)}€`;
  }
  
  return result || 'No benchmark data available';
}

/**
 * Get benchmark value for a category
 * @param {string} category - Category name
 * @param {number} familySize - Family size
 * @returns {object} Benchmark object with min, avg, max
 */
export function getBenchmark(category, familySize = 1) {
  const benchmark = SPENDING_BENCHMARKS[category];
  if (!benchmark) return { min: 0, avg: 0, max: 0 };
  
  const familyKey = `family${familySize}`;
  return benchmark[familyKey] || { min: 0, avg: 0, max: 0 };
}

export default SPENDING_BENCHMARKS;

