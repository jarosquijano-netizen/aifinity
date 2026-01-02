// Test deduplication logic
const categories = [
  { name: 'Belleza', budget_amount: '50' },
  { name: 'Personal > Belleza', budget_amount: '100' },
  { name: 'Gasolina', budget_amount: '120' },
  { name: 'Transporte > Gasolina', budget_amount: '120' },
  { name: 'Hogar', budget_amount: '200' },
  { name: 'Vivienda > Hogar', budget_amount: '50' },
  { name: 'Médico', budget_amount: '50' },
  { name: 'Salud > Médico', budget_amount: '50' },
];

const isDuplicateCategory = (name1, name2) => {
  if (name1 === name2) return true;
  if (name1.includes(' > ')) {
    const subcategory = name1.split(' > ')[1];
    if (subcategory === name2) return true;
  }
  if (name2.includes(' > ')) {
    const subcategory = name2.split(' > ')[1];
    if (subcategory === name1) return true;
  }
  return false;
};

const budgetMap = {};

categories.forEach(cat => {
  let isDuplicate = false;
  let existingKey = null;
  
  for (const key in budgetMap) {
    if (isDuplicateCategory(cat.name, key)) {
      isDuplicate = true;
      if (cat.name.includes(' > ')) {
        existingKey = key;
        break;
      } else if (key.includes(' > ')) {
        existingKey = key;
        break;
      } else {
        existingKey = key;
        break;
      }
    }
  }
  
  if (!isDuplicate) {
    budgetMap[cat.name] = parseFloat(cat.budget_amount || 0);
    console.log(`Added: ${cat.name} = €${cat.budget_amount}`);
  } else if (existingKey && cat.name.includes(' > ')) {
    const oldBudget = budgetMap[existingKey] || 0;
    const newBudget = parseFloat(cat.budget_amount || 0);
    delete budgetMap[existingKey];
    budgetMap[cat.name] = oldBudget + newBudget;
    console.log(`Merged: ${existingKey} (€${oldBudget}) + ${cat.name} (€${newBudget}) = ${cat.name} (€${oldBudget + newBudget})`);
  } else if (existingKey && existingKey.includes(' > ')) {
    const existingBudget = budgetMap[existingKey] || 0;
    const newBudget = parseFloat(cat.budget_amount || 0);
    budgetMap[existingKey] = existingBudget + newBudget;
    console.log(`Merged into existing: ${existingKey} (€${existingBudget}) + ${cat.name} (€${newBudget}) = ${existingKey} (€${existingBudget + newBudget})`);
  }
});

console.log('\nFinal budgetMap:');
Object.entries(budgetMap).forEach(([name, amount]) => {
  console.log(`  ${name}: €${amount}`);
});

const total = Object.values(budgetMap).reduce((sum, b) => sum + b, 0);
console.log(`\nTotal: €${total}`);







