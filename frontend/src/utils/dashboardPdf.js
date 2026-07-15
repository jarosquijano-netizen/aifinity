import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from './api';

const fmtEUR = (n) => {
  const v = Number(n) || 0;
  return `€${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('es-ES');
  } catch {
    return String(d);
  }
};

export const PERIODS = {
  month: { label: 'Mes actual', filename: 'mes-actual' },
  quarter: { label: 'Últimos 3 meses', filename: 'ultimo-trimestre' },
  ytd: { label: 'Año hasta la fecha (YTD)', filename: 'ytd' },
  all: { label: 'Todo el histórico', filename: 'historico' },
};

function getPeriodRange(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (period === 'month') {
    return { start: new Date(y, m, 1), end: new Date(y, m, d, 23, 59, 59, 999) };
  }
  if (period === 'quarter') {
    return { start: new Date(y, m - 2, 1), end: new Date(y, m, d, 23, 59, 59, 999) };
  }
  if (period === 'ytd') {
    return { start: new Date(y, 0, 1), end: new Date(y, m, d, 23, 59, 59, 999) };
  }
  return { start: null, end: null };
}

function inRange(dateStr, start, end) {
  if (!start || !end) return true;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function generateDashboardPDF(period = 'month') {
  const periodInfo = PERIODS[period] || PERIODS.month;
  const { start, end } = getPeriodRange(period);

  const [accountsRes, txsRes, budgetRes] = await Promise.allSettled([
    api.get('/accounts'),
    api.get('/transactions'),
    api.get('/budget/overview'),
  ]);

  const accounts = accountsRes.status === 'fulfilled'
    ? (accountsRes.value.data?.accounts || accountsRes.value.data || [])
    : [];
  const allTransactions = txsRes.status === 'fulfilled'
    ? (txsRes.value.data?.transactions || txsRes.value.data || [])
    : [];
  const budget = budgetRes.status === 'fulfilled' ? budgetRes.value.data : null;

  const transactions = allTransactions.filter((t) => inRange(t.date, start, end));

  let income = 0;
  let expenses = 0;
  const categoryTotals = new Map();
  const monthlyMap = new Map();

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      income += amount;
    } else {
      expenses += amount;
      const cat = tx.category || 'Sin categoría';
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + amount);
    }
    const mk = monthKey(tx.date);
    const m = monthlyMap.get(mk) || { month: mk, income: 0, expenses: 0 };
    if (tx.type === 'income') m.income += amount;
    else m.expenses += amount;
    monthlyMap.set(mk, m);
  }
  const monthly = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AiFinity — Financial Dashboard', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(`Período: ${periodInfo.label}`, margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(120);
  const rangeStr = start
    ? `${fmtDate(start)} — ${fmtDate(end)}`
    : 'Todo el histórico';
  doc.text(`Rango: ${rangeStr}   ·   Generado: ${new Date().toLocaleString('es-ES')}`, margin, y);
  doc.setTextColor(0);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Resumen del período', margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    head: [['Métrica', 'Valor']],
    body: [
      ['Ingresos totales', fmtEUR(income)],
      ['Gastos totales', fmtEUR(expenses)],
      ['Balance neto', fmtEUR(income - expenses)],
      ['Nº transacciones', String(transactions.length)],
      ['Cuentas activas', String(accounts.length)],
    ],
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (accounts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Cuentas (saldo actual)', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      head: [['Nombre', 'Tipo', 'Balance', 'Moneda']],
      body: accounts.map((a) => [
        a.name || '',
        a.account_type || a.type || '',
        fmtEUR(a.balance),
        a.currency || 'EUR',
      ]),
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const catRows = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([cat, total]) => [
      cat,
      fmtEUR(total),
      `${((total / expenses) * 100 || 0).toFixed(1)}%`,
    ]);

  if (catRows.length > 0) {
    if (y > 220) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Gasto por categoría — top ${catRows.length}`, margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      head: [['Categoría', 'Total', '% del gasto']],
      body: catRows,
      margin: { left: margin, right: margin },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (monthly.length > 1) {
    if (y > 220) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Tendencia mensual en el período', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      head: [['Mes', 'Ingresos', 'Gastos', 'Neto']],
      body: monthly.map((m) => [
        m.month,
        fmtEUR(m.income),
        fmtEUR(m.expenses),
        fmtEUR(m.income - m.expenses),
      ]),
      margin: { left: margin, right: margin },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (budget && Array.isArray(budget.categories) && budget.categories.length > 0) {
    if (y > 220) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Presupuesto por categoría (mes actual)', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [245, 158, 11], textColor: 255 },
      head: [['Categoría', 'Presupuesto', 'Gastado', 'Restante']],
      body: budget.categories.map((c) => {
        const budgetAmt = Number(c.budget_amount || c.budget || 0);
        const spent = Number(c.spent || c.actual || 0);
        return [
          c.name || c.category || '',
          fmtEUR(budgetAmt),
          fmtEUR(spent),
          fmtEUR(budgetAmt - spent),
        ];
      }),
      margin: { left: margin, right: margin },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const recentTx = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 100);

  if (recentTx.length > 0) {
    doc.addPage();
    y = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Transacciones del período (últimas ${recentTx.length})`, margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe']],
      body: recentTx.map((t) => [
        fmtDate(t.date),
        String(t.description || '').substring(0, 50),
        String(t.category || '').substring(0, 25),
        t.type === 'income' ? 'Ingreso' : 'Gasto',
        fmtEUR(t.amount),
      ]),
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 70 },
        2: { cellWidth: 45 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25, halign: 'right' },
      },
    });
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `AiFinity.app — ${periodInfo.label} — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`aifinity-dashboard-${periodInfo.filename}-${stamp}.pdf`);
}
