import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkMissingCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for missing categories...\n');
    
    const userId = 1;
    
    // Get categories from database
    const dbCategories = await client.query(
      `SELECT name, budget_amount, user_id 
       FROM categories 
       WHERE (user_id = $1 OR user_id IS NULL)
       AND budget_amount > 0
       ORDER BY name ASC`,
      [userId]
    );
    
    // Get categories from frontend (what SetupBudget shows)
    const frontendCategories = [
      'Alimentación > Restaurante',
      'Alimentación > Supermercado',
      'Asociaciones > Asociaciones',
      'Compras > Compras',
      'Compras > Electrónica',
      'Compras > Otras compras',
      'Compras > Ropa',
      'Deporte > Deporte',
      'Deporte > Material deportivo',
      'Educación > Estudios',
      'Educación > Librería',
      'Finanzas > Efectivo',
      'Finanzas > Préstamos',
      'Ocio > Entretenimiento',
      'Ocio > Espectáculos',
      'Ocio > Hotel',
      'Ocio > Otros ocio',
      'Organismos > Impuestos',
      'Otros > Otros',
      'Otros > Otros gastos',
      'Personal > Belleza',
      'Personal > Niños y mascotas',
      'Personal > Regalos',
      'Salud > Farmacia',
      'Salud > Médico',
      'Salud > Otros salud, saber y deporte',
      'Seguros > Seguro salud',
      'Servicios > Agua',
      'Servicios > Cargos bancarios',
      'Servicios > Electricidad',
      'Servicios > Internet',
      'Servicios > Móvil',
      'Servicios > Otros servicios',
      'Servicios > Servicios y productos online',
      'Servicios > Televisión',
      'Transporte > Compra vehículo',
      'Transporte > Gasolina',
      'Transporte > Mantenimiento vehículo',
      'Transporte > Parking y peaje',
      'Transporte > Transportes',
      'Vivienda > Alarmas y seguridad',
      'Vivienda > Comunidad',
      'Vivienda > Hipoteca',
      'Vivienda > Hogar',
      'Vivienda > Mantenimiento hogar',
      'Vivienda > Servicio doméstico'
    ];
    
    const dbCategoryNames = dbCategories.rows.map(c => c.name).sort();
    const frontendSet = new Set(frontendCategories);
    
    console.log(`📊 Database categories: ${dbCategoryNames.length}`);
    console.log(`📊 Frontend categories: ${frontendCategories.length}`);
    console.log(`📊 Difference: ${dbCategoryNames.length - frontendCategories.length}\n`);
    
    // Find categories in DB but not in frontend
    const missingInFrontend = dbCategoryNames.filter(name => !frontendSet.has(name));
    
    if (missingInFrontend.length > 0) {
      console.log('⚠️  Categories in database but NOT in frontend:\n');
      missingInFrontend.forEach(name => {
        const cat = dbCategories.rows.find(c => c.name === name);
        console.log(`  - ${name}: €${parseFloat(cat.budget_amount || 0).toFixed(2)}`);
      });
      
      const missingTotal = missingInFrontend.reduce((sum, name) => {
        const cat = dbCategories.rows.find(c => c.name === name);
        return sum + parseFloat(cat.budget_amount || 0);
      }, 0);
      console.log(`\n  Total of missing categories: €${missingTotal.toFixed(2)}\n`);
    }
    
    // Find categories in frontend but not in DB
    const missingInDB = frontendCategories.filter(name => !dbCategoryNames.includes(name));
    
    if (missingInDB.length > 0) {
      console.log('⚠️  Categories in frontend but NOT in database:\n');
      missingInDB.forEach(name => {
        console.log(`  - ${name}`);
      });
    }
    
    // Show all DB categories with budgets
    console.log('\n📋 All database categories with budgets:\n');
    dbCategories.rows.forEach(cat => {
      const inFrontend = frontendSet.has(cat.name) ? '✓' : '✗';
      console.log(`  ${inFrontend} ${cat.name.padEnd(45)} €${parseFloat(cat.budget_amount || 0).toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMissingCategories();







