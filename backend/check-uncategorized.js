import pool from './config/database.js';

async function checkUncategorized() {
  try {
    // Get all transactions categorized as "Other" or similar
    const result = await pool.query(`
      SELECT 
        category,
        description,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = 1
      GROUP BY category, description
      ORDER BY 
        CASE 
          WHEN category IN ('Other', 'Otros', 'Uncategorized') THEN 0 
          ELSE 1 
        END,
        count DESC
      LIMIT 50
    `);
    
    console.log('\n📊 Transaction Categories Analysis:\n');
    console.log('='.repeat(80));
    
    let otherCount = 0;
    const otherTransactions = [];
    
    result.rows.forEach((row, i) => {
      const isOther = ['Other', 'Otros', 'Uncategorized', null].includes(row.category);
      const marker = isOther ? '❌' : '✅';
      
      console.log(`${marker} [${row.count}x] ${row.category || 'NULL'} - ${row.description.substring(0, 60)}`);
      
      if (isOther) {
        otherCount += parseInt(row.count);
        otherTransactions.push(row);
      }
    });
    
    console.log('='.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   Total "Other" transactions: ${otherCount}`);
    console.log(`   Unique "Other" descriptions: ${otherTransactions.length}`);
    
    console.log(`\n🔍 Top uncategorized merchants:\n`);
    otherTransactions.slice(0, 20).forEach((row, i) => {
      console.log(`   ${(i+1).toString().padStart(2)}. [${row.count}x] ${row.description.substring(0, 70)}`);
    });
    
    console.log('\n');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUncategorized();

