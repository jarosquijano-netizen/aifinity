import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';
import XLSX from 'xlsx';

const router = express.Router();

// Export transactions as CSV
router.get('/csv', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    const result = await pool.query(
      `SELECT bank, date, category, description, amount, type
       FROM transactions
       WHERE user_id IS NULL OR user_id = $1
       ORDER BY date DESC`,
      [userId]
    );

    // Convert to CSV
    const headers = ['Bank', 'Date', 'Category', 'Description', 'Amount', 'Type'];
    const csvRows = [headers.join(',')];

    result.rows.forEach(row => {
      const values = [
        row.bank,
        row.date,
        row.category,
        `"${row.description}"`,
        row.amount,
        row.type
      ];
      csvRows.push(values.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Export transactions as Excel
router.get('/excel', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    const result = await pool.query(
      `SELECT bank, date, category, description, amount, type
       FROM transactions
       WHERE user_id IS NULL OR user_id = $1
       ORDER BY date DESC`,
      [userId]
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(result.rows);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

export default router;








