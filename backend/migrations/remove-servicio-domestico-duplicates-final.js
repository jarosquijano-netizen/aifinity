import pool from '../config/database.js';

/**
 * Remove duplicate transactions in "Servicio doméstico" category variations
 * Keeps the oldest transaction (lowest ID) and deletes the rest
 */
async function removeServicioDomesticoDuplicatesFinal() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding and removing duplicate transactions in "Servicio doméstico" variations...\n');
    
    await client.query('BEGIN');

    // Get all transactions in servicio domestico variations
    const allServicio = await client.query(`
      SELECT 
        id,
        date,
        description,
        amount,
        category,
        account_id,
        user_id,
        TRIM(REGEXP_REPLACE(description, '\\s+', ' ', 'g')) as normalized_desc,
        ABS(amount) as abs_amount
      FROM transactions
      WHERE LOWER(category) LIKE '%servicio%domestico%'
         OR LOWER(category) LIKE '%servicio%doméstico%'
      ORDER BY date DESC, id ASC
    `);
    
    console.log(`📊 Found ${allServicio.rows.length} transactions in servicio domestico variations\n`);

    if (allServicio.rows.length === 0) {
      console.log('✅ No transactions found');
      await client.query('COMMIT');
      return;
    }

    // Group by date, normalized description, and absolute amount
    const grouped = new Map();
    
    allServicio.rows.forEach(transaction => {
      const key = `${transaction.date}|${transaction.normalized_desc}|${transaction.abs_amount}`;
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
        console.log(`   Description: "${transactions[0].normalized_desc}"`);
        console.log(`   Amount: €${transactions[0].amount}`);
        console.log(`   Count: ${transactions.length}`);
        console.log(`   Keeping ID: ${keepId} (category: ${transactions[0].category})`);
        console.log(`   Deleting IDs: ${deleteIds.join(', ')}`);
        transactions.slice(1).forEach(t => {
          console.log(`      - ID ${t.id} (category: ${t.category})`);
        });

        duplicatesToDelete.push(...deleteIds);
      }
    });

    if (duplicatesToDelete.length === 0) {
      console.log('\n✅ No duplicates found');
      await client.query('COMMIT');
      return;
    }

    console.log(`\n🗑️  Total duplicate transactions to delete: ${duplicatesToDelete.length} from ${duplicateGroups} groups`);

    // Show what will be deleted
    const preview = await client.query(`
      SELECT id, date, description, amount, category
      FROM transactions
      WHERE id = ANY($1::int[])
      ORDER BY date DESC, id ASC
    `, [duplicatesToDelete]);

    console.log('\n📋 Transactions that will be deleted:');
    preview.rows.forEach((t, idx) => {
      console.log(`   ${idx + 1}. ID: ${t.id} - [${t.date}] ${t.description?.substring(0, 50)}... - €${t.amount} (${t.category})`);
    });

    // Delete duplicate transactions
    const deleteResult = await client.query(`
      DELETE FROM transactions 
      WHERE id = ANY($1::int[])
      RETURNING id, date, description, amount, category
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
removeServicioDomesticoDuplicatesFinal()
  .then(() => {
    console.log('\n✅ Duplicate removal completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Duplicate removal failed:', error);
    process.exit(1);
  });







