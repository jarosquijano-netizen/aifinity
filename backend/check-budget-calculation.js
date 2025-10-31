#!/usr/bin/env node
/**
 * Check Budget Calculation Logic
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkBudgetCalculation() {
  console.log('🔍 Checking Budget Calculation...\n');

  try {
    const userResult = await pool.query(`
      SELECT id, email FROM users WHERE email = 'jarosquijano@gmail.com'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const userId = userResult.rows[0].id;
    const targetMonth = '2025-10';
    
    console.log(`👤 User: ${userResult.rows[0].email}`);
    console.log(`📅 Month: ${targetMonth}\n`);

    // 1. Get all categories with budgets
    console.log('📊 CATEGORIES WITH BUDGETS:');
    console.log('─────────────────────────────────────');
    const categoriesResult = await pool.query(`
      SELECT * FROM categories 
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY name ASC
    `, [userId]);

    console.log(`Total categories: ${categoriesResult.rows.length}\n`);
    
    categoriesResult.rows.forEach(cat => {
      console.log(`   ${cat.name.padEnd(25)} Budget: €${parseFloat(cat.budget_amount).toFixed(2)}`);
    });

    // 2. Get actual spending for the month (with computable filter)
    console.log('\n\n💰 SPENDING BY CATEGORY (COMPUTABLE ONLY):');
    console.log('─────────────────────────────────────');
    const spendingResult = await pool.query(`
      SELECT 
        category,
        SUM(amount) as total_spent,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE (user_id IS NULL OR user_id = $1)
      AND TO_CHAR(date, 'YYYY-MM') = $2
      AND type = 'expense'
      AND (computable = true OR computable IS NULL)
      GROUP BY category
      ORDER BY total_spent DESC
    `, [userId, targetMonth]);

    let totalSpentAll = 0;
    let totalSpentInBudget = 0;
    const categoryNames = new Set(categoriesResult.rows.map(c => c.name));

    console.log('\nCategory                   Spent        Txns   In Budget?');
    console.log('──────────────────────────────────────────────────────────');
    
    spendingResult.rows.forEach(row => {
      const spent = parseFloat(row.total_spent);
      const inBudget = categoryNames.has(row.category);
      const icon = inBudget ? '✅' : '❌';
      
      console.log(`${icon} ${row.category.padEnd(22)} €${spent.toFixed(2).padStart(10)} ${String(row.transaction_count).padStart(6)}     ${inBudget ? 'YES' : 'NO'}`);
      
      totalSpentAll += spent;
      if (inBudget) {
        totalSpentInBudget += spent;
      }
    });

    console.log('──────────────────────────────────────────────────────────');
    console.log(`TOTAL (all categories):              €${totalSpentAll.toFixed(2).padStart(10)}`);
    console.log(`TOTAL (only budgeted categories):    €${totalSpentInBudget.toFixed(2).padStart(10)}`);
    console.log(`MISSING (not in budget):             €${(totalSpentAll - totalSpentInBudget).toFixed(2).padStart(10)}`);

    // 3. What the API would return
    console.log('\n\n🎯 WHAT THE BUDGET API RETURNS:');
    console.log('─────────────────────────────────────');
    
    const spendingMap = {};
    spendingResult.rows.forEach(row => {
      spendingMap[row.category] = {
        spent: parseFloat(row.total_spent),
        count: parseInt(row.transaction_count)
      };
    });
    
    let apiTotalBudget = 0;
    let apiTotalSpent = 0;
    
    categoriesResult.rows.forEach(category => {
      const spent = spendingMap[category.name]?.spent || 0;
      const budget = parseFloat(category.budget_amount);
      apiTotalBudget += budget;
      apiTotalSpent += spent;
    });

    console.log(`Total Budget: €${apiTotalBudget.toFixed(2)}`);
    console.log(`Total Spent:  €${apiTotalSpent.toFixed(2)}`);
    console.log(`Remaining:    €${(apiTotalBudget - apiTotalSpent).toFixed(2)}`);
    console.log(`Usage:        ${((apiTotalSpent / apiTotalBudget) * 100).toFixed(1)}%`);

    // 4. Categories without budget that have spending
    console.log('\n\n⚠️  CATEGORIES WITHOUT BUDGET (BUT HAVE SPENDING):');
    console.log('─────────────────────────────────────');
    
    const categoriesWithoutBudget = spendingResult.rows.filter(row => 
      !categoryNames.has(row.category)
    );

    if (categoriesWithoutBudget.length === 0) {
      console.log('✅ None - all spending categories have budgets');
    } else {
      categoriesWithoutBudget.forEach(row => {
        console.log(`❌ ${row.category.padEnd(25)} €${parseFloat(row.total_spent).toFixed(2).padStart(10)} (${row.transaction_count} txns)`);
      });
      
      console.log('\n💡 RECOMMENDATION:');
      console.log('   Add these categories to your budget to track them properly.');
    }

    // 5. Summary
    console.log('\n\n📊 SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Actual Total Expenses (Oct 2025):     €${totalSpentAll.toFixed(2)}`);
    console.log(`Budget Tab Shows:                      €${apiTotalSpent.toFixed(2)}`);
    console.log(`Missing from Budget Tab:               €${(totalSpentAll - apiTotalSpent).toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    if (totalSpentAll !== apiTotalSpent) {
      console.log('\n🔴 ISSUE FOUND:');
      console.log('   Budget tab only shows spending for categories that have budgets set.');
      console.log('   Categories without budgets are not included in the total.');
    } else {
      console.log('\n✅ NO ISSUES:');
      console.log('   All spending is properly tracked in budgeted categories.');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBudgetCalculation();

