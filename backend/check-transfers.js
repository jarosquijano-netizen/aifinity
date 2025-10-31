#!/usr/bin/env node
/**
 * Check Transfers in Database
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTransfers() {
  console.log('🔍 Checking for Transfers...\n');

  try {
    // Get user
    const userResult = await pool.query(`
      SELECT id, email FROM users WHERE email = 'jarosquijano@gmail.com'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const userId = userResult.rows[0].id;
    console.log(`👤 User: ${userResult.rows[0].email}\n`);

    // Check for transactions with "Transferencias" category
    const transfersResult = await pool.query(`
      SELECT 
        date,
        description,
        amount,
        type,
        category,
        computable,
        account_id
      FROM transactions
      WHERE user_id = $1
      AND category = 'Transferencias'
      ORDER BY date DESC
      LIMIT 20
    `, [userId]);

    console.log(`💳 Transactions with "Transferencias" category: ${transfersResult.rows.length}\n`);

    if (transfersResult.rows.length > 0) {
      console.log('📝 Sample transfers:');
      transfersResult.rows.slice(0, 10).forEach(t => {
        const icon = t.computable ? '✅ Computable' : '❌ Not Computable';
        const amount = parseFloat(t.amount).toFixed(2);
        console.log(`   ${t.date} | ${t.type.padEnd(7)} | €${amount.padStart(10)} | ${icon}`);
        console.log(`      "${t.description}"`);
        console.log('');
      });
    }

    // Check for potential transfers (same amount, same day, opposite types)
    const potentialTransfersResult = await pool.query(`
      WITH daily_transactions AS (
        SELECT 
          date,
          amount,
          type,
          description,
          category,
          computable,
          account_id
        FROM transactions
        WHERE user_id = $1
        AND date >= '2025-10-01'
      )
      SELECT 
        t1.date,
        t1.amount,
        t1.type as type1,
        t1.description as desc1,
        t1.category as cat1,
        t1.computable as comp1,
        t2.type as type2,
        t2.description as desc2,
        t2.category as cat2,
        t2.computable as comp2
      FROM daily_transactions t1
      JOIN daily_transactions t2 
        ON t1.date = t2.date 
        AND t1.amount = t2.amount 
        AND t1.type != t2.type
      WHERE t1.type = 'expense'
      ORDER BY t1.date DESC
      LIMIT 20
    `, [userId]);

    console.log(`\n🔄 Potential transfers (same amount, same day, opposite types): ${potentialTransfersResult.rows.length}\n`);

    if (potentialTransfersResult.rows.length > 0) {
      console.log('📊 Potential undetected transfers:');
      potentialTransfersResult.rows.forEach(t => {
        const bothComputable = t.comp1 && t.comp2;
        const icon = bothComputable ? '🔴 PROBLEM' : '✅ OK';
        const amount = parseFloat(t.amount).toFixed(2);
        console.log(`\n   ${icon} ${t.date} | €${amount}`);
        console.log(`      📤 Expense: "${t.desc1}" (${t.cat1}) - Computable: ${t.comp1}`);
        console.log(`      📥 Income:  "${t.desc2}" (${t.cat2}) - Computable: ${t.comp2}`);
      });
    }

    // Check October totals with and without transfers
    const octoberStats = await pool.query(`
      SELECT 
        SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as income_computable,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income_total,
        SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as expense_computable,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense_total,
        COUNT(CASE WHEN category = 'Transferencias' THEN 1 END) as transfer_count
      FROM transactions
      WHERE user_id = $1
      AND TO_CHAR(date, 'YYYY-MM') = '2025-10'
    `, [userId]);

    const stats = octoberStats.rows[0];
    console.log('\n\n📊 OCTOBER 2024 STATISTICS:');
    console.log('─────────────────────────────────────');
    console.log(`Income (computable only):  €${parseFloat(stats.income_computable || 0).toFixed(2)}`);
    console.log(`Income (including all):    €${parseFloat(stats.income_total || 0).toFixed(2)}`);
    console.log(`Expense (computable only): €${parseFloat(stats.expense_computable || 0).toFixed(2)}`);
    console.log(`Expense (including all):   €${parseFloat(stats.expense_total || 0).toFixed(2)}`);
    console.log(`Transfers marked:          ${stats.transfer_count}`);

    const incomeDiff = parseFloat(stats.income_total) - parseFloat(stats.income_computable);
    const expenseDiff = parseFloat(stats.expense_total) - parseFloat(stats.expense_computable);

    if (incomeDiff > 0 || expenseDiff > 0) {
      console.log('\n⚠️  POTENTIAL ISSUE:');
      if (incomeDiff > 0) {
        console.log(`   Non-computable income: €${incomeDiff.toFixed(2)} (should be transfers)`);
      }
      if (expenseDiff > 0) {
        console.log(`   Non-computable expenses: €${expenseDiff.toFixed(2)} (should be transfers)`);
      }
    }

    // Check for keywords that might indicate transfers
    const keywordCheck = await pool.query(`
      SELECT 
        date,
        description,
        amount,
        type,
        category,
        computable
      FROM transactions
      WHERE user_id = $1
      AND TO_CHAR(date, 'YYYY-MM') = '2025-10'
      AND (
        LOWER(description) LIKE '%transfer%'
        OR LOWER(description) LIKE '%traspaso%'
        OR LOWER(description) LIKE '%abril%'
        OR LOWER(description) LIKE '%olivia%'
        OR LOWER(description) LIKE '%jaxo%'
        OR LOWER(description) LIKE '%joe%'
      )
      ORDER BY date DESC
    `, [userId]);

    if (keywordCheck.rows.length > 0) {
      console.log('\n\n🔍 Transactions with transfer keywords:');
      console.log('─────────────────────────────────────');
      keywordCheck.rows.forEach(t => {
        const icon = t.computable ? '🔴 Computable' : '✅ Not Computable';
        const amount = parseFloat(t.amount).toFixed(2);
        console.log(`\n${t.date} | ${t.type} | €${amount} | ${icon}`);
        console.log(`Category: ${t.category}`);
        console.log(`"${t.description}"`);
      });
    }

    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('─────────────────────────────────────');
    console.log('1. Upload statements from "Abril" and "Olivia" accounts');
    console.log('2. The system will auto-detect matching transfers');
    console.log('3. Transfers should be marked as "Transferencias" category');
    console.log('4. Check if manual transfers need to be recategorized\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTransfers();

