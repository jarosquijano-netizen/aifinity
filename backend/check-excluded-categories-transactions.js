import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkExcludedCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking if excluded categories have transactions under different names...\n');
    
    const userId = 1;
    
    const excludedCategories = [
      'Vivienda > Hipoteca',
      'Salud > Otros salud, saber y deporte',
      'Servicios > Agua',
      'Servicios > Internet',
      'Ocio > Otros ocio',
      'Deporte > Material deportivo',
      'Ocio > Hotel'
    ];
    
    // Get all transaction categories
    const transactionCategories = await client.query(
      `SELECT DISTINCT category 
       FROM transactions 
       WHERE user_id = $1
       AND category IS NOT NULL
       AND type = 'expense'
       ORDER BY category ASC`,
      [userId]
    );
    
    const transactionCategoryNames = transactionCategories.rows.map(row => row.category);
    
    console.log('📊 Checking excluded categories:\n');
    
    excludedCategories.forEach(excludedCat => {
      const subcategory = excludedCat.includes(' > ') ? excludedCat.split(' > ')[1] : excludedCat;
      
      // Check if subcategory exists in transactions
      const matchingTransactions = transactionCategoryNames.filter(transCat => {
        if (transCat === excludedCat) return true;
        if (transCat === subcategory) return true;
        if (transCat.includes(' > ') && transCat.split(' > ')[1] === subcategory) return true;
        if (excludedCat.includes(' > ') && transCat === excludedCat.split(' > ')[1]) return true;
        return false;
      });
      
      if (matchingTransactions.length > 0) {
        console.log(`✅ ${excludedCat} - Found matching transactions:`);
        matchingTransactions.forEach(match => {
          console.log(`   - ${match}`);
        });
      } else {
        console.log(`❌ ${excludedCat} - No matching transactions found`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkExcludedCategories();







