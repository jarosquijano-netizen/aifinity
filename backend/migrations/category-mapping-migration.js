import pool from '../config/database.js';

/**
 * Complete Category Mapping Migration
 * Merges English → Spanish categories and converts to hierarchical format
 */

const CATEGORY_MAPPING = {
  // ========== VIVIENDA ==========
  "Hogar": "Vivienda > Hogar",
  "Hipoteca": "Vivienda > Hipoteca",
  "Alquiler y compra": "Vivienda > Alquiler y compra",
  "Mantenimiento hogar": "Vivienda > Mantenimiento hogar",
  "Otros vivienda": "Vivienda > Otros vivienda",
  "Servicio doméstico": "Vivienda > Servicio doméstico",
  "Alarmas y seguridad": "Vivienda > Alarmas y seguridad",
  "Comunidad": "Vivienda > Comunidad",

  // ========== ALIMENTACIÓN ==========
  "Supermercado": "Alimentación > Supermercado",
  "Groceries": "Alimentación > Supermercado", // ← MERGE
  "Restaurante": "Alimentación > Restaurante",
  "Food & Dining": "Alimentación > Restaurante", // ← MERGE

  // ========== TRANSPORTE ==========
  "Transportes": "Transporte > Transportes",
  "Transport": "Transporte > Transportes", // ← MERGE
  "Transportation": "Transporte > Transportes", // ← MERGE
  "Gasolina": "Transporte > Gasolina",
  "Mantenimiento vehículo": "Transporte > Mantenimiento vehículo",
  "Alquiler vehículos": "Transporte > Alquiler vehículos",
  "Parking y peaje": "Transporte > Parking y peaje",
  "Compra vehículo": "Transporte > Compra vehículo",

  // ========== SALUD ==========
  "Médico": "Salud > Médico",
  "Farmacia": "Salud > Farmacia",
  "Óptica y dentista": "Salud > Óptica y dentista",
  "Otros salud, saber y deporte": "Salud > Otros salud, saber y deporte",

  // ========== SEGUROS ==========
  "Seguros": "Seguros > Seguros",
  "Seguro salud": "Seguros > Seguro salud",
  "Seguro hogar": "Seguros > Seguro hogar",
  "Seguro auto": "Seguros > Seguro auto",
  "Otros seguros": "Seguros > Otros seguros",

  // ========== SERVICIOS ==========
  "Agua": "Servicios > Agua",
  "Electricidad": "Servicios > Electricidad",
  "Internet": "Servicios > Internet",
  "Móvil": "Servicios > Móvil",
  "Televisión": "Servicios > Televisión",
  "Cargos bancarios": "Servicios > Cargos bancarios",
  "Bank Fees": "Servicios > Cargos bancarios", // ← MERGE
  "Servicios y productos online": "Servicios > Servicios y productos online",
  "Subscriptions": "Servicios > Servicios y productos online", // ← MERGE
  "Compras online": "Servicios > Servicios y productos online", // ← MERGE
  "Otros servicios": "Servicios > Otros servicios",

  // ========== COMPRAS ==========
  "Compras": "Compras > Compras",
  "Shopping": "Compras > Compras", // ← MERGE (931.21€!)
  "Otras compras": "Compras > Otras compras",
  "Ropa": "Compras > Ropa",
  "Electrónica": "Compras > Electrónica",

  // ========== OCIO ==========
  "Entretenimiento": "Ocio > Entretenimiento",
  "Otros ocio": "Ocio > Otros ocio",
  "Espectáculos": "Ocio > Espectáculos",
  "Hotel": "Ocio > Vacation",
  "Loterías": "Ocio > Loterías",

  // ========== EDUCACIÓN ==========
  "Estudios": "Educación > Estudios",
  "Librería": "Educación > Librería",

  // ========== DEPORTE ==========
  "Deporte": "Deporte > Deporte",
  "Material deportivo": "Deporte > Material deportivo",

  // ========== PERSONAL ==========
  "Regalos": "Personal > Regalos",
  "Belleza": "Personal > Belleza",
  "Niños y mascotas": "Personal > Niños y mascotas",

  // ========== ASOCIACIONES ==========
  "Asociaciones": "Asociaciones > Asociaciones",

  // ========== ORGANISMOS ==========
  "Impuestos": "Organismos > Impuestos",
  "Seguridad Social": "Organismos > Seguridad Social",
  "Ayuntamiento": "Organismos > Ayuntamiento",
  "Otros organismos": "Organismos > Otros organismos",
  "Multas y licencias": "Organismos > Multas y licencias",

  // ========== PROFESIONALES ==========
  "Asesores y abogados": "Profesionales > Asesores y abogados",

  // ========== FINANZAS ==========
  "Ingresos": "Finanzas > Ingresos",
  "Salary": "Finanzas > Ingresos", // ← MERGE (income)
  "Transferencias": "Finanzas > Transferencias",
  "Ahorro e inversiones": "Finanzas > Ahorro e inversiones",
  "Investments": "Finanzas > Ahorro e inversiones", // ← MERGE
  "Ahorrar una parte": "Finanzas > Ahorro e inversiones",
  "Préstamos": "Finanzas > Préstamos",
  "Loans": "Finanzas > Préstamos", // ← MERGE
  "Efectivo": "Finanzas > Efectivo",

  // ========== OTROS ==========
  "Otros": "Otros > Otros",
  "Other": "Otros > Otros", // ← MERGE
  "Otros gastos": "Otros > Otros gastos",
  "Sin categoría": "Otros > Sin categoría",
};

// Special cases that need manual review
const SPECIAL_CASES = {
  "Fraccionar": "⚠️ REVIEW - Payment installments?",
  "Digital Payments": "⚠️ DELETE - Too vague, categorize individually",
  "Reembolsos": "⚠️ EXCLUDE - These are reimbursements, not expenses"
};

async function runCategoryMappingMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Category Mapping Migration...');
    console.log('📋 This will:');
    console.log('   1. Merge English → Spanish categories');
    console.log('   2. Convert to hierarchical format (Group > Category)');
    console.log('   3. Handle special cases');
    console.log('');

    await client.query('BEGIN');

    const updates = [];
    let totalUpdated = 0;

    // Step 1: Merge English → Spanish categories
    console.log('📝 Step 1: Merging English → Spanish categories...');
    for (const [oldCategory, newCategory] of Object.entries(CATEGORY_MAPPING)) {
      // Skip if already in hierarchical format
      if (oldCategory.includes(' > ')) continue;
      
      const result = await client.query(
        `UPDATE transactions 
         SET category = $1 
         WHERE category = $2 
         RETURNING id`,
        [newCategory, oldCategory]
      );
      
      if (result.rowCount > 0) {
        updates.push({
          type: 'merge',
          oldCategory,
          newCategory,
          count: result.rowCount
        });
        totalUpdated += result.rowCount;
        console.log(`   ✅ Updated ${result.rowCount} transactions: "${oldCategory}" → "${newCategory}"`);
      }
    }

    // Step 2: Convert existing Spanish categories to hierarchical format
    console.log('');
    console.log('📝 Step 2: Converting to hierarchical format...');
    for (const [oldCategory, newCategory] of Object.entries(CATEGORY_MAPPING)) {
      // Only process if old category doesn't already have " > "
      if (oldCategory.includes(' > ')) continue;
      
      // Check if there are transactions with the old format that need updating
      const checkResult = await client.query(
        `SELECT COUNT(*) as count FROM transactions WHERE category = $1`,
        [oldCategory]
      );
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        const result = await client.query(
          `UPDATE transactions 
           SET category = $1 
           WHERE category = $2 
           RETURNING id`,
          [newCategory, oldCategory]
        );
        
        if (result.rowCount > 0) {
          updates.push({
            type: 'hierarchical',
            oldCategory,
            newCategory,
            count: result.rowCount
          });
          totalUpdated += result.rowCount;
          console.log(`   ✅ Updated ${result.rowCount} transactions: "${oldCategory}" → "${newCategory}"`);
        }
      }
    }

    // Step 3: Handle special cases
    console.log('');
    console.log('📝 Step 3: Handling special cases...');
    console.log('   ⚠️  Special cases found (needs manual review):');
    for (const [category, note] of Object.entries(SPECIAL_CASES)) {
      const result = await client.query(
        `SELECT COUNT(*) as count FROM transactions WHERE category = $1`,
        [category]
      );
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        console.log(`      - "${category}": ${count} transactions - ${note}`);
      }
    }

    // Step 4: Update budget categories to match
    console.log('');
    console.log('📝 Step 4: Updating budget categories...');
    const budgetUpdates = [];
    for (const [oldCategory, newCategory] of Object.entries(CATEGORY_MAPPING)) {
      if (oldCategory.includes(' > ')) continue;
      
      // Check if budget category exists
      const budgetCheck = await client.query(
        `SELECT id, name FROM categories WHERE name = $1`,
        [oldCategory]
      );
      
      if (budgetCheck.rows.length > 0) {
        // Check if new category already exists
        const newBudgetCheck = await client.query(
          `SELECT id FROM categories WHERE name = $1`,
          [newCategory]
        );
        
        if (newBudgetCheck.rows.length > 0) {
          // Merge budgets: add old budget to new category
          const oldBudgetCategory = budgetCheck.rows[0];
          const newBudgetCategory = newBudgetCheck.rows[0];
          
          await client.query(
            `UPDATE categories 
             SET budget_amount = budget_amount + $1 
             WHERE id = $2`,
            [oldBudgetCategory.budget_amount || 0, newBudgetCategory.id]
          );
          
          // Delete old category
          await client.query(`DELETE FROM categories WHERE id = $1`, [oldBudgetCategory.id]);
          
          budgetUpdates.push({
            merged: oldCategory,
            into: newCategory
          });
          console.log(`   ✅ Merged budget: "${oldCategory}" → "${newCategory}"`);
        } else {
          // Rename category
          const oldBudgetCategory = budgetCheck.rows[0];
          await client.query(
            `UPDATE categories SET name = $1 WHERE id = $2`,
            [newCategory, oldBudgetCategory.id]
          );
          
          budgetUpdates.push({
            renamed: oldCategory,
            to: newCategory
          });
          console.log(`   ✅ Renamed budget: "${oldCategory}" → "${newCategory}"`);
        }
      }
    }

    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log(`📊 Total transactions updated: ${totalUpdated}`);
    console.log(`📊 Budget categories updated: ${budgetUpdates.length}`);
    console.log('');
    console.log('⚠️  Next steps:');
    console.log('   1. Review special cases manually (Fraccionar, Digital Payments, Reembolsos)');
    console.log('   2. Run cleanup script to delete unused budget categories');
    
    return {
      success: true,
      transactionsUpdated: totalUpdated,
      budgetCategoriesUpdated: budgetUpdates.length,
      updates,
      budgetUpdates
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('category-mapping-migration.js')) {
  runCategoryMappingMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default runCategoryMappingMigration;

