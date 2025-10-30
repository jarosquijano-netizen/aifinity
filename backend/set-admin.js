import pool from './config/database.js';

async function setAdmin() {
  try {
    // Set the first user (Joe Quijano) as admin
    const adminEmail = 'jarosquijano@gmail.com';
    
    const result = await pool.query(
      'UPDATE users SET is_admin = TRUE WHERE email = $1 RETURNING id, email, full_name, is_admin',
      [adminEmail]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('\n✅ SUCCESS! Admin privileges granted to:');
      console.log(`   👑 ${user.email}`);
      console.log(`   👤 ${user.full_name}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   🔐 Is Admin: ${user.is_admin ? 'YES' : 'NO'}`);
      console.log('\n🎉 You can now access the admin portal at: /admin\n');
    } else {
      console.log(`\n❌ User with email ${adminEmail} not found!\n`);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message, '\n');
  } finally {
    await pool.end();
  }
}

setAdmin();

