// Categoría → grupo semántico
// Esencial = gastos fijos/necesarios · Discrecional = wants · Ahorro/Deuda = flujos internos
const ESSENTIAL_KEYWORDS = [
  'hipoteca', 'alquiler', 'vivienda', 'servicios', 'agua', 'luz', 'electricidad',
  'gas', 'internet', 'móvil', 'movil', 'teléfono', 'telefono',
  'supermercado', 'alimentación', 'alimentacion', 'salud', 'farmacia', 'médico', 'medico',
  'seguros', 'transporte', 'gasolina', 'combustible', 'educación', 'educacion',
  'organismos', 'impuestos', 'comunidad', 'servicio doméstico',
];

const DISCRETIONARY_KEYWORDS = [
  'ocio', 'entretenimiento', 'espectáculos', 'espectaculos', 'hotel', 'vacation',
  'vacaciones', 'restaurante', 'compras', 'ropa', 'electrónica', 'electronica',
  'belleza', 'personal', 'regalos', 'deporte', 'niños', 'ninos', 'mascotas',
];

const INTERNAL_FLOW_KEYWORDS = [
  'transferencias', 'traspaso', 'préstamos', 'prestamos', 'efectivo',
  'ahorro', 'no computable', 'sin categoría', 'sin categoria',
];

function classifyCategory(category) {
  if (!category) return 'discretionary';
  const c = category.toLowerCase();
  if (INTERNAL_FLOW_KEYWORDS.some((k) => c.includes(k))) return 'internal';
  if (ESSENTIAL_KEYWORDS.some((k) => c.includes(k))) return 'essential';
  if (DISCRETIONARY_KEYWORDS.some((k) => c.includes(k))) return 'discretionary';
  return 'discretionary';
}

function isInternalFlow(category) {
  return classifyCategory(category) === 'internal';
}

function monthKeyOf(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isThisMonth(dateStr) {
  return monthKeyOf(dateStr) === currentMonthKey();
}

function amountsOnly(transactions) {
  return transactions.map((t) => ({
    ...t,
    amount: Math.abs(Number(t.amount) || 0),
  }));
}

/**
 * Patrimonio neto — suma de balances de cuentas activas (cuentas de crédito son negativas por definición).
 * Devuelve `{ total, assets, debts, breakdown }`.
 */
export function computeNetWorth(accounts = []) {
  let assets = 0;
  let debts = 0;
  const breakdown = [];
  for (const acc of accounts) {
    if (acc.exclude_from_stats) continue;
    const balance = Number(acc.balance) || 0;
    if (balance >= 0) assets += balance;
    else debts += Math.abs(balance);
    breakdown.push({ name: acc.name, balance, type: acc.account_type });
  }
  return { total: assets - debts, assets, debts, breakdown };
}

/**
 * Runway financiero — cuántos meses puedes cubrir tus gastos esenciales sólo con lo que tienes.
 * Cash disponible = suma de cuentas líquidas positivas (excluye tarjetas de crédito y cuentas excluidas).
 * Denominador = media mensual de gastos esenciales últimos N meses.
 */
export function computeRunway(accounts = [], transactions = [], monthsLookback = 3) {
  let cash = 0;
  for (const acc of accounts) {
    if (acc.exclude_from_stats) continue;
    const bal = Number(acc.balance) || 0;
    if (bal > 0 && acc.account_type !== 'credit') cash += bal;
  }

  const now = new Date();
  const monthKeys = [];
  for (let i = 1; i <= monthsLookback; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const essentialSums = new Map();
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.computable === false) continue;
    if (classifyCategory(tx.category) !== 'essential') continue;
    const mk = monthKeyOf(tx.date);
    if (!monthKeys.includes(mk)) continue;
    essentialSums.set(mk, (essentialSums.get(mk) || 0) + Math.abs(Number(tx.amount) || 0));
  }

  const totals = [...essentialSums.values()];
  const avgMonthly = totals.length
    ? totals.reduce((a, b) => a + b, 0) / totals.length
    : 0;
  const months = avgMonthly > 0 ? cash / avgMonthly : Infinity;
  return { cash, avgMonthlyEssential: avgMonthly, months };
}

/**
 * Delta de un valor del mes actual vs la media de los N meses anteriores.
 * Devuelve `{ current, avgPrev, delta, deltaPct }` para pintar arriba/abajo.
 */
export function computeMonthDelta(transactions, type, monthsLookback = 3) {
  const now = new Date();
  const buckets = new Map();
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    if (tx.computable === false) continue;
    const mk = monthKeyOf(tx.date);
    buckets.set(mk, (buckets.get(mk) || 0) + Math.abs(Number(tx.amount) || 0));
  }

  const curKey = currentMonthKey();
  const current = buckets.get(curKey) || 0;
  const prevKeys = [];
  for (let i = 1; i <= monthsLookback; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    prevKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const prevVals = prevKeys.map((k) => buckets.get(k) || 0);
  const avgPrev = prevVals.length ? prevVals.reduce((a, b) => a + b, 0) / prevVals.length : 0;
  const delta = current - avgPrev;
  const deltaPct = avgPrev > 0 ? (delta / avgPrev) * 100 : null;
  return { current, avgPrev, delta, deltaPct };
}

/**
 * Tasa de ahorro por mes, últimos N meses. `[{ month, rate }]`.
 * rate = (income - expenses) / income * 100.
 */
export function computeSavingsRateSeries(transactions, months = 6) {
  const now = new Date();
  const keys = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const map = new Map(keys.map((k) => [k, { month: k, income: 0, expenses: 0 }]));
  for (const tx of transactions) {
    if (tx.computable === false) continue;
    const mk = monthKeyOf(tx.date);
    if (!map.has(mk)) continue;
    const bucket = map.get(mk);
    if (tx.type === 'income') bucket.income += Math.abs(Number(tx.amount) || 0);
    else bucket.expenses += Math.abs(Number(tx.amount) || 0);
  }
  return keys.map((k) => {
    const b = map.get(k);
    const rate = b.income > 0 ? ((b.income - b.expenses) / b.income) * 100 : 0;
    return { month: k, rate: Math.round(rate * 10) / 10, income: b.income, expenses: b.expenses };
  });
}

/**
 * Utilización de crédito en tarjetas. Devuelve total deuda y utilización promedio.
 */
export function computeCreditUtilization(accounts = []) {
  const creditAccounts = accounts.filter((a) => a.account_type === 'credit');
  let totalDebt = 0;
  let totalLimit = 0;
  const cards = [];
  for (const a of creditAccounts) {
    const debt = Math.abs(Math.min(Number(a.balance) || 0, 0));
    const limit = Number(a.credit_limit) || 0;
    totalDebt += debt;
    totalLimit += limit;
    if (limit > 0) {
      cards.push({ name: a.name, debt, limit, utilization: (debt / limit) * 100 });
    }
  }
  const avgUtilization = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;
  return { totalDebt, totalLimit, avgUtilization, cards };
}

/**
 * Top N categorías del mes actual excluyendo flujos internos (transferencias, préstamos, no computable).
 */
export function computeTopRealCategories(transactions, n = 5) {
  const totals = new Map();
  let grandTotal = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.computable === false) continue;
    if (!isThisMonth(tx.date)) continue;
    if (isInternalFlow(tx.category)) continue;
    const cat = tx.category || 'Sin categoría';
    const amount = Math.abs(Number(tx.amount) || 0);
    totals.set(cat, (totals.get(cat) || 0) + amount);
    grandTotal += amount;
  }
  const sorted = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([category, total]) => ({
      category,
      total,
      percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }));
  return { top: sorted, grandTotal };
}

/**
 * "Movers del mes" — categorías con mayor variación en euros vs la media de los últimos 3 meses.
 * Devuelve arriba (subieron) y abajo (bajaron) ordenados por magnitud absoluta.
 */
export function computeMovers(transactions, monthsLookback = 3) {
  const now = new Date();
  const currentKey = currentMonthKey();
  const prevKeys = [];
  for (let i = 1; i <= monthsLookback; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    prevKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const current = new Map();
  const perMonth = new Map(); // category -> {monthKey -> sum}
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.computable === false) continue;
    if (isInternalFlow(tx.category)) continue;
    const cat = tx.category || 'Sin categoría';
    const mk = monthKeyOf(tx.date);
    const amount = Math.abs(Number(tx.amount) || 0);
    if (mk === currentKey) {
      current.set(cat, (current.get(cat) || 0) + amount);
    } else if (prevKeys.includes(mk)) {
      if (!perMonth.has(cat)) perMonth.set(cat, new Map());
      const m = perMonth.get(cat);
      m.set(mk, (m.get(mk) || 0) + amount);
    }
  }

  const categories = new Set([...current.keys(), ...perMonth.keys()]);
  const rows = [];
  for (const cat of categories) {
    const curVal = current.get(cat) || 0;
    const prevMap = perMonth.get(cat) || new Map();
    // media incluyendo meses en cero para no inflar
    const prevVals = prevKeys.map((k) => prevMap.get(k) || 0);
    const avg = prevVals.reduce((a, b) => a + b, 0) / (prevVals.length || 1);
    const delta = curVal - avg;
    const deltaPct = avg > 0 ? (delta / avg) * 100 : (curVal > 0 ? Infinity : 0);
    rows.push({ category: cat, current: curVal, avg, delta, deltaPct });
  }
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const up = rows.filter((r) => r.delta > 0).slice(0, 5);
  const down = rows.filter((r) => r.delta < 0).slice(0, 5);
  return { up, down, all: rows };
}

/**
 * Split de gasto discrecional vs esencial del mes actual (excluye flujos internos).
 */
export function computeDiscretionaryVsEssential(transactions) {
  let essential = 0;
  let discretionary = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.computable === false) continue;
    if (!isThisMonth(tx.date)) continue;
    const kind = classifyCategory(tx.category);
    if (kind === 'internal') continue;
    const amount = Math.abs(Number(tx.amount) || 0);
    if (kind === 'essential') essential += amount;
    else discretionary += amount;
  }
  const total = essential + discretionary;
  return {
    essential,
    discretionary,
    total,
    essentialPct: total > 0 ? (essential / total) * 100 : 0,
    discretionaryPct: total > 0 ? (discretionary / total) * 100 : 0,
  };
}

/**
 * Alertas & insights auto-generados. Devuelve lista de `{ severity, title, message }`.
 * severity: 'good' | 'info' | 'warning' | 'danger'
 */
export function computeInsights({ transactions, accounts, budgetOverview, movers }) {
  const items = [];

  const cu = computeCreditUtilization(accounts);
  if (cu.avgUtilization >= 80) {
    items.push({
      severity: 'danger',
      title: 'Utilización de crédito muy alta',
      message: `Estás usando ${cu.avgUtilization.toFixed(0)}% de tu crédito. Baja de 30% para proteger tu score.`,
    });
  } else if (cu.avgUtilization >= 50) {
    items.push({
      severity: 'warning',
      title: 'Utilización de crédito elevada',
      message: `Estás usando ${cu.avgUtilization.toFixed(0)}% de tu crédito. El ideal es < 30%.`,
    });
  }

  const expDelta = computeMonthDelta(transactions, 'expense');
  if (expDelta.deltaPct !== null && expDelta.deltaPct > 25) {
    items.push({
      severity: 'warning',
      title: 'Gastos por encima de tu media',
      message: `Este mes gastas €${Math.abs(expDelta.delta).toFixed(0)} más que tu media (${expDelta.deltaPct > 0 ? '+' : ''}${expDelta.deltaPct.toFixed(0)}%).`,
    });
  } else if (expDelta.deltaPct !== null && expDelta.deltaPct < -15) {
    items.push({
      severity: 'good',
      title: 'Gastos por debajo de tu media',
      message: `Este mes gastas €${Math.abs(expDelta.delta).toFixed(0)} menos que tu media (${expDelta.deltaPct.toFixed(0)}%). Bien!`,
    });
  }

  if (movers && movers.up.length > 0) {
    const top = movers.up[0];
    if (top.delta > 100 && top.deltaPct > 40) {
      items.push({
        severity: 'warning',
        title: `${top.category}: subida grande`,
        message: `Este mes ${top.category} está €${top.delta.toFixed(0)} por encima de tu media (+${top.deltaPct === Infinity ? '∞' : top.deltaPct.toFixed(0)}%).`,
      });
    }
  }

  const savingsSeries = computeSavingsRateSeries(transactions, 3);
  const lastRate = savingsSeries[savingsSeries.length - 1]?.rate || 0;
  if (lastRate < 0) {
    items.push({
      severity: 'danger',
      title: 'Estás gastando más de lo que ingresas',
      message: `Tasa de ahorro este mes: ${lastRate.toFixed(1)}%. Revisa gastos discrecionales.`,
    });
  } else if (lastRate < 10) {
    items.push({
      severity: 'info',
      title: 'Tasa de ahorro baja',
      message: `Este mes estás ahorrando el ${lastRate.toFixed(1)}%. El objetivo saludable es ≥ 20%.`,
    });
  } else if (lastRate >= 30) {
    items.push({
      severity: 'good',
      title: 'Excelente tasa de ahorro',
      message: `Este mes ahorras el ${lastRate.toFixed(1)}%. Sigue así.`,
    });
  }

  if (budgetOverview?.categories) {
    const over = budgetOverview.categories
      .filter((c) => c.status === 'over' && c.hasBudget)
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
      .slice(0, 3);
    if (over.length > 0) {
      const worst = over[0];
      items.push({
        severity: 'warning',
        title: `Presupuesto excedido: ${worst.name}`,
        message: `Vas al ${(worst.percentage || 0).toFixed(0)}% del presupuesto en ${worst.name}. ${over.length > 1 ? `Otras ${over.length - 1} categorías también se pasaron.` : ''}`,
      });
    }
  }

  return items.slice(0, 6);
}

export {
  classifyCategory,
  isInternalFlow,
  monthKeyOf,
  currentMonthKey,
  isThisMonth,
};
