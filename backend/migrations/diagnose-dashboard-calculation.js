import pool from '../config/database.js';

/**
 * Script para diagnosticar problemas con el cálculo del Dashboard
 * Verifica ingresos, gastos y presupuesto del mes actual
 */
async function diagnoseDashboardCalculation() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Diagnosticando cálculos del Dashboard...\n');
    
    const userId = 1; // Ajustar según sea necesario
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthDate = currentMonth + '-01';
    
    console.log(`📅 Mes actual: ${currentMonth}\n`);
    
    // 1. Verificar todas las transacciones de ingreso del mes actual
    console.log('💰 INGRESOS DEL MES ACTUAL:');
    console.log('─'.repeat(80));
    
    const incomeTransactions = await client.query(
      `SELECT 
        id,
        date,
        description,
        amount,
        applicable_month,
        computable,
        account_id,
        TO_CHAR(date, 'YYYY-MM') as transaction_month
      FROM transactions
      WHERE user_id = $1
      AND type = 'income'
      AND (
        (applicable_month IS NOT NULL AND applicable_month = $2)
        OR
        (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $2)
      )
      ORDER BY date DESC`,
      [userId, currentMonth]
    );
    
    console.log(`\n📊 Total de transacciones de ingreso encontradas: ${incomeTransactions.rows.length}\n`);
    
    if (incomeTransactions.rows.length > 0) {
      let totalIncome = 0;
      let computableIncome = 0;
      
      incomeTransactions.rows.forEach((row, idx) => {
        const isComputable = row.computable !== false;
        const amount = parseFloat(row.amount || 0);
        totalIncome += amount;
        if (isComputable) {
          computableIncome += amount;
        }
        
        const marker = isComputable ? '✅' : '❌ NC';
        const applicableInfo = row.applicable_month 
          ? `[Aplicable: ${row.applicable_month}]` 
          : `[Fecha: ${row.transaction_month}]`;
        
        console.log(`   ${marker} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 50)}...`);
        console.log(`      Monto: €${amount.toFixed(2)} | ${applicableInfo} | Computable: ${isComputable}`);
      });
      
      console.log(`\n   💰 Total ingresos (todas): €${totalIncome.toFixed(2)}`);
      console.log(`   ✅ Total ingresos computables: €${computableIncome.toFixed(2)}\n`);
    } else {
      console.log('   ⚠️  No se encontraron transacciones de ingreso para este mes\n');
    }
    
    // 2. Verificar cálculo usando la misma lógica del summary endpoint
    console.log('🔢 CÁLCULO USANDO LÓGICA DEL SUMMARY ENDPOINT:');
    console.log('─'.repeat(80));
    
    const summaryIncomeResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_income
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount) t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
         AND t.type = 'income'
         AND t.computable = true
         AND (
           (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
           OR
           (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
         )
         AND t.amount > 0
         ORDER BY t.date, t.description, t.amount, t.id
       ) unique_transactions`,
      [userId, currentMonth]
    );
    
    const calculatedIncome = parseFloat(summaryIncomeResult.rows[0]?.actual_income || 0);
    console.log(`   💰 Ingreso calculado por summary endpoint: €${calculatedIncome.toFixed(2)}\n`);
    
    // 3. Verificar gastos del mes actual
    console.log('💸 GASTOS DEL MES ACTUAL:');
    console.log('─'.repeat(80));
    
    const expenseTransactions = await client.query(
      `SELECT 
        id,
        date,
        description,
        amount,
        computable,
        account_id,
        TO_CHAR(date, 'YYYY-MM') as transaction_month
      FROM transactions
      WHERE user_id = $1
      AND type = 'expense'
      AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
      ORDER BY date DESC`,
      [userId, currentMonthDate]
    );
    
    console.log(`\n📊 Total de transacciones de gasto encontradas: ${expenseTransactions.rows.length}\n`);
    
    if (expenseTransactions.rows.length > 0) {
      let totalExpenses = 0;
      let computableExpenses = 0;
      
      expenseTransactions.rows.slice(0, 10).forEach((row, idx) => {
        const isComputable = row.computable !== false;
        const amount = parseFloat(row.amount || 0);
        totalExpenses += amount;
        if (isComputable) {
          computableExpenses += amount;
        }
        
        const marker = isComputable ? '✅' : '❌ NC';
        console.log(`   ${marker} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 50)}...`);
        console.log(`      Monto: €${amount.toFixed(2)} | Computable: ${isComputable}`);
      });
      
      if (expenseTransactions.rows.length > 10) {
        console.log(`   ... y ${expenseTransactions.rows.length - 10} transacciones más`);
      }
      
      // Sumar todos los gastos
      expenseTransactions.rows.forEach(row => {
        const isComputable = row.computable !== false;
        const amount = parseFloat(row.amount || 0);
        totalExpenses += amount;
        if (isComputable) {
          computableExpenses += amount;
        }
      });
      
      console.log(`\n   💸 Total gastos (todas): €${totalExpenses.toFixed(2)}`);
      console.log(`   ✅ Total gastos computables: €${computableExpenses.toFixed(2)}\n`);
    } else {
      console.log('   ⚠️  No se encontraron transacciones de gasto para este mes\n');
    }
    
    // 4. Verificar cálculo de gastos usando la misma lógica del summary endpoint
    const summaryExpensesResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_expenses
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount) t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'expense'
         AND t.computable = true
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
         AND t.amount > 0
         ORDER BY t.date, t.description, t.amount, t.id
       ) unique_transactions`,
      [userId, currentMonthDate]
    );
    
    const calculatedExpenses = parseFloat(summaryExpensesResult.rows[0]?.actual_expenses || 0);
    console.log(`   💸 Gasto calculado por summary endpoint: €${calculatedExpenses.toFixed(2)}\n`);
    
    // 5. Verificar cuentas excluidas
    console.log('🏦 CUENTAS EXCLUIDAS DE ESTADÍSTICAS:');
    console.log('─'.repeat(80));
    
    const excludedAccounts = await client.query(
      `SELECT id, name, account_type, exclude_from_stats
       FROM bank_accounts
       WHERE user_id = $1 OR user_id IS NULL
       AND exclude_from_stats = true`,
      [userId]
    );
    
    if (excludedAccounts.rows.length > 0) {
      console.log(`\n⚠️  ${excludedAccounts.rows.length} cuenta(s) excluida(s) de estadísticas:\n`);
      excludedAccounts.rows.forEach(acc => {
        console.log(`   - ${acc.name} (${acc.account_type})`);
      });
      console.log('');
    } else {
      console.log('\n✅ No hay cuentas excluidas de estadísticas\n');
    }
    
    // 6. Verificar nóminas con applicable_month
    console.log('📋 NÓMINAS CON APPLICABLE_MONTH:');
    console.log('─'.repeat(80));
    
    const nominaWithApplicable = await client.query(
      `SELECT 
        id,
        date,
        description,
        amount,
        applicable_month,
        TO_CHAR(date, 'YYYY-MM') as transaction_month
      FROM transactions
      WHERE user_id = $1
      AND type = 'income'
      AND (description ILIKE '%nomina%' OR description ILIKE '%nómina%' OR description ILIKE '%salary%')
      AND applicable_month IS NOT NULL
      ORDER BY date DESC
      LIMIT 10`,
      [userId]
    );
    
    if (nominaWithApplicable.rows.length > 0) {
      console.log(`\n📊 ${nominaWithApplicable.rows.length} nómina(s) con applicable_month:\n`);
      nominaWithApplicable.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 50)}...`);
        console.log(`      Monto: €${parseFloat(row.amount || 0).toFixed(2)}`);
        console.log(`      Mes transacción: ${row.transaction_month} → Aplicable a: ${row.applicable_month}`);
      });
      console.log('');
    } else {
      console.log('\n✅ No hay nóminas con applicable_month\n');
    }
    
    // 7. Resumen final
    console.log('📊 RESUMEN FINAL:');
    console.log('─'.repeat(80));
    console.log(`   Mes actual: ${currentMonth}`);
    console.log(`   Ingresos calculados: €${calculatedIncome.toFixed(2)}`);
    console.log(`   Gastos calculados: €${calculatedExpenses.toFixed(2)}`);
    console.log(`   Balance neto: €${(calculatedIncome - calculatedExpenses).toFixed(2)}\n`);
    
    // 8. Verificar si hay transacciones que deberían estar pero no están
    console.log('🔍 VERIFICACIÓN DE TRANSACCIONES RECIENTES:');
    console.log('─'.repeat(80));
    
    const recentTransactions = await client.query(
      `SELECT 
        id,
        date,
        description,
        type,
        amount,
        applicable_month,
        computable,
        TO_CHAR(date, 'YYYY-MM') as transaction_month
      FROM transactions
      WHERE user_id = $1
      AND date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date DESC
      LIMIT 20`,
      [userId]
    );
    
    console.log(`\n📊 Últimas 20 transacciones (últimos 30 días):\n`);
    recentTransactions.rows.forEach((row, idx) => {
      const applicableInfo = row.applicable_month 
        ? `[→ ${row.applicable_month}]` 
        : '';
      const computableMarker = row.computable !== false ? '✅' : '❌ NC';
      console.log(`   ${computableMarker} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.type.toUpperCase()}`);
      console.log(`      ${row.description?.substring(0, 60)}...`);
      console.log(`      €${parseFloat(row.amount || 0).toFixed(2)} | Mes: ${row.transaction_month} ${applicableInfo}`);
    });
    
    console.log('\n✅ Diagnóstico completado\n');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnoseDashboardCalculation()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export default diagnoseDashboardCalculation;
