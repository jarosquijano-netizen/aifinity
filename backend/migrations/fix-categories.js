import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Fix categories user_id
 */
async function fixCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Fixing categories user_id...\n');
    
    // Find the user
    const userResult = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['jarosquijano@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Found user ID: ${userId}\n`);
    
    await client.query('BEGIN');
    
    // Update categories with NULL user_id
    const updateResult = await client.query(
      `UPDATE categories 
       SET user_id = $1 
       WHERE user_id IS NULL
       RETURNING id, name`,
      [userId]
    );
    
    console.log(`✅ Updated ${updateResult.rows.length} categories to user_id = ${userId}`);
    console.log(`\n📋 Updated categories:`);
    updateResult.rows.forEach(cat => {
      console.log(`   - ${cat.name} (ID: ${cat.id})`);
    });
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixCategories().catch(console.error);

