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

export async function generateDashboardPDF() {
  const [summaryRes, accountsRes, txsRes, trendsRes, budgetRes] = await Promise.allSettled([
    api.get('/summary'),
    api.get('/accounts'),
    api.get('/transactions'),
    api.get('/trends'),
    api.get('/budget/overview'),
  ]);

  const summary = summaryRes.status === 'fulfilled' ? summaryRes.value.data : {};
  const accounts = accountsRes.status === 'fulfilled'
    ? (accountsRes.value.data?.accounts || accountsRes.value.data || [])
    : [];
  const transactions = txsRes.status === 'fulfilled'
    ? (txsRes.value.data?.transactions || txsRes.value.data || [])
    : [];
  const trends = trendsRes.status === 'fulfilled' ? (trendsRes.value.data?.monthly || trendsRes.value.data || []) : [];
  const budget = budgetRes.status === 'fulfilled' ? budgetRes.value.data : null;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AiFinity — Financial Dashboard', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, margin, y);
  doc.setTextColor(0);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Resumen', margin, y);
  y += 6;

  const income = summary.totalIncome ?? summary.total_income ?? 0;
  const expenses = summary.totalExpenses ?? summary.total_expenses ?? 0;
  const balance = summary.netBalance ?? summary.net_balance ?? (income - expenses);
  const txCount = summary.transactionCount ?? summary.transaction_count ?? transactions.length;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    head: [['Métrica', 'Valor']],
    body: [
      ['Ingresos totales', fmtEUR(income)],
      ['Gastos totales', fmtEUR(expenses)],
      ['Balance neto', fmtEUR(balance)],
      ['Nº transacciones', String(txCount)],
      ['Cuentas activas', String(accounts.length)],
    ],
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (accounts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Cuentas', margin, y);
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

  const categoryTotals = new Map();
  for (const tx of transactions) {
    const cat = tx.category || 'Sin categoría';
    const amount = Number(tx.amount) || 0;
    const sign = (tx.type === 'expense') ? amount : -amount;
    categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + sign);
  }
  const catRows = [...categoryTotals.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([cat, total]) => [cat, fmtEUR(total)]);

  if (catRows.length > 0) {
    if (y > 240) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Gasto por categoría (top 25)', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      head: [['Categoría', 'Total']],
      body: catRows,
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (Array.isArray(trends) && trends.length > 0) {
    if (y > 220) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Tendencia mensual (últimos 12 meses)', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      head: [['Mes', 'Ingresos', 'Gastos', 'Neto']],
      body: trends.map((m) => {
        const inc = Number(m.income || m.total_income || 0);
        const exp = Number(m.expenses || m.total_expenses || 0);
        return [
          String(m.month || m.date || ''),
          fmtEUR(inc),
          fmtEUR(exp),
          fmtEUR(inc - exp),
        ];
      }),
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (budget && Array.isArray(budget.categories) && budget.categories.length > 0) {
    if (y > 220) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Presupuesto por categoría', margin, y);
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
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const recentTx = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 60);

  if (recentTx.length > 0) {
    doc.addPage();
    y = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Últimas ${recentTx.length} transacciones`, margin, y);
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
      `AiFinity.app — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`aifinity-dashboard-${stamp}.pdf`);
}
