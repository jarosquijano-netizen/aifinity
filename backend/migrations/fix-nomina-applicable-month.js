import pool from '../config/database.js';

/**
 * Script para limpiar applicable_month de nóminas existentes
 * Esto hace que las nóminas se cuenten en el mes en que se pagaron
 * en lugar del mes siguiente
 */
async function fixNominaApplicableMonth() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Limpiando applicable_month de nóminas existentes...\n');
    
    await client.query('BEGIN');
    
    // Buscar todas las transacciones de ingreso que tienen applicable_month establecido
    const transactionsWithApplicableMonth = await client.query(
      `SELECT 
        id, 
        date, 
        description, 
        applicable_month,
        TO_CHAR(date, 'YYYY-MM') as transaction_month
      FROM transactions
      WHERE type = 'income'
      AND applicable_month IS NOT NULL
      ORDER BY date DESC`
    );
    
    console.log(`📊 Encontradas ${transactionsWithApplicableMonth.rows.length} transacciones con applicable_month\n`);
    
    if (transactionsWithApplicableMonth.rows.length === 0) {
      console.log('✅ No hay transacciones con applicable_month para limpiar\n');
      await client.query('COMMIT');
      return;
    }
    
    // Mostrar las transacciones que se van a actualizar
    console.log('📋 Transacciones que se actualizarán:\n');
    transactionsWithApplicableMonth.rows.forEach((row, idx) => {
      const isNomina = row.description?.toLowerCase().includes('nomina') || 
                       row.description?.toLowerCase().includes('nómina') ||
                       row.description?.toLowerCase().includes('salary');
      const marker = isNomina ? '⭐ NÓMINA' : '  ';
      console.log(`   ${marker} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 60)}...`);
      console.log(`      Mes transacción: ${row.transaction_month} | applicable_month actual: ${row.applicable_month}`);
    });
    
    console.log('\n');
    
    // Limpiar applicable_month de todas las transacciones de ingreso
    // Esto hará que se cuenten en el mes en que se pagaron
    const updateResult = await client.query(
      `UPDATE transactions
       SET applicable_month = NULL
       WHERE type = 'income'
       AND applicable_month IS NOT NULL
       RETURNING id, date, description, applicable_month`
    );
    
    console.log(`✅ Actualizadas ${updateResult.rows.length} transacciones\n`);
    console.log('📊 Resumen:');
    console.log(`   - Transacciones actualizadas: ${updateResult.rows.length}`);
    console.log(`   - Ahora se contarán en el mes en que se pagaron\n`);
    
    await client.query('COMMIT');
    
    console.log('✅ Proceso completado exitosamente\n');
    console.log('💡 Las nóminas ahora aparecerán como ingreso del mes en que se pagaron');
    console.log('💡 Ejemplo: Nómina del 30 dic 2025 → Ingreso de diciembre 2025\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al limpiar applicable_month:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  fixNominaApplicableMonth()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export default fixNominaApplicableMonth;
