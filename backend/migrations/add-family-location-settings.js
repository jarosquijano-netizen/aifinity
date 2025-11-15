/**
 * Migration: Add family_size and location columns to user_settings table
 * For AI Budget Insights personalization
 */

import pool from '../config/database.js';

async function addFamilyLocationSettings() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Adding family_size and location columns to user_settings...');
    
    // Add family_size column if it doesn't exist
    await client.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS family_size INTEGER DEFAULT 1
    `);
    
    // Add location column if it doesn't exist
    await client.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'Spain'
    `);
    
    console.log('✅ Successfully added family_size and location columns');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addFamilyLocationSettings()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default addFamilyLocationSettings;

