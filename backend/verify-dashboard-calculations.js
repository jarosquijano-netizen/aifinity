import pool from './config/database.js';

async function verifyDashboard() {
  try {
    const userId = 1; // jarosquijano@gmail.com
    
    console.log('\n💰 DASHBOARD FINANCIAL VERIFICATION\n');
    console.log('='.repeat(80));
    
    // 1. ACCOUNTS SUMMARY
    console.log('\n📊 1. BANK ACCOUNTS:\n');
    const accounts = await pool.query(`
      SELECT 
        id,
        name,
        account_type,
        balance,
        credit_limit,
        exclude_from_stats
      FROM bank_accounts
      WHERE user_id = $1
      ORDER BY account_type, name
    `, [userId]);
    
    let totalBalance = 0;
    let totalCreditDebt = 0;
    let totalCreditLimit = 0;
    
    accounts.rows.forEach(acc => {
      const balance = parseFloat(acc.balance) || 0;
      const creditLimit = parseFloat(acc.credit_limit) || 0;
      const excluded = acc.exclude_from_stats ? '🚫' : '✅';
      
      console.log(`${excluded} ${acc.account_type.padEnd(10)} ${acc.name.padEnd(30)} Balance: €${balance.toFixed(2).padStart(10)}`);
      
      if (acc.account_type === 'credit') {
        totalCreditDebt += Math.abs(balance);
        totalCreditLimit += creditLimit;
        if (creditLimit > 0) {
          console.log(`   ${''.padEnd(43)} Limit:   €${creditLimit.toFixed(2).padStart(10)} Available: €${(creditLimit - Math.abs(balance)).toFixed(2).padStart(10)}`);
        }
      }
      
      if (!acc.exclude_from_stats) {
        totalBalance += balance;
      }
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log(`Total Balance (all accounts):        €${totalBalance.toFixed(2).padStart(10)}`);
    console.log(`Total Credit Card Debt:              €${totalCreditDebt.toFixed(2).padStart(10)}`);
    console.log(`Total Credit Limit:                  €${totalCreditLimit.toFixed(2).padStart(10)}`);
    console.log(`Available Credit:                    €${(totalCreditLimit - totalCreditDebt).toFixed(2).padStart(10)}`);
    
    // 2. TRANSACTIONS SUMMARY (CURRENT MONTH)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    console.log(`\n📊 2. TRANSACTIONS (${currentMonth}):\n`);
    
    const txSummary = await pool.query(`
      SELECT 
        type,
        computable,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = $1
        AND (
          TO_CHAR(date, 'YYYY-MM') = $2
          OR applicable_month = $2
        )
      GROUP BY type, computable
      ORDER BY type
    `, [userId, currentMonth]);
    
    let totalIncome = 0;
    let totalExpenses = 0;
    let nonComputableIncome = 0;
    let nonComputableExpenses = 0;
    
    console.log(`${'Type'.padEnd(15)} ${'Computable'.padEnd(15)} ${'Count'.padEnd(10)} ${'Total'.padEnd(15)}`);
    console.log('─'.repeat(80));
    
    txSummary.rows.forEach(row => {
      const amount = parseFloat(row.total) || 0;
      const computable = row.computable !== false; // null or true = computable
      
      console.log(
        `${row.type.padEnd(15)} ${(computable ? 'Yes ✅' : 'No 🚫').padEnd(15)} ` +
        `${row.count.toString().padEnd(10)} €${amount.toFixed(2).padStart(12)}`
      );
      
      if (row.type === 'income') {
        if (computable) {
          totalIncome += amount;
        } else {
          nonComputableIncome += amount;
        }
      } else if (row.type === 'expense') {
        if (computable) {
          totalExpenses += amount;
        } else {
          nonComputableExpenses += amount;
        }
      }
    });
    
    console.log('─'.repeat(80));
    console.log(`Total Computable Income:             €${totalIncome.toFixed(2).padStart(10)}`);
    console.log(`Total Computable Expenses:           €${totalExpenses.toFixed(2).padStart(10)}`);
    console.log(`Net (Income - Expenses):             €${(totalIncome - totalExpenses).toFixed(2).padStart(10)}`);
    console.log(`\nExcluded Transfers (Income):         €${nonComputableIncome.toFixed(2).padStart(10)} 🚫`);
    console.log(`Excluded Transfers (Expenses):       €${nonComputableExpenses.toFixed(2).padStart(10)} 🚫`);
    
    // 3. TOP CATEGORIES
    console.log(`\n📊 3. TOP EXPENSE CATEGORIES (${currentMonth}):\n`);
    
    const topCategories = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = $1
        AND type = 'expense'
        AND computable = true
        AND (
          TO_CHAR(date, 'YYYY-MM') = $2
          OR applicable_month = $2
        )
      GROUP BY category
      ORDER BY total DESC
      LIMIT 10
    `, [userId, currentMonth]);
    
    topCategories.rows.forEach((cat, i) => {
      const percentage = totalExpenses > 0 ? (parseFloat(cat.total) / totalExpenses * 100) : 0;
      console.log(
        `${(i+1).toString().padStart(2)}. ${cat.category.padEnd(30)} ` +
        `€${parseFloat(cat.total).toFixed(2).padStart(10)} ` +
        `(${percentage.toFixed(1)}%)`
      );
    });
    
    // 4. DASHBOARD CALCULATION VERIFICATION
    console.log(`\n📊 4. DASHBOARD CALCULATION CHECK:\n`);
    console.log('─'.repeat(80));
    console.log('What should appear in Dashboard:');
    console.log(`   Total Balance:        €${totalBalance.toFixed(2).padStart(10)}`);
    console.log(`   Income (this month):  €${totalIncome.toFixed(2).padStart(10)}`);
    console.log(`   Expenses (this month):€${totalExpenses.toFixed(2).padStart(10)}`);
    console.log(`   Savings:              €${(totalIncome - totalExpenses).toFixed(2).padStart(10)}`);
    console.log(`   Credit Card Debt:     €${totalCreditDebt.toFixed(2).padStart(10)}`);
    
    if (totalCreditLimit > 0) {
      const utilization = (totalCreditDebt / totalCreditLimit * 100);
      console.log(`   Credit Utilization:   ${utilization.toFixed(1)}%`);
    }
    
    console.log('\n✅ Verification complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

verifyDashboard();

