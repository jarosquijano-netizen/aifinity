import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

/**
 * Find duplicate transactions
 */
async function findDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding duplicate transactions...\n');
    
    const userId = 1;
    
    // Find duplicates based on date, description, amount (ignoring account_id)
    const duplicates = await client.query(
      `SELECT 
         date,
         description,
         amount,
         type,
         COUNT(*) as count,
         ARRAY_AGG(id ORDER BY id) as transaction_ids,
         ARRAY_AGG(account_id) as account_ids
       FROM transactions
       WHERE user_id = $1
       GROUP BY date, description, amount, type
       HAVING COUNT(*) > 1
       ORDER BY date DESC`,
      [userId]
    );
    
    console.log(`Found ${duplicates.rows.length} sets of duplicate transactions:\n`);
    
    duplicates.rows.forEach((dup, i) => {
      console.log(`${i + 1}. Date: ${dup.date}, Amount: €${dup.amount}, Type: ${dup.type}, Count: ${dup.count}`);
      console.log(`   Description: ${dup.description?.substring(0, 80)}...`);
      console.log(`   Transaction IDs: ${dup.transaction_ids.join(', ')}`);
      console.log(`   Account IDs: ${dup.account_ids.join(', ')}`);
      console.log('');
    });
    
    // Calculate total duplicate amount
    let totalDuplicateAmount = 0;
    duplicates.rows.forEach(dup => {
      if (dup.type === 'income' && dup.count > 1) {
        // Subtract (count - 1) times the amount (keep one, remove the rest)
        totalDuplicateAmount += dup.amount * (dup.count - 1);
      }
    });
    
    console.log(`💰 Total duplicate income amount: €${totalDuplicateAmount.toFixed(2)}\n`);
    
    // Current month duplicates
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthDuplicates = duplicates.rows.filter(dup => {
      const month = dup.date.toISOString().slice(0, 7);
      return month === currentMonth || dup.transaction_ids.some(id => {
        // Check if any of these transactions have applicable_month = currentMonth
        return true; // We'll check this separately
      });
    });
    
    console.log(`📅 Duplicates affecting current month (${currentMonth}): ${currentMonthDuplicates.length} sets\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

findDuplicates().catch(console.error);

