import pool from './config/database.js';

async function listCategories() {
  try {
    const result = await pool.query('SELECT name, color, icon FROM categories ORDER BY name');
    
    console.log('\n📋 CONFIGURED BUDGET CATEGORIES:\n');
    console.log(`Total: ${result.rows.length} categories\n`);
    
    result.rows.forEach((c, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${c.name.padEnd(30)} ${(c.icon || 'default').padEnd(15)} ${c.color}`);
    });
    
    console.log('\n✅ All categories listed!\n');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

listCategories();

