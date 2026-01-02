import pool from '../config/database.js';

/**
 * Script para verificar la nómina de FREIGHTOS del 23 de diciembre
 */
async function checkFreightosNomina() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando nómina FREIGHTOS del 23 de diciembre 2025...\n');
    
    // Buscar la transacción específica
    const nomina = await client.query(
      `SELECT 
        id,
        date,
        description,
        amount,
        type,
        applicable_month,
        computable,
        account_id,
        user_id,
        TO_CHAR(date, 'YYYY-MM') as transaction_month,
        (SELECT exclude_from_stats FROM bank_accounts WHERE id = transactions.account_id) as account_excluded,
        (SELECT name FROM bank_accounts WHERE id = transactions.account_id) as account_name
      FROM transactions
      WHERE description ILIKE '%FREIGHTOS%'
      AND date >= '2025-12-23'
      AND date <= '2025-12-23'
      AND type = 'income'
      ORDER BY date DESC`,
      []
    );
    
    if (nomina.rows.length === 0) {
      console.log('❌ No se encontró la nómina FREIGHTOS del 23 de diciembre\n');
      console.log('🔍 Buscando todas las nóminas de diciembre...\n');
      
      const allDecember = await client.query(
        `SELECT 
          id,
          date,
          description,
          amount,
          applicable_month,
          TO_CHAR(date, 'YYYY-MM') as transaction_month
        FROM transactions
        WHERE date >= '2025-12-01'
        AND date <= '2025-12-31'
        AND type = 'income'
        AND (description ILIKE '%nomina%' OR description ILIKE '%nómina%' OR description ILIKE '%FREIGHTOS%')
        ORDER BY date DESC`,
        []
      );
      
      console.log(`📊 Encontradas ${allDecember.rows.length} nóminas en diciembre:\n`);
      allDecember.rows.forEach((row, idx) => {
        const applicableInfo = row.applicable_month ? `[→ ${row.applicable_month}]` : '';
        console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
        console.log(`      €${parseFloat(row.amount || 0).toFixed(2)} | Mes: ${row.transaction_month} ${applicableInfo}`);
      });
      
      return;
    }
    
    const transaction = nomina.rows[0];
    console.log('✅ Nómina encontrada:\n');
    console.log(`   ID: ${transaction.id}`);
    console.log(`   Fecha: ${transaction.date.toISOString().slice(0, 10)}`);
    console.log(`   Descripción: ${transaction.description}`);
    console.log(`   Monto: €${parseFloat(transaction.amount || 0).toFixed(2)}`);
    console.log(`   Tipo: ${transaction.type}`);
    console.log(`   Computable: ${transaction.computable !== false ? 'Sí' : 'No'}`);
    console.log(`   Mes transacción: ${transaction.transaction_month}`);
    console.log(`   applicable_month: ${transaction.applicable_month || 'NULL (no movida)'}`);
    console.log(`   Account ID: ${transaction.account_id}`);
    console.log(`   Account Name: ${transaction.account_name || 'N/A'}`);
    console.log(`   Account Excluded: ${transaction.account_excluded ? 'Sí ❌' : 'No ✅'}`);
    console.log(`   User ID: ${transaction.user_id || 'NULL'}`);
    
    const currentMonth = '2026-01';
    const shouldBelongToCurrentMonth = transaction.applicable_month === currentMonth || 
                                      (transaction.applicable_month === null && transaction.transaction_month === currentMonth);
    
    console.log(`\n📅 Verificación para mes actual (${currentMonth}):`);
    console.log(`   ¿Debería aparecer en ${currentMonth}? ${shouldBelongToCurrentMonth ? '✅ SÍ' : '❌ NO'}`);
    
    if (transaction.applicable_month) {
      console.log(`   ⚠️  La nómina fue movida a: ${transaction.applicable_month}`);
      if (transaction.applicable_month !== currentMonth) {
        console.log(`   ❌ Por eso NO aparece en ${currentMonth}`);
      }
    } else {
      console.log(`   ⚠️  La nómina NO tiene applicable_month`);
      console.log(`   ⚠️  Se cuenta en el mes de la transacción: ${transaction.transaction_month}`);
      if (transaction.transaction_month !== currentMonth) {
        console.log(`   ❌ Por eso NO aparece en ${currentMonth}`);
      }
    }
    
    // Verificar si la cuenta está excluida
    if (transaction.account_excluded) {
      console.log(`\n❌ PROBLEMA ENCONTRADO: La cuenta está excluida de estadísticas`);
      console.log(`   Esto hace que la nómina NO se cuente en los cálculos`);
    }
    
    // Verificar si es computable
    if (transaction.computable === false) {
      console.log(`\n❌ PROBLEMA ENCONTRADO: La transacción NO es computable`);
      console.log(`   Esto hace que la nómina NO se cuente en los cálculos`);
    }
    
    // Verificar cálculo actual
    console.log(`\n🔢 Verificando cálculo del mes actual (${currentMonth}):`);
    
    const incomeResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_income
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
       AND t.amount > 0`,
      [transaction.user_id, currentMonth]
    );
    
    const calculatedIncome = parseFloat(incomeResult.rows[0]?.actual_income || 0);
    console.log(`   Ingreso calculado para ${currentMonth}: €${calculatedIncome.toFixed(2)}`);
    
    // Verificar si esta nómina específica está incluida
    const includesThisNomina = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.id = $1
       AND t.user_id = $2
       AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
       AND t.type = 'income'
       AND t.computable = true
       AND (
         (t.applicable_month IS NOT NULL AND t.applicable_month = $3)
         OR
         (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $3)
       )
       AND t.amount > 0`,
      [transaction.id, transaction.user_id, currentMonth]
    );
    
    const isIncluded = parseInt(includesThisNomina.rows[0]?.count || 0) > 0;
    console.log(`   ¿Esta nómina está incluida? ${isIncluded ? '✅ SÍ' : '❌ NO'}`);
    
    if (!isIncluded) {
      console.log(`\n🔧 SOLUCIÓN:`);
      if (!transaction.applicable_month && transaction.transaction_month === '2025-12') {
        console.log(`   1. La nómina debería tener applicable_month = '2026-01'`);
        console.log(`   2. Ejecuta: UPDATE transactions SET applicable_month = '2026-01' WHERE id = ${transaction.id}`);
      }
      if (transaction.account_excluded) {
        console.log(`   3. La cuenta está excluida. Verifica si debería estar excluida.`);
      }
      if (transaction.computable === false) {
        console.log(`   4. La transacción no es computable. Ejecuta: UPDATE transactions SET computable = true WHERE id = ${transaction.id}`);
      }
    }
    
    console.log('\n✅ Verificación completada\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkFreightosNomina()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export default checkFreightosNomina;
