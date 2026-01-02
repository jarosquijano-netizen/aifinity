import pool from '../config/database.js';

/**
 * Remove ALL potential duplicates in "Servicio doméstico" category
 * Uses flexible matching: same date + same absolute amount + similar description
 */
async function removeAllServicioDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding and removing ALL duplicate transactions in "Servicio doméstico"...\n');
    
    await client.query('BEGIN');

    // Get all transactions in this category
    const allTransactions = await client.query(`
      SELECT 
        id,
        date,
        TRIM(REGEXP_REPLACE(description, '\\s+', ' ', 'g')) as normalized_description,
        ABS(amount) as abs_amount,
        amount,
        account_id,
        user_id
      FROM transactions
      WHERE category = 'Servicio doméstico'
      ORDER BY date DESC, id ASC
    `);

    console.log(`📊 Found ${allTransactions.rows.length} transactions in "Servicio doméstico" category\n`);

    if (allTransactions.rows.length === 0) {
      console.log('✅ No transactions found');
      await client.query('COMMIT');
      return;
    }

    // Group by date, normalized description, and absolute amount
    const grouped = new Map();
    
    allTransactions.rows.forEach(transaction => {
      // Create a key from date, normalized description, and absolute amount
      const key = `${transaction.date}|${transaction.normalized_description}|${transaction.abs_amount}`;
      
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
        console.log(`   Description: "${transactions[0].normalized_description}"`);
        console.log(`   Amount: €${transactions[0].amount}`);
        console.log(`   Count: ${transactions.length}`);
        console.log(`   Keeping ID: ${keepId}`);
        console.log(`   Deleting IDs: ${deleteIds.join(', ')}`);

        duplicatesToDelete.push(...deleteIds);
      }
    });

    if (duplicatesToDelete.length === 0) {
      console.log('\n✅ No duplicates found');
      await client.query('COMMIT');
      return;
    }

    console.log(`\n🗑️  Total duplicate transactions to delete: ${duplicatesToDelete.length} from ${duplicateGroups} groups`);

    // Show what will be deleted before actually deleting
    const preview = await client.query(`
      SELECT id, date, description, amount
      FROM transactions
      WHERE id = ANY($1::int[])
      ORDER BY date DESC, id ASC
    `, [duplicatesToDelete]);

    console.log('\n📋 Transactions that will be deleted:');
    preview.rows.forEach((t, idx) => {
      console.log(`   ${idx + 1}. ID: ${t.id} - [${t.date}] ${t.description?.substring(0, 50)}... - €${t.amount}`);
    });

    // Delete duplicate transactions
    const deleteResult = await client.query(`
      DELETE FROM transactions 
      WHERE id = ANY($1::int[])
      RETURNING id, date, description, amount
    `, [duplicatesToDelete]);

    console.log(`\n✅ Successfully deleted ${deleteResult.rowCount} duplicate transaction(s)`);

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
removeAllServicioDuplicates()
  .then(() => {
    console.log('\n✅ Duplicate removal completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Duplicate removal failed:', error);
    process.exit(1);
  });







