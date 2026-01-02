import pool from '../config/database.js';

/**
 * Script para corregir la nómina FREIGHTOS del 23 de diciembre
 * Establece applicable_month = '2026-01' para que aparezca en enero
 */
async function fixFreightosNomina() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Corrigiendo nómina FREIGHTOS del 23 de diciembre...\n');
    
    await client.query('BEGIN');
    
    // Buscar la transacción específica
    const nomina = await client.query(
      `SELECT 
        id,
        date,
        description,
        amount,
        applicable_month,
        TO_CHAR(date, 'YYYY-MM') as transaction_month
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
      console.log('🔍 Buscando todas las nóminas de FREIGHTOS en diciembre...\n');
      
      const allFreightos = await client.query(
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
        AND description ILIKE '%FREIGHTOS%'
        ORDER BY date DESC`,
        []
      );
      
      if (allFreightos.rows.length === 0) {
        console.log('❌ No se encontraron nóminas de FREIGHTOS en diciembre\n');
        await client.query('ROLLBACK');
        return;
      }
      
      console.log(`📊 Encontradas ${allFreightos.rows.length} nómina(s) de FREIGHTOS en diciembre:\n`);
      allFreightos.rows.forEach((row, idx) => {
        const applicableInfo = row.applicable_month ? `[→ ${row.applicable_month}]` : '[Sin applicable_month]';
        console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
        console.log(`      €${parseFloat(row.amount || 0).toFixed(2)} | Mes: ${row.transaction_month} ${applicableInfo}`);
      });
      
      // Actualizar todas las nóminas de FREIGHTOS en diciembre que no tienen applicable_month
      const dayOfMonth = allFreightos.rows[0].date.getDate();
      if (dayOfMonth >= 20) {
        const nextMonth = new Date(allFreightos.rows[0].date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const applicableMonth = nextMonth.toISOString().slice(0, 7);
        
        console.log(`\n🔄 Actualizando nóminas de FREIGHTOS del día ${dayOfMonth} para que aparezcan en ${applicableMonth}...\n`);
        
        const updateResult = await client.query(
          `UPDATE transactions
           SET applicable_month = $1
           WHERE description ILIKE '%FREIGHTOS%'
           AND date >= '2025-12-20'
           AND date <= '2025-12-31'
           AND type = 'income'
           AND (applicable_month IS NULL OR applicable_month != $1)
           RETURNING id, date, description, amount, applicable_month`,
          [applicableMonth]
        );
        
        console.log(`✅ Actualizadas ${updateResult.rows.length} nómina(s):\n`);
        updateResult.rows.forEach((row, idx) => {
          console.log(`   ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
          console.log(`      €${parseFloat(row.amount || 0).toFixed(2)} → Aplicable a: ${row.applicable_month}`);
        });
      } else {
        console.log(`\n⚠️  La nómina es del día ${dayOfMonth}, que es < 20, así que no se moverá automáticamente.`);
        console.log(`   Si quieres moverla manualmente, ejecuta:`);
        console.log(`   UPDATE transactions SET applicable_month = '2026-01' WHERE id = ${allFreightos.rows[0].id};`);
      }
    } else {
      const transaction = nomina.rows[0];
      const dayOfMonth = transaction.date.getDate();
      
      console.log('✅ Nómina encontrada:\n');
      console.log(`   ID: ${transaction.id}`);
      console.log(`   Fecha: ${transaction.date.toISOString().slice(0, 10)}`);
      console.log(`   Descripción: ${transaction.description}`);
      console.log(`   Monto: €${parseFloat(transaction.amount || 0).toFixed(2)}`);
      console.log(`   Día del mes: ${dayOfMonth}`);
      console.log(`   applicable_month actual: ${transaction.applicable_month || 'NULL'}`);
      
      if (dayOfMonth >= 20) {
        const nextMonth = new Date(transaction.date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const applicableMonth = nextMonth.toISOString().slice(0, 7);
        
        if (transaction.applicable_month !== applicableMonth) {
          console.log(`\n🔄 Actualizando applicable_month a: ${applicableMonth}\n`);
          
          const updateResult = await client.query(
            `UPDATE transactions
             SET applicable_month = $1
             WHERE id = $2
             RETURNING id, date, description, amount, applicable_month`,
            [applicableMonth, transaction.id]
          );
          
          console.log('✅ Nómina actualizada:\n');
          console.log(`   ID: ${updateResult.rows[0].id}`);
          console.log(`   Fecha: ${updateResult.rows[0].date.toISOString().slice(0, 10)}`);
          console.log(`   Descripción: ${updateResult.rows[0].description}`);
          console.log(`   Monto: €${parseFloat(updateResult.rows[0].amount || 0).toFixed(2)}`);
          console.log(`   applicable_month: ${updateResult.rows[0].applicable_month}`);
          console.log(`\n✅ La nómina ahora aparecerá en el dashboard de ${applicableMonth}\n`);
        } else {
          console.log(`\n✅ La nómina ya tiene applicable_month = ${applicableMonth}`);
          console.log(`   Si no aparece en el dashboard, verifica:`);
          console.log(`   1. Que la cuenta no esté excluida de estadísticas`);
          console.log(`   2. Que computable = true`);
          console.log(`   3. Que el mes actual sea ${applicableMonth}`);
        }
      } else {
        console.log(`\n⚠️  La nómina es del día ${dayOfMonth}, que es < 20.`);
        console.log(`   No se moverá automáticamente, pero puedes moverla manualmente si lo deseas.`);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Proceso completado exitosamente\n');
    
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
  fixFreightosNomina()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export default fixFreightosNomina;
