import pool from '../config/database.js';

/**
 * Find and fix transactions with invalid dates (years outside reasonable range)
 * This fixes dates like "2037", "1959", "104" that were incorrectly parsed
 */
async function fixInvalidTransactionDates() {
  const client = await pool.connect();
  try {
    console.log('🔍 Finding transactions with invalid dates...\n');

    // Find transactions with dates outside reasonable range (2020-2030)
    const invalidDatesResult = await client.query(`
      SELECT id, date, description, amount, bank
      FROM transactions
      WHERE EXTRACT(YEAR FROM date) < 2020 
         OR EXTRACT(YEAR FROM date) > 2030
      ORDER BY date DESC
    `);

    console.log(`📊 Found ${invalidDatesResult.rows.length} transactions with invalid dates\n`);

    if (invalidDatesResult.rows.length === 0) {
      console.log('✅ No invalid dates found!');
      return { fixed: 0, deleted: 0 };
    }

    // Group by year to see the pattern
    const yearGroups = {};
    invalidDatesResult.rows.forEach(row => {
      const year = new Date(row.date).getFullYear();
      if (!yearGroups[year]) {
        yearGroups[year] = [];
      }
      yearGroups[year].push(row);
    });

    console.log('📅 Invalid dates by year:');
    Object.keys(yearGroups).sort().forEach(year => {
      console.log(`   ${year}: ${yearGroups[year].length} transactions`);
    });
    console.log('');

    let fixedCount = 0;
    let deletedCount = 0;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    for (const transaction of invalidDatesResult.rows) {
      const transactionDate = new Date(transaction.date);
      const year = transactionDate.getFullYear();
      const month = transactionDate.getMonth() + 1;
      const day = transactionDate.getDate();

      // Skip if day/month are invalid (shouldn't happen, but just in case)
      if (day < 1 || day > 31 || month < 1 || month > 12) {
        console.log(`🗑️  Deleting transaction with invalid day/month: ${transaction.date} - ${transaction.description.substring(0, 50)}`);
        await client.query(`DELETE FROM transactions WHERE id = $1`, [transaction.id]);
        deletedCount++;
        continue;
      }

      // Determine correct year
      let correctYear = currentYear;

      // If month is in the future (more than 1 month ahead), it's likely from previous year
      if (month > currentMonth + 1) {
        correctYear = currentYear - 1;
      }

      // If year is way in the past (< 2020), try to fix it
      if (year < 2020) {
        // If month/day suggest it's a recent transaction, use current year
        // Otherwise, assume it's from last year
        if (month >= currentMonth - 1) {
          correctYear = currentYear;
        } else {
          correctYear = currentYear - 1;
        }
      }

      // If year is way in the future (> 2030), it's definitely wrong
      if (year > 2030) {
        // If month is in the past relative to current month, it's from current year
        // Otherwise, it's from previous year
        if (month < currentMonth) {
          correctYear = currentYear;
        } else {
          correctYear = currentYear - 1;
        }
      }

      // Ensure year is reasonable
      if (correctYear < 2020) {
        correctYear = currentYear;
      }
      if (correctYear > currentYear + 1) {
        correctYear = currentYear;
      }

      const correctedDate = `${correctYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      // Validate the corrected date
      const dateObj = new Date(correctedDate);
      if (isNaN(dateObj.getTime())) {
        console.log(`⚠️  Invalid corrected date: ${correctedDate} for transaction ${transaction.id}`);
        continue;
      }

      // Check if date is more than 1 year in the future (still invalid)
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
      if (dateObj > maxFutureDate) {
        console.log(`🗑️  Deleting transaction with date too far in future: ${correctedDate} - ${transaction.description.substring(0, 50)}`);
        await client.query(`DELETE FROM transactions WHERE id = $1`, [transaction.id]);
        deletedCount++;
        continue;
      }

      // Update the transaction
      console.log(`✅ Fixing: ${transaction.date} → ${correctedDate} (${transaction.description.substring(0, 40)}...)`);
      await client.query(
        `UPDATE transactions SET date = $1 WHERE id = $2`,
        [correctedDate, transaction.id]
      );
      fixedCount++;
    }

    console.log(`\n✅ Fixed ${fixedCount} transactions`);
    console.log(`🗑️  Deleted ${deletedCount} transactions with unrecoverable dates`);

    // Now check for duplicate transactions
    console.log('\n🔍 Checking for duplicate transactions...\n');

    const duplicatesResult = await client.query(`
      SELECT 
        date,
        description,
        amount,
        account_id,
        user_id,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at ASC) as transaction_ids,
        ARRAY_AGG(created_at ORDER BY created_at ASC) as created_dates
      FROM transactions
      GROUP BY date, description, amount, account_id, user_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC, date DESC
    `);

    console.log(`📊 Found ${duplicatesResult.rows.length} groups of duplicate transactions\n`);

    let duplicatesDeleted = 0;

    for (const duplicateGroup of duplicatesResult.rows) {
      const transactionIds = duplicateGroup.transaction_ids;
      const createdDates = duplicateGroup.created_dates;
      
      // Keep the oldest transaction (first in array), delete the rest
      const keepId = transactionIds[0];
      const duplicatesToDelete = transactionIds.slice(1);

      console.log(`🔄 Duplicate group: "${duplicateGroup.description.substring(0, 40)}..."`);
      console.log(`   Date: ${duplicateGroup.date}, Amount: €${duplicateGroup.amount}`);
      console.log(`   Count: ${duplicateGroup.count} transactions`);
      console.log(`   ✅ Keeping: ID ${keepId} (oldest)`);
      console.log(`   🗑️  Deleting: ${duplicatesToDelete.length} duplicate(s)`);

      // Delete duplicate transactions
      for (const duplicateId of duplicatesToDelete) {
        await client.query(`DELETE FROM transactions WHERE id = $1`, [duplicateId]);
        duplicatesDeleted++;
      }
      console.log('');
    }

    console.log(`\n✅ Duplicate cleanup completed`);
    console.log(`   Deleted ${duplicatesDeleted} duplicate transactions`);

    return { 
      fixed: fixedCount, 
      deleted: deletedCount,
      duplicatesDeleted: duplicatesDeleted,
      duplicateGroups: duplicatesResult.rows.length
    };
  } catch (error) {
    console.error('❌ Error fixing invalid dates:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
fixInvalidTransactionDates()
  .then((result) => {
    console.log('\n✅ Script completed');
    console.log(`   Fixed dates: ${result.fixed}`);
    console.log(`   Deleted invalid dates: ${result.deleted}`);
    console.log(`   Deleted duplicates: ${result.duplicatesDeleted}`);
    console.log(`   Duplicate groups found: ${result.duplicateGroups}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    console.error(error.stack);
    process.exit(1);
  });

export default fixInvalidTransactionDates;

