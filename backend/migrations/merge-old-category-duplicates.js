import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Merge old-format categories into their hierarchical versions
 * Example: "Belleza" -> "Personal > Belleza"
 */
async function mergeOldCategoryDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Merging old-format categories into hierarchical versions...\n');
    
    const userId = 1;
    
    // Mapping of old format -> hierarchical format
    const categoryMerges = [
      { old: 'Belleza', hierarchical: 'Personal > Belleza' },
      { old: 'Gasolina', hierarchical: 'Transporte > Gasolina' },
      { old: 'Hogar', hierarchical: 'Vivienda > Hogar' },
      { old: 'Médico', hierarchical: 'Salud > Médico' },
    ];
    
    for (const { old, hierarchical } of categoryMerges) {
      // Find old format category
      const oldCatResult = await client.query(
        `SELECT id, name, budget_amount, user_id 
         FROM categories 
         WHERE name = $1 AND (user_id = $2 OR user_id IS NULL)
         ORDER BY user_id DESC NULLS LAST
         LIMIT 1`,
        [old, userId]
      );
      
      // Find hierarchical category
      const hierarchicalCatResult = await client.query(
        `SELECT id, name, budget_amount, user_id 
         FROM categories 
         WHERE name = $1 AND (user_id = $2 OR user_id IS NULL)
         ORDER BY user_id DESC NULLS LAST
         LIMIT 1`,
        [hierarchical, userId]
      );
      
      if (oldCatResult.rows.length > 0) {
        const oldCat = oldCatResult.rows[0];
        const oldBudget = parseFloat(oldCat.budget_amount || 0);
        
        if (hierarchicalCatResult.rows.length > 0) {
          // Merge budgets
          const hierarchicalCat = hierarchicalCatResult.rows[0];
          const hierarchicalBudget = parseFloat(hierarchicalCat.budget_amount || 0);
          const newBudget = oldBudget + hierarchicalBudget;
          
          // Update hierarchical category with merged budget
          await client.query(
            `UPDATE categories 
             SET budget_amount = $1
             WHERE id = $2`,
            [newBudget.toString(), hierarchicalCat.id]
          );
          
          // Delete old category
          await client.query(
            `DELETE FROM categories WHERE id = $1`,
            [oldCat.id]
          );
          
          console.log(`✅ Merged: "${old}" (€${oldBudget.toFixed(2)}) + "${hierarchical}" (€${hierarchicalBudget.toFixed(2)}) = "${hierarchical}" (€${newBudget.toFixed(2)})`);
        } else {
          // Hierarchical doesn't exist, rename old to hierarchical
          await client.query(
            `UPDATE categories 
             SET name = $1
             WHERE id = $2`,
            [hierarchical, oldCat.id]
          );
          
          console.log(`✅ Renamed: "${old}" -> "${hierarchical}"`);
        }
      } else {
        console.log(`ℹ️  No old category found: "${old}"`);
      }
    }
    
    // Verify results
    console.log('\n📊 Verification:\n');
    const verifyResult = await client.query(
      `SELECT name, budget_amount 
       FROM categories 
       WHERE (user_id = $1 OR user_id IS NULL)
       AND name IN ('Belleza', 'Personal > Belleza', 'Gasolina', 'Transporte > Gasolina', 'Hogar', 'Vivienda > Hogar', 'Médico', 'Salud > Médico')
       ORDER BY name`,
      [userId]
    );
    
    verifyResult.rows.forEach(cat => {
      console.log(`  ${cat.name}: €${parseFloat(cat.budget_amount || 0).toFixed(2)}`);
    });
    
    // Calculate new total
    const totalResult = await client.query(
      `SELECT SUM(budget_amount::numeric) as total
       FROM categories 
       WHERE (user_id = $1 OR user_id IS NULL)
       AND name NOT IN ('Finanzas > Transferencias', 'Transferencias', 'NC', 'nc')
       AND budget_amount > 0`,
      [userId]
    );
    
    const newTotal = parseFloat(totalResult.rows[0].total || 0);
    console.log(`\n💰 New total budget: €${newTotal.toFixed(2)}`);
    console.log(`💡 Expected: €6,199.40`);
    console.log(`💡 Difference: €${(newTotal - 6199.40).toFixed(2)}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

mergeOldCategoryDuplicates();

