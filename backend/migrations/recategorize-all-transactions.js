import pool from '../config/database.js';

/**
 * Recategorize all transactions using the master category list
 * Normalizes categories to hierarchical format and assigns proper categories
 */

/**
 * Normalize category to hierarchical format
 */
function normalizeCategory(category) {
  if (!category) return 'Otros > Sin categoría';
  
  const categoryLower = category.toLowerCase().trim();
  
  const categoryMap = {
    // Income categories -> Finanzas > Ingresos
    'ingresos': 'Finanzas > Ingresos',
    'salary': 'Finanzas > Ingresos',
    'payroll': 'Finanzas > Ingresos',
    'nomina': 'Finanzas > Ingresos',
    'nómina': 'Finanzas > Ingresos',
    'salario': 'Finanzas > Ingresos',
    'sueldo': 'Finanzas > Ingresos',
    
    // Transfer categories -> Finanzas > Transferencias
    'transferencias': 'Finanzas > Transferencias',
    'transferencia': 'Finanzas > Transferencias',
    'transfer': 'Finanzas > Transferencias',
    'traspaso': 'Finanzas > Transferencias',
    'bizum': 'Finanzas > Transferencias',
    
    // Cash -> Finanzas > Efectivo
    'efectivo': 'Finanzas > Efectivo',
    'cash': 'Finanzas > Efectivo',
    
    // Loans -> Finanzas > Préstamos
    'préstamos': 'Finanzas > Préstamos',
    'prestamos': 'Finanzas > Préstamos',
    'loan': 'Finanzas > Préstamos',
    'loans': 'Finanzas > Préstamos',
    
    // Groceries -> Alimentación > Supermercado
    'supermercado': 'Alimentación > Supermercado',
    'groceries': 'Alimentación > Supermercado',
    'food & dining': 'Alimentación > Supermercado',
    
    // Restaurants -> Alimentación > Restaurante
    'restaurante': 'Alimentación > Restaurante',
    'restaurant': 'Alimentación > Restaurante',
    
    // Housing -> Vivienda > Hogar
    'hogar': 'Vivienda > Hogar',
    'housing': 'Vivienda > Hogar',
    'home': 'Vivienda > Hogar',
    
    // Mortgage -> Vivienda > Hipoteca
    'hipoteca': 'Vivienda > Hipoteca',
    'mortgage': 'Vivienda > Hipoteca',
    
    // Transport -> Transporte > Transportes
    'transportes': 'Transporte > Transportes',
    'transport': 'Transporte > Transportes',
    'transportation': 'Transporte > Transportes',
    
    // Gas -> Transporte > Gasolina
    'gasolina': 'Transporte > Gasolina',
    'gas': 'Transporte > Gasolina',
    'fuel': 'Transporte > Gasolina',
    
    // Health -> Salud > Médico
    'médico': 'Salud > Médico',
    'medico': 'Salud > Médico',
    'healthcare': 'Salud > Médico',
    
    // Pharmacy -> Salud > Farmacia
    'farmacia': 'Salud > Farmacia',
    'pharmacy': 'Salud > Farmacia',
    
    // Shopping -> Compras > Compras
    'compras': 'Compras > Compras',
    'shopping': 'Compras > Compras',
    
    // Entertainment -> Ocio > Entretenimiento
    'entretenimiento': 'Ocio > Entretenimiento',
    'entertainment': 'Ocio > Entretenimiento',
    
    // Education -> Educación > Estudios
    'estudios': 'Educación > Estudios',
    'education': 'Educación > Estudios',
    
    // Sports -> Deporte > Deporte
    'deporte': 'Deporte > Deporte',
    'sports': 'Deporte > Deporte',
    
    // Others -> Otros > Otros
    'otros': 'Otros > Otros',
    'other': 'Otros > Otros',
    'others': 'Otros > Otros',
    'uncategorized': 'Otros > Sin categoría',
    'sin categoría': 'Otros > Sin categoría',
    'sin categoria': 'Otros > Sin categoría',
  };
  
  if (categoryMap[categoryLower]) {
    return categoryMap[categoryLower];
  }
  
  if (category.includes(' > ')) {
    return category; // Already hierarchical
  }
  
  return 'Otros > Sin categoría';
}

/**
 * Categorize transaction based on description
 * Uses the same logic as pdfParser.js
 */
function categorizeTransaction(description) {
  if (!description) return 'Otros > Sin categoría';
  
  const descLower = description.toLowerCase();
  
  // === INCOME & SALARY ===
  if (descLower.includes('salary') || descLower.includes('payroll') || 
      descLower.includes('nomina') || descLower.includes('nómina') ||
      descLower.includes('salario') || descLower.includes('sueldo')) {
    return 'Finanzas > Ingresos';
  }
  
  // === GROCERIES & SUPERMARKETS ===
  if (descLower.includes('supermarket') || descLower.includes('supermercado') ||
      descLower.includes('mercadona') || descLower.includes('carrefour') ||
      descLower.includes('lidl') || descLower.includes('aldi') ||
      descLower.includes('dia %') || descLower.includes('dia ') ||
      descLower.includes('alcampo') || descLower.includes('el corte ingles') ||
      descLower.includes('corte inglés') || descLower.includes('hipercor') ||
      descLower.includes('consum') || descLower.includes('bonpreu') ||
      descLower.includes('esclat') || descLower.includes('hipermercat') ||
      descLower.includes('caprabo') || descLower.includes('condis') ||
      descLower.includes('guissona') || descLower.includes('froiz') ||
      descLower.includes('gadis') || descLower.includes('eroski') ||
      descLower.includes('hiper garraf') || descLower.includes('alimentacio')) {
    return 'Alimentación > Supermercado';
  }
  
  // === RESTAURANTS & FOOD ===
  if (descLower.includes('restaurant') || descLower.includes('restaurante') ||
      descLower.includes('mcdonald') || descLower.includes('burger king') ||
      descLower.includes('kfc') || descLower.includes('telepizza') ||
      descLower.includes('domino') || descLower.includes('starbucks') ||
      descLower.includes('cafe') || descLower.includes('café') ||
      descLower.includes('cafeteria') || descLower.includes('bar ') ||
      descLower.includes('pizzeria') || descLower.includes('pizza') ||
      descLower.includes('foodtruck') || descLower.includes('food truck')) {
    return 'Alimentación > Restaurante';
  }
  
  // === TRANSPORT ===
  if (descLower.includes('gasolina') || descLower.includes('gas station') ||
      descLower.includes('repsol') || descLower.includes('cepsa') ||
      descLower.includes('bp ') || descLower.includes('shell') ||
      descLower.includes('galp') || descLower.includes('fuel')) {
    return 'Transporte > Gasolina';
  }
  
  if (descLower.includes('uber') || descLower.includes('cabify') ||
      descLower.includes('taxi') || descLower.includes('metro') ||
      descLower.includes('renfe') || descLower.includes('fgc') ||
      descLower.includes('tmb') || descLower.includes('transporte') ||
      descLower.includes('transport')) {
    return 'Transporte > Transportes';
  }
  
  if (descLower.includes('parking') || descLower.includes('aparcament') ||
      descLower.includes('peaje') || descLower.includes('autopista')) {
    return 'Transporte > Parking y peaje';
  }
  
  // === HOUSING ===
  if (descLower.includes('hipoteca') || descLower.includes('mortgage')) {
    return 'Vivienda > Hipoteca';
  }
  
  if (descLower.includes('comunidad') || descLower.includes('community')) {
    return 'Vivienda > Comunidad';
  }
  
  if (descLower.includes('rent') || descLower.includes('alquiler') ||
      descLower.includes('landlord') || descLower.includes('arrendamiento')) {
    return 'Vivienda > Alquiler y compra';
  }
  
  if (descLower.includes('mantenimiento') && (descLower.includes('hogar') || descLower.includes('casa'))) {
    return 'Vivienda > Mantenimiento hogar';
  }
  
  if (descLower.includes('vivienda') || descLower.includes('hogar') ||
      descLower.includes('casa') || descLower.includes('home')) {
    return 'Vivienda > Hogar';
  }
  
  // === HEALTHCARE ===
  if (descLower.includes('pharmacy') || descLower.includes('farmacia') ||
      descLower.includes('rossmann') || descLower.includes('drogueria')) {
    return 'Salud > Farmacia';
  }
  
  if (descLower.includes('hospital') || descLower.includes('doctor') ||
      descLower.includes('medico') || descLower.includes('clinica') ||
      descLower.includes('medical') || descLower.includes('dentist') ||
      descLower.includes('dentista') || descLower.includes('optica')) {
    return 'Salud > Médico';
  }
  
  // === INSURANCE ===
  if (descLower.includes('seguro')) {
    if (descLower.includes('auto') || descLower.includes('coche') || descLower.includes('vehiculo')) {
      return 'Seguros > Seguro auto';
    } else if (descLower.includes('salud') || descLower.includes('health')) {
      return 'Seguros > Seguro salud';
    } else if (descLower.includes('hogar') || descLower.includes('home') || descLower.includes('casa')) {
      return 'Seguros > Seguro hogar';
    }
    return 'Seguros > Seguro salud';
  }
  
  // === UTILITIES ===
  if (descLower.includes('electric') || descLower.includes('electrica') ||
      descLower.includes('endesa') || descLower.includes('iberdrola') ||
      descLower.includes('naturgy') || descLower.includes('fenosa')) {
    return 'Servicios > Electricidad';
  }
  
  if (descLower.includes('agua') || descLower.includes('water')) {
    return 'Servicios > Agua';
  }
  
  if (descLower.includes('internet') || descLower.includes('wifi') ||
      descLower.includes('fibra')) {
    return 'Servicios > Internet';
  }
  
  if (descLower.includes('movistar') || descLower.includes('vodafone') ||
      descLower.includes('orange') || descLower.includes('yoigo') ||
      descLower.includes('jazztel') || descLower.includes('masmovil') ||
      descLower.includes('móvil')) {
    return 'Servicios > Móvil';
  }
  
  if (descLower.includes('television') || descLower.includes('televisión') ||
      descLower.includes('tv') || descLower.includes('canal+')) {
    return 'Servicios > Televisión';
  }
  
  // === ENTERTAINMENT ===
  if (descLower.includes('cinema') || descLower.includes('cine') ||
      descLower.includes('theater') || descLower.includes('teatro') ||
      descLower.includes('museum') || descLower.includes('museo') ||
      descLower.includes('concert') || descLower.includes('concierto') ||
      descLower.includes('entrada') || descLower.includes('ticket') ||
      descLower.includes('espectaculo')) {
    return 'Ocio > Espectáculos';
  }
  
  if (descLower.includes('hotel') || descLower.includes('resort') ||
      descLower.includes('vacation') || descLower.includes('vacaciones') ||
      descLower.includes('airbnb') || descLower.includes('viaje') ||
      descLower.includes('travel')) {
    return 'Ocio > Vacation';
  }
  
  if (descLower.includes('spotify') || descLower.includes('netflix') ||
      descLower.includes('disney') || descLower.includes('hbo') ||
      descLower.includes('youtube premium') || descLower.includes('amazon prime')) {
    return 'Ocio > Entretenimiento';
  }
  
  // === EDUCATION ===
  if (descLower.includes('escuela') || descLower.includes('escola') ||
      descLower.includes('colegio') || descLower.includes('universidad') ||
      descLower.includes('universitat') || descLower.includes('estudios') ||
      descLower.includes('education') || descLower.includes('academy') ||
      descLower.includes('academia') || descLower.includes('curso')) {
    return 'Educación > Estudios';
  }
  
  if (descLower.includes('libreria') || descLower.includes('librería') ||
      descLower.includes('bookstore') || descLower.includes('casa del libro')) {
    return 'Educación > Librería';
  }
  
  // === SHOPPING ===
  if (descLower.includes('amazon') || descLower.includes('zara') ||
      descLower.includes('h&m') || descLower.includes('mango') ||
      descLower.includes('pull&bear') || descLower.includes('bershka') ||
      descLower.includes('stradivarius') || descLower.includes('massimo dutti') ||
      descLower.includes('primark') || descLower.includes('decathlon') ||
      descLower.includes('ikea') || descLower.includes('leroy merlin') ||
      descLower.includes('media markt') || descLower.includes('fnac') ||
      descLower.includes('worten')) {
    return 'Compras > Compras';
  }
  
  // === TRANSFERS ===
  if (descLower.includes('transferencia') || descLower.includes('transfer') ||
      descLower.includes('traspaso') || descLower.includes('bizum')) {
    return 'Finanzas > Transferencias';
  }
  
  // === CASH ===
  if (descLower.includes('cajero') || descLower.includes('atm') ||
      descLower.includes('efectivo') || descLower.includes('cash') ||
      descLower.includes('retirada') || descLower.includes('reintegro')) {
    return 'Finanzas > Efectivo';
  }
  
  // === LOANS ===
  // === CREDIT CARD PAYMENTS (must check BEFORE loans) ===
  // Pagos a tarjeta de crédito son transferencias, no préstamos
  if (descLower.includes('tarjeta credito') || descLower.includes('tarjeta crédito') ||
      descLower.includes('tarjeta de credito') || descLower.includes('tarjeta de crédito') ||
      descLower.includes('pago tarjeta') || descLower.includes('liquidacion tarjeta') ||
      descLower.includes('liquidación tarjeta') || descLower.includes('cargo tarjeta') ||
      descLower.includes('pago visa') || descLower.includes('pago mastercard') ||
      descLower.includes('pago american express') || descLower.includes('pago amex') ||
      descLower.includes('credit card payment') || descLower.includes('pago tarjeta credito') ||
      descLower.includes('pago tarjeta crédito') ||
      (descLower.includes('visa') && (descLower.includes('pago') || descLower.includes('cargo') || descLower.includes('liquidacion')))) {
    return 'Finanzas > Transferencias';
  }
  
  // === LOANS & FINANCING ===
  // Excluir pagos a tarjeta de crédito (ya manejados arriba)
  if ((descLower.includes('prestamo') || descLower.includes('préstamo') ||
      descLower.includes('loan') || descLower.includes('financiera') ||
      descLower.includes('cetelem') || descLower.includes('credito') ||
      descLower.includes('crédito') || descLower.includes('cuota')) &&
      !descLower.includes('tarjeta')) { // Excluir si menciona "tarjeta"
    return 'Finanzas > Préstamos';
  }
  
  // === TAXES ===
  if (descLower.includes('impuesto') || descLower.includes('hacienda') ||
      descLower.includes('tax') || descLower.includes('iva') ||
      descLower.includes('agencia tributaria') || descLower.includes('ajuntament')) {
    return 'Organismos > Impuestos';
  }
  
  // Default fallback
  return 'Otros > Otros';
}

async function recategorizeAllTransactions() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Recategorizing all transactions...\n');
    
    // Get all transactions
    const result = await client.query(
      `SELECT id, description, category, type 
       FROM transactions 
       WHERE category IS NOT NULL 
       AND category != ''
       AND category != 'NC'
       AND category != 'nc'
       ORDER BY id`
    );
    
    console.log(`📊 Found ${result.rows.length} transactions to process\n`);
    
    let updatedCount = 0;
    let unchangedCount = 0;
    const categoryChanges = new Map();
    
    for (const transaction of result.rows) {
      const currentCategory = transaction.category;
      
      // First, try to categorize based on description
      let newCategory = categorizeTransaction(transaction.description || '');
      
      // If categorization didn't find a match, normalize the existing category
      if (newCategory === 'Otros > Otros' && currentCategory) {
        newCategory = normalizeCategory(currentCategory);
      }
      
      // Normalize the new category
      newCategory = normalizeCategory(newCategory);
      
      // Only update if category changed
      if (newCategory !== currentCategory) {
        await client.query(
          `UPDATE transactions 
           SET category = $1 
           WHERE id = $2`,
          [newCategory, transaction.id]
        );
        
        updatedCount++;
        
        // Track category changes
        const changeKey = `${currentCategory} → ${newCategory}`;
        categoryChanges.set(changeKey, (categoryChanges.get(changeKey) || 0) + 1);
        
        if (updatedCount % 100 === 0) {
          console.log(`   Processed ${updatedCount} updates...`);
        }
      } else {
        unchangedCount++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Recategorization completed!');
    console.log(`   - Transactions updated: ${updatedCount}`);
    console.log(`   - Transactions unchanged: ${unchangedCount}`);
    console.log(`   - Total processed: ${result.rows.length}\n`);
    
    if (categoryChanges.size > 0) {
      console.log('📊 Category changes summary:');
      const sortedChanges = Array.from(categoryChanges.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20); // Top 20 changes
      
      sortedChanges.forEach(([change, count]) => {
        console.log(`   ${change}: ${count} transactions`);
      });
    }
    
    return {
      total: result.rows.length,
      updated: updatedCount,
      unchanged: unchangedCount,
      changes: Object.fromEntries(categoryChanges)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error recategorizing transactions:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run script if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('recategorize-all-transactions.js');

if (isMainModule || process.argv[1]?.includes('recategorize-all-transactions')) {
  recategorizeAllTransactions()
    .then((result) => {
      console.log('\n✅ Script completed successfully');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      console.error('Error details:', error.stack);
      process.exit(1);
    });
}

export default recategorizeAllTransactions;

