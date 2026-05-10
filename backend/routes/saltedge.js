import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import * as se from '../services/saltedgeService.js';

const router = express.Router();

async function ensureCustomer(userId) {
  const { rows } = await pool.query(
    'SELECT saltedge_customer_id FROM users WHERE id = $1',
    [userId]
  );
  console.log('[saltedge] DB lookup for user', userId, '→', rows[0]);
  if (rows[0]?.saltedge_customer_id) return rows[0].saltedge_customer_id;

  const customer = await se.getOrCreateCustomer(`aifinity-user-${userId}`);
  console.log('[saltedge] getOrCreateCustomer returned:', customer);
  await pool.query(
    'UPDATE users SET saltedge_customer_id = $1 WHERE id = $2',
    [customer.id, userId]
  );
  return customer.id;
}

router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { returnTo } = req.body;
    const customerId = await ensureCustomer(userId);
    const session = await se.createConnectSession(
      customerId,
      returnTo || `${req.protocol}://${req.get('host')}/saltedge/return`
    );
    res.json({ connectUrl: session.connect_url, expiresAt: session.expires_at });
  } catch (err) {
    console.error('Salt Edge connect error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create Salt Edge connect session' });
  }
});

router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const customerId = await ensureCustomer(userId);
    const connections = await se.listConnections(customerId);
    res.json(connections);
  } catch (err) {
    console.error('Salt Edge list error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to list Salt Edge connections' });
  }
});

router.post('/sync/:connectionId', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { connectionId } = req.params;

  try {
    const seAccounts = await se.listAccounts(connectionId);
    const connection = await se.getConnection(connectionId);
    const providerCode = connection.provider_code;

    let importedTx = 0;
    let createdAccounts = 0;

    for (const acct of seAccounts) {
      let { rows } = await pool.query(
        'SELECT id FROM bank_accounts WHERE user_id = $1 AND saltedge_account_id = $2',
        [userId, acct.id]
      );
      let localAccountId = rows[0]?.id;

      if (!localAccountId) {
        const ins = await pool.query(
          `INSERT INTO bank_accounts
             (user_id, name, account_type, balance, currency,
              saltedge_connection_id, saltedge_account_id, saltedge_provider_code, last_synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           RETURNING id`,
          [
            userId,
            acct.name || `${providerCode} ${acct.nature}`,
            acct.nature || 'General',
            acct.balance ?? 0,
            acct.currency_code || 'EUR',
            connectionId,
            acct.id,
            providerCode,
          ]
        );
        localAccountId = ins.rows[0].id;
        createdAccounts += 1;
      } else {
        await pool.query(
          `UPDATE bank_accounts
             SET balance = $1, last_synced_at = NOW(), saltedge_connection_id = $2
           WHERE id = $3`,
          [acct.balance ?? 0, connectionId, localAccountId]
        );
      }

      const txs = await se.listTransactions(connectionId, acct.id);
      for (const tx of txs) {
        const amount = Number(tx.amount);
        const type = amount >= 0 ? 'income' : 'expense';
        try {
          const inserted = await pool.query(
            `INSERT INTO transactions
               (user_id, bank, date, category, description, amount, type,
                saltedge_transaction_id, account_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (saltedge_transaction_id) DO NOTHING
             RETURNING id`,
            [
              userId,
              providerCode,
              tx.made_on,
              tx.category || 'uncategorized',
              tx.description || '',
              Math.abs(amount),
              type,
              tx.id,
              localAccountId,
            ]
          );
          if (inserted.rowCount > 0) importedTx += 1;
        } catch (e) {
          console.warn(`Skipping transaction ${tx.id}:`, e.message);
        }
      }
    }

    res.json({
      success: true,
      accountsCreated: createdAccounts,
      transactionsImported: importedTx,
    });
  } catch (err) {
    console.error('Salt Edge sync error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to sync Salt Edge connection' });
  }
});

router.delete('/connections/:connectionId', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { connectionId } = req.params;
  try {
    await se.removeConnection(connectionId);
    await pool.query(
      `UPDATE bank_accounts
         SET saltedge_connection_id = NULL, last_synced_at = NULL
       WHERE user_id = $1 AND saltedge_connection_id = $2`,
      [userId, connectionId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Salt Edge remove error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to remove Salt Edge connection' });
  }
});

export default router;
