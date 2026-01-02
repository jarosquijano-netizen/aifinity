import pool from '../config/database.js';

/**
 * Remove duplicate transactions in "Servicio doméstico" category
 * Handles whitespace differences and finds duplicates more flexibly
 */
async function removeServicioDomesticoDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding and removing duplicate transactions in "Servicio doméstico" category...\n');
    
    await client.query('BEGIN');

    // First, let's see all transactions in this category
    const allServicioDomestico = await client.query(`
      SELECT 
        id,
        date,
        description,
        amount,
        account_id,
        user_id,
        TRIM(description) as clean_description
      FROM transactions
      WHERE category = 'Servicio doméstico'
      ORDER BY date DESC, id ASC
    `);

    console.log(`📊 Found ${allServicioDomestico.rows.length} transactions in "Servicio doméstico" category\n`);

    if (allServicioDomestico.rows.length === 0) {
      console.log('✅ No transactions found in this category');
      await client.query('COMMIT');
      return;
    }

    // Group by date, cleaned description, amount, account_id, and user_id
    const grouped = new Map();
    
    allServicioDomestico.rows.forEach(transaction => {
      const key = `${transaction.date}|${transaction.clean_description}|${transaction.amount}|${transaction.account_id || 'null'}|${transaction.user_id || 'null'}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(transaction);
    });

    // Find duplicates
    const duplicatesToDelete = [];
    let duplicateGroups = 0;

    grouped.forEach((transactions, key) => {
      if (transactions.length > 1) {
        duplicateGroups++;
        // Sort by ID to keep the oldest (lowest ID)
        transactions.sort((a, b) => a.id - b.id);
        const keepId = transactions[0].id;
        const deleteIds = transactions.slice(1).map(t => t.id);

        console.log(`\n📋 Duplicate group ${duplicateGroups}:`);
        console.log(`   Date: ${transactions[0].date}`);
        console.log(`   Description: ${transactions[0].description?.substring(0, 60)}...`);
        console.log(`   Amount: €${transactions[0].amount}`);
        console.log(`   Count: ${transactions.length}`);
        console.log(`   Keeping ID: ${keepId}`);
        console.log(`   Deleting IDs: ${deleteIds.join(', ')}`);

        duplicatesToDelete.push(...deleteIds);
      }
    });

    if (duplicatesToDelete.length === 0) {
      console.log('\n✅ No duplicates found in "Servicio doméstico" category');
      await client.query('COMMIT');
      return;
    }

    console.log(`\n🗑️  Total duplicate transactions to delete: ${duplicatesToDelete.length} from ${duplicateGroups} groups`);

    // Delete duplicate transactions
    const deleteResult = await client.query(`
      DELETE FROM transactions 
      WHERE id = ANY($1::int[])
      RETURNING id, date, description, amount, category
    `, [duplicatesToDelete]);

    console.log(`\n✅ Successfully deleted ${deleteResult.rowCount} duplicate transaction(s)`);

    // Show deleted transactions
    if (deleteResult.rows.length > 0) {
      console.log('\n📋 Deleted transactions:');
      deleteResult.rows.forEach((t, idx) => {
        console.log(`   ${idx + 1}. [${t.date}] ${t.description?.substring(0, 50)}... - €${t.amount}`);
      });
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
removeServicioDomesticoDuplicates()
  .then(() => {
    console.log('\n✅ Duplicate removal completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Duplicate removal failed:', error);
    process.exit(1);
  });







