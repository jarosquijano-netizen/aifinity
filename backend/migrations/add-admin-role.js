import pool from '../config/database.js';

async function addAdminRole() {
  const client = await pool.connect();
  
  try {
    console.log('🔒 Adding admin role system...');

    // Add is_admin column to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Added is_admin column to users table');

    // Set your email as admin (update this with your actual email)
    const adminEmail = 'joe@aifinity.app'; // Change this to your email
    
    const result = await client.query(`
      UPDATE users 
      SET is_admin = TRUE 
      WHERE email = $1
      RETURNING email;
    `, [adminEmail]);

    if (result.rows.length > 0) {
      console.log(`✅ Set ${adminEmail} as admin`);
    } else {
      console.log(`⚠️  Email ${adminEmail} not found. You'll need to set admin manually.`);
    }

    console.log('🎉 Admin role system migration complete!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
  }
}

addAdminRole()
  .then(() => {
    console.log('✅ Migration successful');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
