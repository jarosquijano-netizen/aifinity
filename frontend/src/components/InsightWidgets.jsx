import React from 'react';
import { Line, LineChart, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank,
  Timer, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle,
  Info, ShieldAlert, Sparkles, Repeat,
} from 'lucide-react';

const fmtEUR = (n) => {
  const v = Number(n) || 0;
  return `€${v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const fmtEURDec = (n) => {
  const v = Number(n) || 0;
  return `€${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const cardBase = 'bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 h-full flex flex-col';

// ============================================================================
// KPI: Patrimonio Neto
// ============================================================================
export function KpiNetWorth({ netWorth, size = 'small' }) {
  const isLarge = size === 'large';
  const val = netWorth?.total ?? 0;
  return (
    <div className={`${cardBase} ${isLarge ? 'p-5 min-h-[380px]' : 'p-4 min-h-[140px]'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400">Patrimonio neto</span>
        <Wallet className="w-4 h-4 text-indigo-500" />
      </div>
      <p className={`${isLarge ? 'text-3xl' : 'text-2xl'} font-bold ${val >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>
        {fmtEUR(val)}
      </p>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        Activo {fmtEUR(netWorth?.assets)} · Deuda {fmtEUR(netWorth?.debts)}
      </p>
      {isLarge && netWorth?.breakdown?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-1 overflow-y-auto flex-1">
          {netWorth.breakdown.map((b, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400 truncate mr-2">{b.name}</span>
              <span className={`font-semibold ${b.balance >= 0 ? 'text-gray-800 dark:text-gray-200' : 'text-red-500'}`}>{fmtEURDec(b.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// KPI: Runway Financiero
// ============================================================================
export function KpiRunway({ runway, size = 'small' }) {
  const isLarge = size === 'large';
  const months = runway?.months ?? 0;
  const label = !isFinite(months)
    ? '∞ meses'
    : `${months.toFixed(1)} meses`;
  const color = months >= 6 ? 'text-green-600' : months >= 3 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className={`${cardBase} ${isLarge ? 'p-5 min-h-[380px]' : 'p-4 min-h-[140px]'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400">Runway</span>
        <Timer className="w-4 h-4 text-purple-500" />
      </div>
      <p className={`${isLarge ? 'text-3xl' : 'text-2xl'} font-bold ${color}`}>{label}</p>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        Cash {fmtEUR(runway?.cash)} · Esenciales {fmtEUR(runway?.avgMonthlyEssential)}/mes
      </p>
      {isLarge && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-600 dark:text-gray-400 space-y-2 flex-1">
          <p>
            Cuánto tiempo cubres tus gastos <strong>esenciales</strong> con el efectivo actual, si tus ingresos se detienen hoy.
          </p>
          <p>
            <span className="font-semibold">Regla:</span> ≥ 6 meses ideal · 3-6 aceptable · &lt; 3 riesgo.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// KPI: Tasa de Ahorro con sparkline
// ============================================================================
export function KpiSavingsRate({ series, size = 'small' }) {
  const isLarge = size === 'large';
  const last = series?.[series.length - 1]?.rate ?? 0;
  const prevAvg = series?.slice(0, -1).reduce((a, b) => a + b.rate, 0) / Math.max((series?.length || 1) - 1, 1);
  const delta = last - prevAvg;
  const color = last >= 20 ? 'text-green-600' : last >= 10 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className={`${cardBase} ${isLarge ? 'p-5 min-h-[380px]' : 'p-4 min-h-[140px]'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400">Tasa de ahorro</span>
        <PiggyBank className="w-4 h-4 text-emerald-500" />
      </div>
      <p className={`${isLarge ? 'text-3xl' : 'text-2xl'} font-bold ${color}`}>{last.toFixed(1)}%</p>
      <div className="flex items-center gap-1 text-[11px] mt-1">
        {delta >= 0 ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
        <span className={delta >= 0 ? 'text-green-600' : 'text-red-500'}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)} pp vs media 6m</span>
      </div>
      {series?.length > 1 && (
        <div className={`mt-2 ${isLarge ? 'flex-1 min-h-[120px]' : 'h-[40px]'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <Line dataKey="rate" stroke="#10b981" strokeWidth={2} dot={isLarge} />
              <Tooltip
                formatter={(v) => [`${v}%`, 'Ahorro']}
                labelFormatter={(l) => l}
                contentStyle={{ fontSize: '11px', padding: '4px 8px' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// KPI: Utilización de crédito
// ============================================================================
export function KpiCreditUtilization({ credit, size = 'small' }) {
  const isLarge = size === 'large';
  const util = credit?.avgUtilization ?? 0;
  const color = util < 30 ? 'text-green-600' : util < 50 ? 'text-amber-600' : util < 80 ? 'text-orange-600' : 'text-red-600';
  const barColor = util < 30 ? 'bg-green-500' : util < 50 ? 'bg-amber-500' : util < 80 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className={`${cardBase} ${isLarge ? 'p-5 min-h-[380px]' : 'p-4 min-h-[140px]'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400">Deuda tarjetas</span>
        <CreditCard className="w-4 h-4 text-red-500" />
      </div>
      <p className={`${isLarge ? 'text-3xl' : 'text-2xl'} font-bold ${color}`}>{fmtEUR(credit?.totalDebt)}</p>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        {util.toFixed(0)}% de {fmtEUR(credit?.totalLimit)} · ideal &lt; 30%
      </p>
      <div className="mt-2 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`${barColor} h-full transition-all`} style={{ width: `${Math.min(util, 100)}%` }} />
      </div>
      {isLarge && credit?.cards?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-2 flex-1 overflow-y-auto">
          {credit.cards.map((c, i) => (
            <div key={i} className="text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 truncate mr-2">{c.name}</span>
                <span className="font-semibold">{fmtEURDec(c.debt)} / {fmtEURDec(c.limit)}</span>
              </div>
              <div className="mt-1 h-1 bg-gray-200 dark:bg-slate-700 rounded overflow-hidden">
                <div className={`${c.utilization < 30 ? 'bg-green-500' : c.utilization < 50 ? 'bg-amber-500' : c.utilization < 80 ? 'bg-orange-500' : 'bg-red-500'} h-full`} style={{ width: `${Math.min(c.utilization, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// KPI: Ingresos con delta vs media 3m
// ============================================================================
export function KpiIncomeDelta({ delta, size = 'small' }) {
  const isLarge = size === 'large';
  const arrow = delta?.delta >= 0 ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />;
  const pct = delta?.deltaPct;
  return (
    <div className={`${cardBase} ${isLarge ? 'p-5 min-h-[380px]' : 'p-4 min-h-[140px]'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400">Ingresos mes</span>
        <TrendingUp className="w-4 h-4 text-green-500" />
      </div>
      <p className={`${isLarge ? 'text-3xl' : 'text-2xl'} font-bold text-gray-900 dark:text-gray-100`}>{fmtEUR(delta?.current)}</p>
      <div className="flex items-center gap-1 text-[11px] mt-1">
        {arrow}
        <span className={delta?.delta >= 0 ? 'text-green-600' : 'text-red-500'}>
          {pct !== null && isFinite(pct) ? `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%` : '—'} vs media 3m ({fmtEUR(delta?.avgPrev)})
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// KPI: Gastos con delta vs media 3m
// ============================================================================
export function KpiExpensesDelta({ delta, size = 'small' }) {
  const isLarge = size === 'large';
  // Para gastos: subir es malo
  const arrow = delta?.delta >= 0 ? <ArrowUpRight className="w-3 h-3 text-red-500" /> : <ArrowDownRight className="w-3 h-3 text-green-500" />;
  const pct = delta?.deltaPct;
  return (
    <div className={`${cardBase} ${isLarge ? 'p-5 min-h-[380px]' : 'p-4 min-h-[140px]'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400">Gastos mes</span>
        <TrendingDown className="w-4 h-4 text-red-500" />
      </div>
      <p className={`${isLarge ? 'text-3xl' : 'text-2xl'} font-bold text-gray-900 dark:text-gray-100`}>{fmtEUR(delta?.current)}</p>
      <div className="flex items-center gap-1 text-[11px] mt-1">
        {arrow}
        <span className={delta?.delta >= 0 ? 'text-red-500' : 'text-green-600'}>
          {pct !== null && isFinite(pct) ? `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%` : '—'} vs media 3m ({fmtEUR(delta?.avgPrev)})
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// KPI: Top 3 categorías reales
// ============================================================================
export function KpiTopRealCategories({ topCats, size = 'small' }) {
  const isLarge = size === 'large';
  const items = topCats?.top || [];
  return (
    <div className={`${cardBase} ${isLarge ? 'p-5 min-h-[380px]' : 'p-4 min-h-[140px]'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400">Top categorías reales</span>
        <span className="text-[10px] text-gray-400">excl. transfers</span>
      </div>
      {items.length === 0 && <p className="text-sm text-gray-400">Sin datos</p>}
      <div className="space-y-1.5 flex-1">
        {items.slice(0, isLarge ? 8 : 3).map((it, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs">
              <span className="text-gray-700 dark:text-gray-300 truncate mr-2">{it.category}</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtEUR(it.total)}</span>
            </div>
            <div className="mt-0.5 h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${it.percentage}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{it.percentage.toFixed(0)}% del gasto real</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Widget: Movers del mes
// ============================================================================
export function WidgetMovers({ movers, size = 'large' }) {
  const up = movers?.up || [];
  const down = movers?.down || [];
  return (
    <div className={`${cardBase} p-5 min-h-[380px]`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Movers del mes</span>
        <Sparkles className="w-5 h-5 text-amber-500" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Categorías que más se movieron vs tu media 3m</p>
      <div className="grid grid-cols-2 gap-4 flex-1">
        <div>
          <div className="flex items-center gap-1 mb-2">
            <ArrowUpRight className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-red-500 uppercase">Subieron</span>
          </div>
          <div className="space-y-2">
            {up.length === 0 && <p className="text-xs text-gray-400">Ninguna</p>}
            {up.map((m, i) => (
              <div key={i} className="text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300 truncate mr-2">{m.category}</span>
                  <span className="font-semibold text-red-500">+{fmtEUR(m.delta)}</span>
                </div>
                <p className="text-[10px] text-gray-400">
                  {fmtEUR(m.current)} · media {fmtEUR(m.avg)}
                  {isFinite(m.deltaPct) && ` · ${m.deltaPct > 0 ? '+' : ''}${m.deltaPct.toFixed(0)}%`}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-2">
            <ArrowDownRight className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold text-green-500 uppercase">Bajaron</span>
          </div>
          <div className="space-y-2">
            {down.length === 0 && <p className="text-xs text-gray-400">Ninguna</p>}
            {down.map((m, i) => (
              <div key={i} className="text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300 truncate mr-2">{m.category}</span>
                  <span className="font-semibold text-green-600">{fmtEUR(m.delta)}</span>
                </div>
                <p className="text-[10px] text-gray-400">
                  {fmtEUR(m.current)} · media {fmtEUR(m.avg)}
                  {isFinite(m.deltaPct) && ` · ${m.deltaPct.toFixed(0)}%`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Widget: Insights & Alertas auto-generadas
// ============================================================================
const severityStyles = {
  danger: { icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  good: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
};

export function WidgetInsights({ insights }) {
  const items = insights || [];
  return (
    <div className={`${cardBase} p-5 min-h-[380px]`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Alertas & insights</span>
        <Sparkles className="w-5 h-5 text-indigo-500" />
      </div>
      {items.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Todo bajo control 👍</p>
      )}
      <div className="space-y-2 overflow-y-auto flex-1">
        {items.map((it, i) => {
          const s = severityStyles[it.severity] || severityStyles.info;
          const Icon = s.icon;
          return (
            <div key={i} className={`flex gap-3 p-3 rounded-lg border ${s.bg} ${s.border}`}>
              <Icon className={`w-5 h-5 shrink-0 ${s.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{it.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{it.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Widget: Discrecional vs Esencial
// ============================================================================
export function ChartDiscretionaryVsEssential({ split }) {
  const data = [
    { name: 'Esencial', value: split?.essential || 0, color: '#3b82f6' },
    { name: 'Discrecional', value: split?.discretionary || 0, color: '#f59e0b' },
  ];
  const total = split?.total || 0;
  return (
    <div className={`${cardBase} p-5 min-h-[380px]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Esencial vs Discrecional</span>
        <span className="text-xs text-gray-500">Este mes</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-gray-400">Sin gastos este mes</p>
      ) : (
        <>
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtEURDec(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-gray-700 dark:text-gray-300 flex-1">Esencial</span>
              <span className="font-semibold">{fmtEUR(split?.essential)}</span>
              <span className="text-xs text-gray-500 w-12 text-right">{split?.essentialPct.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-sm bg-amber-500" />
              <span className="text-gray-700 dark:text-gray-300 flex-1">Discrecional</span>
              <span className="font-semibold">{fmtEUR(split?.discretionary)}</span>
              <span className="text-xs text-gray-500 w-12 text-right">{split?.discretionaryPct.toFixed(0)}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Widget: Suscripciones recurrentes
// ============================================================================
// Extrae el "core" comercio de descripciones bancarias con ruido (COMPRA TARJ. 5402...)
function cleanRecurringName(desc) {
  if (!desc) return 'Sin descripción';
  const s = String(desc)
    .replace(/COMPRA TARJ\.\s+\d+X+\d+\s*/i, '')
    .replace(/DIRECT DEBIT\s+/i, '')
    .replace(/^\s*-\s*/, '')
    .trim();
  return s || desc;
}

export function WidgetRecurring({ recurring }) {
  const items = (recurring || []).slice().sort((a, b) => (Number(b.estimatedAmount) || 0) - (Number(a.estimatedAmount) || 0));
  const total = items.reduce((a, b) => a + (Number(b.estimatedAmount) || 0), 0);
  const shown = items.slice(0, 8);
  const hidden = items.length - shown.length;
  return (
    <div className={`${cardBase} p-5 h-[380px] max-h-[380px]`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-teal-500" />
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Recurrentes</span>
        </div>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{fmtEUR(total)}/mes</span>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
        Top {shown.length} pagos detectados en ≥ 2 meses{hidden > 0 ? ` · ${hidden} más ocultos` : ''}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Sin recurrentes detectados</p>
      ) : (
        <div className="space-y-1 overflow-y-auto flex-1 pr-1">
          {shown.map((r, i) => {
            const conf = Number(r.confidence) || 0;
            const confPct = conf > 1 ? Math.min(conf, 100) : conf * 100;
            return (
              <div key={i} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-gray-800 dark:text-gray-200 truncate">{cleanRecurringName(r.description)}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {r.category || 'Sin categoría'} · día {r.expectedDay} · {confPct.toFixed(0)}%
                  </p>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{fmtEUR(r.estimatedAmount)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Widget: Salud del presupuesto (ordenado por % consumido)
// ============================================================================
export function WidgetBudgetHealth({ budgetOverview }) {
  // Solo categorías sobrepresupuestadas > 20% (ignorar rebases menores)
  const OVERSHOOT_THRESHOLD = 120;
  const cats = (budgetOverview?.categories || [])
    .filter((c) => c.hasBudget && !c.isTransfer && (c.percentage || 0) >= OVERSHOOT_THRESHOLD)
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    .slice(0, 10);
  return (
    <div className={`${cardBase} p-5 min-h-[380px]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Presupuestos sobrepasados</span>
        <span className="text-xs text-gray-500">&gt; 20% de rebase</span>
      </div>
      {cats.length === 0 ? (
        <p className="text-sm text-gray-400">Ninguna categoría rebasa el presupuesto más del 20%. Bien!</p>
      ) : (
        <div className="space-y-3 overflow-y-auto flex-1">
          {cats.map((c, i) => {
            const pct = Math.min(c.percentage || 0, 999);
            const barColor = pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500';
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 dark:text-gray-300 truncate mr-2">{c.name}</span>
                  <span className={pct > 100 ? 'font-bold text-red-500' : 'font-semibold text-gray-800 dark:text-gray-200'}>
                    {fmtEUR(c.spent)} / {fmtEUR(c.budget)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`${barColor} h-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className={`text-[10px] mt-0.5 ${pct > 100 ? 'text-red-500' : 'text-gray-500'}`}>
                  {pct.toFixed(0)}% consumido{pct > 100 ? ` · sobrepasado ${fmtEUR(c.spent - c.budget)}` : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
