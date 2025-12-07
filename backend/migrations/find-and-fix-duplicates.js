import pool from '../config/database.js';

/**
 * Find and remove duplicate transactions, then recalculate account balances
 * This script will:
 * 1. Find all duplicate transactions
 * 2. Show a summary
 * 3. Optionally remove duplicates (keeping the oldest)
 * 4. Recalculate balances for affected accounts
 */

async function findAndFixDuplicates(dryRun = true) {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding duplicate transactions...\n');
    
    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }
    
    // Find all duplicate groups
    // A duplicate is defined as: same date, description, amount, account_id, and user_id
    const duplicatesQuery = await client.query(`
      SELECT 
        date,
        description,
        amount,
        account_id,
        user_id,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY id ASC) as transaction_ids,
        ARRAY_AGG(computable ORDER BY id ASC) as computable_flags
      FROM transactions
      GROUP BY date, description, amount, account_id, user_id
      HAVING COUNT(*) > 1
      ORDER BY date DESC, amount DESC
    `);

    console.log(`📊 Found ${duplicatesQuery.rows.length} sets of duplicate transactions\n`);

    if (duplicatesQuery.rows.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    let totalDuplicatesToDelete = 0;
    const duplicatesToDelete = [];
    const affectedAccounts = new Set();

    // Analyze duplicates
    duplicatesQuery.rows.forEach((dup, idx) => {
      const transactionIds = dup.transaction_ids;
      const keepId = transactionIds[0]; // Keep the oldest (first) transaction
      const deleteIds = transactionIds.slice(1); // Delete the rest
      
      if (dup.account_id) {
        affectedAccounts.add(dup.account_id);
      }

      console.log(`${idx + 1}. Date: ${dup.date}, Amount: €${dup.amount}, Count: ${dup.count}`);
      console.log(`   Description: ${dup.description?.substring(0, 80)}...`);
      console.log(`   Account ID: ${dup.account_id || 'NULL'}, User ID: ${dup.user_id || 'NULL'}`);
      console.log(`   Keeping ID: ${keepId}, Deleting IDs: ${deleteIds.join(', ')}`);
      console.log('');

      duplicatesToDelete.push(...deleteIds);
      totalDuplicatesToDelete += deleteIds.length;
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total duplicate groups: ${duplicatesQuery.rows.length}`);
    console.log(`   Total transactions to delete: ${totalDuplicatesToDelete}`);
    console.log(`   Affected accounts: ${affectedAccounts.size}`);
    console.log(`   Account IDs: ${Array.from(affectedAccounts).join(', ')}\n`);

    if (dryRun) {
      console.log('⚠️  DRY RUN - No transactions deleted. Run with dryRun=false to remove duplicates.');
      return;
    }

    if (duplicatesToDelete.length === 0) {
      console.log('✅ No duplicates to delete');
      return;
    }

    // Start transaction
    await client.query('BEGIN');

    // Delete duplicate transactions
    console.log('🗑️  Deleting duplicate transactions...');
    const deleteResult = await client.query(`
      DELETE FROM transactions 
      WHERE id = ANY($1::int[])
      RETURNING id, date, description, amount, account_id
    `, [duplicatesToDelete]);

    console.log(`✅ Successfully deleted ${deleteResult.rowCount} duplicate transaction(s)\n`);

    // Recalculate balances for affected accounts
    if (affectedAccounts.size > 0) {
      console.log('🔄 Recalculating balances for affected accounts...\n');
      
      for (const accountId of affectedAccounts) {
        // Get account info
        const accountResult = await client.query(
          `SELECT id, name, user_id FROM bank_accounts WHERE id = $1`,
          [accountId]
        );
        
        if (accountResult.rows.length === 0) {
          console.log(`⚠️  Account ${accountId} not found, skipping...`);
          continue;
        }
        
        const account = accountResult.rows[0];
        const userId = account.user_id;
        
        // Calculate balance from transactions
        const balanceResult = await client.query(
          `SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as calculated_balance
           FROM transactions
           WHERE account_id = $1 AND (user_id IS NULL OR user_id = $2) AND computable = true`,
          [accountId, userId]
        );
        
        const calculatedBalance = parseFloat(balanceResult.rows[0]?.calculated_balance || 0);
        
        // Update account balance
        await client.query(
          `UPDATE bank_accounts 
           SET balance = $1, balance_updated_at = NOW(), balance_source = 'calculated'
           WHERE id = $2`,
          [calculatedBalance, accountId]
        );
        
        console.log(`✅ ${account.name}: Updated balance to €${calculatedBalance.toFixed(2)}`);
      }
    }

    // Also recalculate balances for accounts with NULL account_id (if any duplicates had NULL)
    const nullAccountDuplicates = duplicatesQuery.rows.filter(d => !d.account_id);
    if (nullAccountDuplicates.length > 0) {
      console.log('\n⚠️  Found duplicates with NULL account_id - these may affect overall calculations');
    }

    await client.query('COMMIT');
    console.log('\n✅ Duplicate removal and balance recalculation completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Get command line argument
const dryRun = process.argv[2] !== '--execute';

// Run migration
findAndFixDuplicates(dryRun)
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

