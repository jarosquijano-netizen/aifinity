import pool from '../config/database.js';

async function fixCreditCard() {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE bank_accounts SET balance = -863.54 WHERE name LIKE '%JOE_0012%'`
    );
    console.log('✅ Fixed credit card balance to -€863.54');
  } finally {
    client.release();
    await pool.end();
  }
}

fixCreditCard().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });






