/**
 * Migration: Rename "Hotel" category to "Vacation"
 * Updates all transactions and categories from "Ocio > Hotel" to "Ocio > Vacation"
 */

import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function renameHotelToVacation() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Renaming Hotel category to Vacation...');
    
    await client.query('BEGIN');
    
    // Update transactions
    const transactionResult = await client.query(
      `UPDATE transactions 
       SET category = 'Ocio > Vacation' 
       WHERE category = 'Ocio > Hotel' 
       RETURNING id`
    );
    console.log(`   ✅ Updated ${transactionResult.rowCount} transactions`);
    
    // Update categories table
    const categoryResult = await client.query(
      `UPDATE categories 
       SET name = 'Ocio > Vacation' 
       WHERE name = 'Ocio > Hotel' 
       RETURNING id`
    );
    console.log(`   ✅ Updated ${categoryResult.rowCount} category entries`);
    
    // Also handle old "Hotel" category (without group)
    const oldHotelTransactions = await client.query(
      `UPDATE transactions 
       SET category = 'Ocio > Vacation' 
       WHERE category = 'Hotel' 
       RETURNING id`
    );
    console.log(`   ✅ Updated ${oldHotelTransactions.rowCount} old "Hotel" transactions`);
    
    const oldHotelCategories = await client.query(
      `UPDATE categories 
       SET name = 'Ocio > Vacation' 
       WHERE name = 'Hotel' 
       RETURNING id`
    );
    console.log(`   ✅ Updated ${oldHotelCategories.rowCount} old "Hotel" category entries`);
    
    await client.query('COMMIT');
    
    console.log('✅ Successfully renamed Hotel to Vacation');
    
    return {
      success: true,
      transactionsUpdated: transactionResult.rowCount + oldHotelTransactions.rowCount,
      categoriesUpdated: categoryResult.rowCount + oldHotelCategories.rowCount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error renaming Hotel to Vacation:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  renameHotelToVacation()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default renameHotelToVacation;

