import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration script to recategorize all transactions to hierarchical format
 * Maps old categories to new hierarchical categories
 */

// Mapping from old categories to new hierarchical categories
const CATEGORY_MAPPING = {
  // Old format -> New hierarchical format
  'Groceries': 'Alimentación > Supermercado',
  'Supermercado': 'Alimentación > Supermercado',
  'Food & Dining': 'Alimentación > Restaurante',
  'Restaurante': 'Alimentación > Restaurante',
  
  'Transport': 'Transporte > Transportes',
  'Transportes': 'Transporte > Transportes',
  'Gasolina': 'Transporte > Gasolina',
  'Parking y peaje': 'Transporte > Parking y peaje',
  
  'Shopping': 'Compras > Compras',
  'Compras': 'Compras > Compras',
  'Ropa': 'Compras > Ropa',
  'Otras compras': 'Compras > Otras compras',
  'Electrónica': 'Compras > Electrónica',
  
  'Utilities': 'Servicios > Otros servicios',
  'Internet': 'Servicios > Internet',
  'Móvil': 'Servicios > Móvil',
  'Televisión': 'Servicios > Televisión',
  'Electricidad': 'Servicios > Electricidad',
  'Cargos bancarios': 'Servicios > Cargos bancarios',
  'Servicios y productos online': 'Servicios > Servicios y productos online',
  'Subscriptions': 'Servicios > Servicios y productos online',
  
  'Housing': 'Vivienda > Hogar',
  'Hogar': 'Vivienda > Hogar',
  'Hipoteca': 'Vivienda > Hipoteca',
  'Comunidad': 'Vivienda > Comunidad',
  'Mantenimiento hogar': 'Vivienda > Mantenimiento hogar',
  'Alarmas y seguridad': 'Vivienda > Alarmas y seguridad',
  'Servicio doméstico': 'Vivienda > Servicio doméstico',
  
  'Healthcare': 'Salud > Médico',
  'Médico': 'Salud > Médico',
  'Farmacia': 'Salud > Farmacia',
  
  'Insurance': 'Seguros > Seguro salud',
  'Seguro salud': 'Seguros > Seguro salud',
  'Seguro auto': 'Seguros > Seguro auto',
  'Seguro hogar': 'Seguros > Seguro hogar',
  
  'Education': 'Educación > Estudios',
  'Estudios': 'Educación > Estudios',
  'Librería': 'Educación > Librería',
  
  'Entertainment': 'Ocio > Entretenimiento',
  'Entretenimiento': 'Ocio > Entretenimiento',
  'Espectáculos': 'Ocio > Espectáculos',
  'Hotel': 'Ocio > Vacation',
  'Ocio > Hotel': 'Ocio > Vacation',
  'Vacation': 'Ocio > Vacation',
  
  'Deporte': 'Deporte > Deporte',
  
  'Bank Fees': 'Servicios > Cargos bancarios',
  
  'Taxes': 'Organismos > Impuestos',
  'Impuestos': 'Organismos > Impuestos',
  
  'Loans': 'Finanzas > Préstamos',
  'Préstamos': 'Finanzas > Préstamos',
  'Transferencias': 'Finanzas > Transferencias',
  'Efectivo': 'Finanzas > Efectivo',
  'Cash': 'Finanzas > Efectivo',
  'Ahorro e inversiones': 'Finanzas > Ahorro e inversiones',
  
  'Personal > Belleza': 'Personal > Belleza',
  'Belleza': 'Personal > Belleza',
  'Regalos': 'Personal > Regalos',
  'Personal > Regalos': 'Personal > Regalos',
  
  'Mantenimiento vehículo': 'Transporte > Mantenimiento vehículo',
  'Compra vehículo': 'Transporte > Compra vehículo',
  
  'Niños y mascotas': 'Personal > Niños y mascotas',
  
  'Otros': 'Otros > Otros',
  'Other': 'Otros > Otros',
  'Otros gastos': 'Otros > Otros gastos',
  
  'Asociaciones': 'Asociaciones > Asociaciones',
  
  'Digital Payments': 'Finanzas > Transferencias', // Usually transfers
};

async function recategorizeTransactions() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting transaction recategorization to hierarchical format...\n');
    
    await client.query('BEGIN');
    
    // Get all unique categories from transactions
    const categoriesResult = await client.query(`
      SELECT DISTINCT category 
      FROM transactions 
      WHERE category IS NOT NULL 
      AND category != ''
      AND category != 'NC'
      AND category != 'nc'
      ORDER BY category
    `);
    
    console.log(`📊 Found ${categoriesResult.rows.length} unique categories\n`);
    
    const updates = {};
    let totalUpdated = 0;
    
    // Process each category
    for (const row of categoriesResult.rows) {
      const oldCategory = row.category;
      
      // Skip if already in hierarchical format
      if (oldCategory.includes(' > ')) {
        // Check if it's "Ocio > Hotel" and needs to be changed to "Ocio > Vacation"
        if (oldCategory === 'Ocio > Hotel' || oldCategory === 'Hotel') {
          const result = await client.query(
            `UPDATE transactions SET category = $1 WHERE category = $2`,
            ['Ocio > Vacation', oldCategory]
          );
          if (result.rowCount > 0) {
            updates[oldCategory] = 'Ocio > Vacation';
            totalUpdated += result.rowCount;
            console.log(`  ✅ ${result.rowCount} transactions: "${oldCategory}" → "Ocio > Vacation"`);
          }
        }
        continue;
      }
      
      // Find mapping
      const newCategory = CATEGORY_MAPPING[oldCategory];
      
      if (newCategory && newCategory !== oldCategory) {
        // Update transactions
        const result = await client.query(
          `UPDATE transactions SET category = $1 WHERE category = $2`,
          [newCategory, oldCategory]
        );
        
        if (result.rowCount > 0) {
          updates[oldCategory] = newCategory;
          totalUpdated += result.rowCount;
          console.log(`  ✅ ${result.rowCount} transactions: "${oldCategory}" → "${newCategory}"`);
        }
      } else if (!newCategory) {
        console.log(`  ⚠️  No mapping found for: "${oldCategory}" (${await client.query(`SELECT COUNT(*) FROM transactions WHERE category = $1`, [oldCategory]).then(r => r.rows[0].count)} transactions)`);
      }
    }
    
    // Also handle duplicates: if both old and new format exist, merge to new format
    console.log('\n🔍 Checking for duplicate categories (old + hierarchical format)...\n');
    
    for (const [oldCat, newCat] of Object.entries(CATEGORY_MAPPING)) {
      if (oldCat.includes(' > ')) continue; // Skip hierarchical mappings
      
      // Check if both old and new format exist
      const oldCount = await client.query(
        `SELECT COUNT(*) as count FROM transactions WHERE category = $1`,
        [oldCat]
      ).then(r => parseInt(r.rows[0].count));
      
      const newCount = await client.query(
        `SELECT COUNT(*) as count FROM transactions WHERE category = $1`,
        [newCat]
      ).then(r => parseInt(r.rows[0].count));
      
      if (oldCount > 0 && newCount > 0) {
        // Merge old format into new format
        const mergeResult = await client.query(
          `UPDATE transactions SET category = $1 WHERE category = $2`,
          [newCat, oldCat]
        );
        
        if (mergeResult.rowCount > 0) {
          console.log(`  🔄 Merged ${mergeResult.rowCount} transactions: "${oldCat}" → "${newCat}"`);
          totalUpdated += mergeResult.rowCount;
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Recategorization complete!`);
    console.log(`📊 Total transactions updated: ${totalUpdated}`);
    console.log(`📝 Categories mapped: ${Object.keys(updates).length}\n`);
    
    if (Object.keys(updates).length > 0) {
      console.log('Summary of changes:');
      console.log('─────────────────────────────────────────────────────────');
      for (const [old, newCat] of Object.entries(updates)) {
        console.log(`  "${old}" → "${newCat}"`);
      }
    }
    
    return {
      success: true,
      totalUpdated,
      categoriesMapped: Object.keys(updates).length,
      updates
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error recategorizing transactions:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  recategorizeTransactions()
    .then(() => {
      console.log('\n✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export default recategorizeTransactions;

