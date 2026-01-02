import addIsAnnualToCategories from './migrations/add-is-annual-to-categories.js';

addIsAnnualToCategories()
  .then(() => {
    console.log('\n✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });






