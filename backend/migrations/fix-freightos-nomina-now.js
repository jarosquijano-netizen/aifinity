import pool from '../config/database.js';

/**
 * Script para corregir INMEDIATAMENTE la nómina FREIGHTOS del 23 de diciembre
 * Establece applicable_month = '2026-01' para que aparezca en enero
 */
async function fixFreightosNominaNow() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Corrigiendo nómina FREIGHTOS del 23 de diciembre...\n');
    
    await client.query('BEGIN');
    
    // Buscar TODAS las nóminas de FREIGHTOS en diciembre que deberían moverse a enero
    const nomina = await client.query(
      `SELECT 
        id,
        date,
        description,
        amount,
        applicable_month,
        computable,
        account_id,
        user_id,
        TO_CHAR(date, 'YYYY-MM') as transaction_month,
        EXTRACT(DAY FROM date) as day_of_month
      FROM transactions
      WHERE description ILIKE '%FREIGHTOS%'
      AND date >= '2025-12-20'
      AND date <= '2025-12-31'
      AND type = 'income'
      ORDER BY date DESC`,
      []
    );
    
    if (nomina.rows.length === 0) {
      console.log('❌ No se encontraron nóminas de FREIGHTOS en diciembre\n');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`📊 Encontradas ${nomina.rows.length} nómina(s) de FREIGHTOS:\n`);
    nomina.rows.forEach((row, idx) => {
      const applicableInfo = row.applicable_month ? `[→ ${row.applicable_month}]` : '[Sin applicable_month]';
      console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
      console.log(`      €${parseFloat(row.amount || 0).toFixed(2)} | Día: ${row.day_of_month} | Mes: ${row.transaction_month} ${applicableInfo}`);
      console.log(`      Computable: ${row.computable !== false ? 'Sí ✅' : 'No ❌'}`);
    });
    
    // Actualizar todas las nóminas del día 20-31 para que aparezcan en enero 2026
    const applicableMonth = '2026-01';
    
    console.log(`\n🔄 Actualizando nóminas para que aparezcan en ${applicableMonth}...\n`);
    
    const updateResult = await client.query(
      `UPDATE transactions
       SET applicable_month = $1
       WHERE description ILIKE '%FREIGHTOS%'
       AND date >= '2025-12-20'
       AND date <= '2025-12-31'
       AND type = 'income'
       AND (applicable_month IS NULL OR applicable_month != $1)
       RETURNING id, date, description, amount, applicable_month, computable`,
      [applicableMonth]
    );
    
    if (updateResult.rows.length > 0) {
      console.log(`✅ Actualizadas ${updateResult.rows.length} nómina(s):\n`);
      updateResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
        console.log(`      €${parseFloat(row.amount || 0).toFixed(2)} → Aplicable a: ${row.applicable_month}`);
        console.log(`      Computable: ${row.computable !== false ? 'Sí ✅' : 'No ❌'}`);
      });
    } else {
      console.log('ℹ️  No se actualizaron nóminas (ya tienen applicable_month correcto o no cumplen criterios)\n');
    }
    
    // Verificar que las nóminas sean computables
    const nonComputable = await client.query(
      `SELECT id, date, description, amount
       FROM transactions
       WHERE description ILIKE '%FREIGHTOS%'
       AND date >= '2025-12-20'
       AND date <= '2025-12-31'
       AND type = 'income'
       AND computable = false`,
      []
    );
    
    if (nonComputable.rows.length > 0) {
      console.log(`\n⚠️  Encontradas ${nonComputable.rows.length} nómina(s) NO computables:\n`);
      nonComputable.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
        console.log(`      €${parseFloat(row.amount || 0).toFixed(2)}`);
      });
      
      console.log(`\n🔄 Marcando como computables...\n`);
      const fixComputable = await client.query(
        `UPDATE transactions
         SET computable = true
         WHERE description ILIKE '%FREIGHTOS%'
         AND date >= '2025-12-20'
         AND date <= '2025-12-31'
         AND type = 'income'
         AND computable = false
         RETURNING id, date, description, amount`,
        []
      );
      
      console.log(`✅ Marcadas ${fixComputable.rows.length} nómina(s) como computables\n`);
    }
    
    // Verificar cuentas excluidas
    const excludedAccounts = await client.query(
      `SELECT DISTINCT ba.id, ba.name, ba.exclude_from_stats
       FROM transactions t
       JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.description ILIKE '%FREIGHTOS%'
       AND t.date >= '2025-12-20'
       AND t.date <= '2025-12-31'
       AND t.type = 'income`,
      []
    );
    
    if (excludedAccounts.rows.length > 0) {
      excludedAccounts.rows.forEach(acc => {
        if (acc.exclude_from_stats) {
          console.log(`\n⚠️  ADVERTENCIA: La cuenta "${acc.name}" está excluida de estadísticas`);
          console.log(`   Esto hará que las nóminas de esta cuenta NO se cuenten en el dashboard`);
        }
      });
    }
    
    // Verificar cálculo actual después de la corrección
    console.log(`\n🔢 Verificando cálculo del mes actual (2026-01) después de la corrección:\n`);
    
    const incomeResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_income
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE (t.user_id IS NULL OR t.user_id = (SELECT id FROM users LIMIT 1))
       AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
       AND t.type = 'income'
       AND t.computable = true
       AND (
         (t.applicable_month IS NOT NULL AND t.applicable_month = '2026-01')
         OR
         (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = '2026-01')
       )
       AND t.amount > 0`,
      []
    );
    
    const calculatedIncome = parseFloat(incomeResult.rows[0]?.actual_income || 0);
    console.log(`   Ingreso calculado para 2026-01: €${calculatedIncome.toFixed(2)}\n`);
    
    // Verificar específicamente las nóminas FREIGHTOS en el cálculo
    const freightosInCalculation = await client.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.description ILIKE '%FREIGHTOS%'
       AND (t.user_id IS NULL OR t.user_id = (SELECT id FROM users LIMIT 1))
       AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
       AND t.type = 'income'
       AND t.computable = true
       AND (
         (t.applicable_month IS NOT NULL AND t.applicable_month = '2026-01')
         OR
         (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = '2026-01')
       )
       AND t.amount > 0`,
      []
    );
    
    const freightosCount = parseInt(freightosInCalculation.rows[0]?.count || 0);
    const freightosTotal = parseFloat(freightosInCalculation.rows[0]?.total || 0);
    
    console.log(`   Nóminas FREIGHTOS incluidas en cálculo: ${freightosCount}`);
    console.log(`   Total FREIGHTOS: €${freightosTotal.toFixed(2)}\n`);
    
    if (freightosCount === 0) {
      console.log(`\n❌ PROBLEMA: Las nóminas FREIGHTOS NO están siendo incluidas en el cálculo`);
      console.log(`   Posibles causas:`);
      console.log(`   1. La cuenta está excluida de estadísticas`);
      console.log(`   2. Las transacciones no son computables`);
      console.log(`   3. El applicable_month no está establecido correctamente`);
    } else {
      console.log(`✅ Las nóminas FREIGHTOS están siendo incluidas correctamente\n`);
    }
    
    await client.query('COMMIT');
    console.log('✅ Proceso completado exitosamente\n');
    console.log('💡 Recarga el dashboard para ver los cambios\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixFreightosNominaNow()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export default fixFreightosNominaNow;
