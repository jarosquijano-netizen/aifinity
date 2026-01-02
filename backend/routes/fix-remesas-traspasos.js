import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Fix remesas/traspasos that should be marked as computable=false
router.post('/mark-non-computable', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    console.log('🔧 Corrigiendo remesas/traspasos para marcarlas como no computables...');
    console.log('   userId:', userId);
    
    // Find and update remesas/traspasos that should be computable=false
    const updateResult = await client.query(
      `UPDATE transactions
       SET computable = false
       WHERE (
         description ILIKE '%remesa%' OR 
         description ILIKE '%traspaso%' OR
         description ILIKE '%transferencia%' OR
         description ILIKE '%transfer%' OR
         description ILIKE '%bizum%' OR
         description ILIKE '%envío%' OR
         description ILIKE '%envio%'
       )
       AND (computable IS NULL OR computable = true)
       AND (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
       RETURNING id, date, description, amount, computable, account_id`,
      [userId]
    );
    
    console.log(`✅ ${updateResult.rows.length} transacciones marcadas como no computables`);
    
    // Get diagnostic info
    const accountsResult = await client.query(
      `SELECT id, name, exclude_from_stats, balance
       FROM bank_accounts
       WHERE (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
       ORDER BY name`,
      [userId]
    );
    
    const excludedAccounts = accountsResult.rows.filter(acc => acc.exclude_from_stats);
    
    res.json({
      success: true,
      updated: updateResult.rows.length,
      transactions: updateResult.rows.map(row => ({
        id: row.id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount || 0),
        computable: row.computable,
        account_id: row.account_id
      })),
      excludedAccounts: excludedAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        exclude_from_stats: acc.exclude_from_stats,
        balance: parseFloat(acc.balance || 0)
      }))
    });
  } catch (error) {
    console.error('❌ Error corrigiendo remesas/traspasos:', error);
    res.status(500).json({ 
      error: 'Error al corregir remesas/traspasos',
      message: error.message 
    });
  } finally {
    client.release();
  }
});

export default router;
