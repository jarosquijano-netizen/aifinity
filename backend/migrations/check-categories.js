import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Check all categories in the database
 */
async function checkCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking all categories in database...\n');
    
    // Get all categories
    const allCategories = await client.query(
      `SELECT id, name, budget_amount, user_id, created_at 
       FROM categories 
       ORDER BY name ASC`
    );
    
    console.log(`📊 Total categories found: ${allCategories.rows.length}\n`);
    
    if (allCategories.rows.length === 0) {
      console.log('⚠️  No categories found in database!');
      return;
    }
    
    // Group by user_id
    const byUserId = {};
    allCategories.rows.forEach(cat => {
      const uid = cat.user_id === null ? 'NULL' : cat.user_id.toString();
      if (!byUserId[uid]) {
        byUserId[uid] = [];
      }
      byUserId[uid].push(cat);
    });
    
    console.log('📋 Categories grouped by user_id:\n');
    for (const [uid, categories] of Object.entries(byUserId)) {
      console.log(`  user_id = ${uid}: ${categories.length} category(ies)`);
      categories.forEach(cat => {
        console.log(`    - ${cat.name} (Budget: ${cat.budget_amount || 0}€) - ID: ${cat.id}`);
      });
      console.log('');
    }
    
    // Check users
    const users = await client.query(
      `SELECT id, email FROM users ORDER BY id ASC`
    );
    
    console.log('👤 Users in database:');
    users.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkCategories().catch(console.error);

