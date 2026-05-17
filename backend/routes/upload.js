import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/copy-guide', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Accounts with last transaction date and copy-from date
    const accountsResult = await pool.query(
      `SELECT
        ba.id AS account_id,
        ba.name AS account_name,
        COALESCE(MAX(t.bank), 'Manual') AS bank,
        MAX(t.date)::text AS last_transaction_date,
        (MAX(t.date) + INTERVAL '1 day')::date::text AS copy_from_date,
        (CURRENT_DATE - MAX(t.date)::date)::int AS days_ago
      FROM bank_accounts ba
      LEFT JOIN transactions t
        ON t.account_id = ba.id
        AND t.user_id = $1
        AND (t.computable = true OR t.computable IS NULL)
      WHERE ba.user_id = $1
        AND (ba.exclude_from_stats = false OR ba.exclude_from_stats IS NULL)
      GROUP BY ba.id, ba.name
      ORDER BY MAX(t.date) DESC NULLS LAST`,
      [userId]
    );

    const accounts = accountsResult.rows.map(row => {
      let status = 'new';
      if (row.last_transaction_date) {
        status = row.days_ago <= 5 ? 'ok' : 'warn';
      }
      return {
        accountId: row.account_id,
        accountName: row.account_name,
        bank: row.bank,
        lastTransactionDate: row.last_transaction_date || null,
        copyFromDate: row.copy_from_date || null,
        daysAgo: row.days_ago,
        status,
      };
    });

    // Last upload batch info
    const lastUploadResult = await pool.query(
      `SELECT
        ba.name AS account_name,
        MAX(t.created_at) AS uploaded_at,
        COUNT(*) AS transaction_count
      FROM transactions t
      JOIN bank_accounts ba ON ba.id = t.account_id
      WHERE t.user_id = $1
        AND DATE_TRUNC('second', t.created_at) = (
          SELECT DATE_TRUNC('second', MAX(created_at))
          FROM transactions
          WHERE user_id = $1
        )
      GROUP BY ba.name
      LIMIT 1`,
      [userId]
    );

    let lastUpload = null;
    if (lastUploadResult.rows.length > 0) {
      const row = lastUploadResult.rows[0];

      // Fetch 2 example descriptions from the same batch
      const examplesResult = await pool.query(
        `SELECT DISTINCT description
        FROM transactions t
        JOIN bank_accounts ba ON ba.id = t.account_id
        WHERE t.user_id = $1
          AND ba.name = $2
          AND DATE_TRUNC('second', t.created_at) = (
            SELECT DATE_TRUNC('second', MAX(created_at))
            FROM transactions
            WHERE user_id = $1
          )
        LIMIT 2`,
        [userId, row.account_name]
      );

      lastUpload = {
        accountName: row.account_name,
        uploadedAt: row.uploaded_at,
        transactionCount: parseInt(row.transaction_count, 10),
        examples: examplesResult.rows.map(r => r.description),
      };
    }

    res.json({ accounts, lastUpload });
  } catch (err) {
    console.error('❌ copy-guide error:', err);
    res.status(500).json({ error: 'Failed to fetch copy guide' });
  }
});

export default router;
