#!/usr/bin/env node
/**
 * Re-categorize Transactions Based on Merchant Name
 * 
 * This script re-categorizes transactions that were auto-assigned generic
 * English categories by applying the Spanish keyword logic from pdfParser.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Same categorization logic from pdfParser.js
function categorizeTransaction(description) {
  const desc = description.toLowerCase();
  
  // Salary / Income
  if (desc.includes('nomina') || desc.includes('nómina') || desc.includes('salario') || 
      desc.includes('salary') || desc.includes('sueldo') || desc.includes('payroll')) {
    return 'Salary';
  }

  // Groceries / Supermercado
  if (desc.includes('mercadona') || desc.includes('carrefour') || desc.includes('lidl') ||
      desc.includes('aldi') || desc.includes('dia') || desc.includes('alcampo') ||
      desc.includes('eroski') || desc.includes('consum') || desc.includes('supermarket') ||
      desc.includes('supermercado') || desc.includes('hipermercado') || desc.includes('ahorra mas') ||
      desc.includes('ahorramás') || desc.includes('condis') || desc.includes('bonpreu') ||
      desc.includes('esclat') || desc.includes('gadis') || desc.includes('hiber') ||
      desc.includes('simple') || desc.includes('mas y mas') || desc.includes('masymas') ||
      desc.includes('alimentacion') || desc.includes('grocery')) {
    return 'Supermercado';
  }

  // Restaurants / Food & Dining
  if (desc.includes('restaurante') || desc.includes('restaurant') || desc.includes('mcdonald') ||
      desc.includes('burger king') || desc.includes('kfc') || desc.includes('subway') ||
      desc.includes('domino') || desc.includes('pizza') || desc.includes('telepizza') ||
      desc.includes('bar ') || desc.includes('cafeteria') || desc.includes('cafe ') ||
      desc.includes('coffee') || desc.includes('starbucks') || desc.includes('dunkin') ||
      desc.includes('taco bell') || desc.includes('five guys') || desc.includes('pans') ||
      desc.includes('kebab') || desc.includes('sushi') || desc.includes('comida rapida') ||
      desc.includes('fast food') || desc.includes('food') || desc.includes('eat') ||
      desc.includes('dinner') || desc.includes('lunch') || desc.includes('breakfast') ||
      desc.includes('poke') || desc.includes('wok') || desc.includes('ramen') ||
      desc.includes('tapas') || desc.includes('gastro') || desc.includes('taberna') ||
      desc.includes('cerveceria') || desc.includes('parrilla') || desc.includes('asador') ||
      desc.includes('marisqueria') || desc.includes('pizzeria') || desc.includes('hamburgueseria')) {
    return 'Restaurante';
  }

  // Transport
  if (desc.includes('uber') || desc.includes('cabify') || desc.includes('taxi') ||
      desc.includes('gasolina') || desc.includes('gasolinera') || desc.includes('repsol') ||
      desc.includes('cepsa') || desc.includes('shell') || desc.includes('bp ') ||
      desc.includes('galp') || desc.includes('petrol') || desc.includes('fuel') ||
      desc.includes('parking') || desc.includes('aparcamiento') || desc.includes('peaje') ||
      desc.includes('toll') || desc.includes('renfe') || desc.includes('metro') ||
      desc.includes('tmb') || desc.includes('emt') || desc.includes('bus') ||
      desc.includes('transporte') || desc.includes('transport') || desc.includes('blablacar') ||
      desc.includes('bolt') || desc.includes('freenow') || desc.includes('lyft')) {
    return desc.includes('gasolina') || desc.includes('gasolinera') || desc.includes('repsol') || 
           desc.includes('cepsa') || desc.includes('shell') || desc.includes('galp') ? 'Gasolina' : 
           desc.includes('parking') || desc.includes('aparcamiento') || desc.includes('peaje') ? 'Parking y peaje' :
           'Transportes';
  }

  // Shopping - Clothing
  if (desc.includes('zara') || desc.includes('h&m') || desc.includes('mango') ||
      desc.includes('pull&bear') || desc.includes('bershka') || desc.includes('stradivarius') ||
      desc.includes('massimo dutti') || desc.includes('primark') || desc.includes('decathlon') ||
      desc.includes('nike') || desc.includes('adidas') || desc.includes('deportes') ||
      desc.includes('sport') || desc.includes('ropa') || desc.includes('clothes') ||
      desc.includes('clothing') || desc.includes('fashion') || desc.includes('boutique') ||
      desc.includes('zapateria') || desc.includes('shoes') || desc.includes('calzado') ||
      desc.includes('lefties') || desc.includes('kiabi') || desc.includes('c&a') ||
      desc.includes('corte ingles moda') || desc.includes('springfield')) {
    return 'Ropa';
  }

  // Shopping - Home & Electronics
  if (desc.includes('ikea') || desc.includes('leroy merlin') || desc.includes('bricomart') ||
      desc.includes('aki') || desc.includes('bauhaus') || desc.includes('brico') ||
      desc.includes('hogar') || desc.includes('home') || desc.includes('muebles') ||
      desc.includes('furniture') || desc.includes('deco') || desc.includes('media markt') ||
      desc.includes('mediamarkt') || desc.includes('fnac') || desc.includes('apple') ||
      desc.includes('samsung') || desc.includes('worten') || desc.includes('pccomponentes') ||
      desc.includes('pc componentes') || desc.includes('electro') || desc.includes('electronica') ||
      desc.includes('electronics') || desc.includes('technology')) {
    return desc.includes('ikea') || desc.includes('leroy') || desc.includes('muebles') ? 'Hogar' : 'Electrónica';
  }

  // Shopping - Online
  if (desc.includes('amazon') || desc.includes('ebay') || desc.includes('aliexpress') ||
      desc.includes('ali express') || desc.includes('paypal') || desc.includes('wallapop') ||
      desc.includes('vinted') || desc.includes('etsy') || desc.includes('wish') ||
      desc.includes('shein') || desc.includes('asos') || desc.includes('zalando') ||
      desc.includes('pccomponentes') || desc.includes('coolmod') || desc.includes('online shop') ||
      desc.includes('tienda online') || desc.includes('compra online')) {
    return 'Servicios y productos online';
  }

  // Shopping - Pharmacy & Health
  if (desc.includes('farmacia') || desc.includes('pharmacy') || desc.includes('parafarmacia') ||
      desc.includes('optica') || desc.includes('dentist') || desc.includes('medic') ||
      desc.includes('doctor') || desc.includes('clinic') || desc.includes('hospital') ||
      desc.includes('sanitarium') || desc.includes('health') || desc.includes('salud')) {
    return desc.includes('farmacia') || desc.includes('pharmacy') ? 'Farmacia' : 
           desc.includes('optica') || desc.includes('dentist') ? 'Óptica y dentista' : 'Médico';
  }

  // Shopping - Beauty
  if (desc.includes('peluqueria') || desc.includes('hairdresser') || desc.includes('salon') ||
      desc.includes('barberia') || desc.includes('barber') || desc.includes('estetica') ||
      desc.includes('beauty') || desc.includes('belleza') || desc.includes('spa') ||
      desc.includes('masaje') || desc.includes('massage') || desc.includes('cosmetica') ||
      desc.includes('cosmetics') || desc.includes('perfumeria') || desc.includes('sephora') ||
      desc.includes('douglas') || desc.includes('primor')) {
    return 'Belleza';
  }

  // Shopping - Books & Stationery
  if (desc.includes('libreria') || desc.includes('bookstore') || desc.includes('books') ||
      desc.includes('casa del libro') || desc.includes('papeleria') || desc.includes('stationery') ||
      desc.includes('abacus') || desc.includes('raima')) {
    return 'Librería';
  }

  // Subscriptions / Servicios online
  if (desc.includes('spotify') || desc.includes('netflix') || desc.includes('hbo') ||
      desc.includes('amazon prime') || desc.includes('disney') || desc.includes('apple music') ||
      desc.includes('youtube premium') || desc.includes('twitch') || desc.includes('subscription') ||
      desc.includes('suscripcion') || desc.includes('xbox') || desc.includes('playstation') ||
      desc.includes('nintendo') || desc.includes('steam') || desc.includes('epic games') ||
      desc.includes('microsoft 365') || desc.includes('adobe') || desc.includes('dropbox') ||
      desc.includes('icloud') || desc.includes('google one')) {
    return 'Servicios y productos online';
  }

  // Utilities
  if (desc.includes('endesa') || desc.includes('iberdrola') || desc.includes('naturgy') ||
      desc.includes('gas natural') || desc.includes('electricidad') || desc.includes('electricity') ||
      desc.includes('luz') || desc.includes('power') || desc.includes('energia')) {
    return 'Electricidad';
  }

  if (desc.includes('vodafone') || desc.includes('movistar') || desc.includes('orange') ||
      desc.includes('yoigo') || desc.includes('masmovil') || desc.includes('jazztel') ||
      desc.includes('telefonica') || desc.includes('internet') || desc.includes('fibra') ||
      desc.includes('wifi') || desc.includes('adsl')) {
    return desc.includes('movil') || desc.includes('mobile') || desc.includes('phone') ? 'Móvil' : 'Internet';
  }

  if (desc.includes('agua') || desc.includes('water') || desc.includes('canal isabel') ||
      desc.includes('aigues') || desc.includes('agbar')) {
    return 'Agua';
  }

  // Housing
  if (desc.includes('alquiler') || desc.includes('rent') || desc.includes('inmobiliaria') ||
      desc.includes('real estate') || desc.includes('arrendamiento')) {
    return 'Alquiler y compra';
  }

  if (desc.includes('comunidad') || desc.includes('community') || desc.includes('building fees')) {
    return 'Comunidad';
  }

  if (desc.includes('hipoteca') || desc.includes('mortgage') || desc.includes('prestamo hipotecario')) {
    return 'Hipoteca';
  }

  // Insurance
  if (desc.includes('seguro') || desc.includes('insurance') || desc.includes('axa') ||
      desc.includes('mapfre') || desc.includes('mutua') || desc.includes('sanitas') ||
      desc.includes('adeslas') || desc.includes('asisa') || desc.includes('dkv')) {
    return desc.includes('auto') || desc.includes('coche') || desc.includes('vehiculo') ? 'Seguro auto' :
           desc.includes('salud') || desc.includes('health') || desc.includes('sanitas') || desc.includes('adeslas') ? 'Seguro salud' :
           desc.includes('hogar') || desc.includes('home') || desc.includes('casa') ? 'Seguro hogar' : 'Otros seguros';
  }

  // Bank Fees
  if (desc.includes('comision') || desc.includes('commission') || desc.includes('fee') ||
      desc.includes('cargo') || desc.includes('mantenimiento') || desc.includes('maintenance')) {
    return 'Cargos bancarios';
  }

  // Taxes
  if (desc.includes('hacienda') || desc.includes('impuesto') || desc.includes('tax') ||
      desc.includes('iva') || desc.includes('irpf') || desc.includes('tribut') ||
      desc.includes('agencia tributaria') || desc.includes('modelo ')) {
    return 'Impuestos';
  }

  // Loans
  if (desc.includes('prestamo') || desc.includes('loan') || desc.includes('credito') ||
      desc.includes('credit') || desc.includes('financiacion') || desc.includes('financing')) {
    return 'Préstamos';
  }

  // Transfers
  if (desc.includes('traspaso') || desc.includes('transferencia') || desc.includes('transfer') ||
      desc.includes('envio') || desc.includes('bizum') || desc.includes('paypal envio')) {
    return 'Transferencias';
  }

  // Cash
  if (desc.includes('cajero') || desc.includes('atm') || desc.includes('efectivo') ||
      desc.includes('cash') || desc.includes('reintegro') || desc.includes('withdrawal')) {
    return 'Efectivo';
  }

  // Entertainment
  if (desc.includes('cine') || desc.includes('cinema') || desc.includes('teatro') ||
      desc.includes('theatre') || desc.includes('concierto') || desc.includes('concert') ||
      desc.includes('entradas') || desc.includes('tickets') || desc.includes('espectaculo')) {
    return 'Espectáculos';
  }

  // Education
  if (desc.includes('universidad') || desc.includes('university') || desc.includes('colegio') ||
      desc.includes('school') || desc.includes('academia') || desc.includes('curso') ||
      desc.includes('course') || desc.includes('matricula') || desc.includes('estudios') ||
      desc.includes('education') || desc.includes('formacion')) {
    return 'Estudios';
  }

  // Sports
  if (desc.includes('gimnasio') || desc.includes('gym') || desc.includes('fitness') ||
      desc.includes('sport') || desc.includes('club deportivo') || desc.includes('piscina') ||
      desc.includes('yoga') || desc.includes('pilates') || desc.includes('crossfit')) {
    return 'Deporte';
  }

  // Vehicle
  if (desc.includes('taller') || desc.includes('garage') || desc.includes('mecanico') ||
      desc.includes('mechanic') || desc.includes('reparacion') || desc.includes('repair') ||
      desc.includes('itv') || desc.includes('lavado') || desc.includes('car wash')) {
    return 'Mantenimiento vehículo';
  }

  // Generic Shopping (fallback for actual shops)
  if (desc.includes('compra') || desc.includes('purchase') || desc.includes('shop') ||
      desc.includes('store') || desc.includes('tienda')) {
    return 'Otras compras';
  }

  return 'Otros gastos';
}

async function recategorizeTransactions() {
  console.log('🔄 Re-categorizing Transactions Based on Merchant Names...\n');

  try {
    const userResult = await pool.query(`
      SELECT id, email FROM users WHERE email = 'jarosquijano@gmail.com'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const userId = userResult.rows[0].id;
    console.log(`👤 User: ${userResult.rows[0].email}\n`);

    // Get transactions with generic English categories
    const problematicCategories = ['Shopping', 'Food & Dining', 'Groceries', 'Compras online'];
    
    const result = await pool.query(`
      SELECT id, description, category, amount, date
      FROM transactions
      WHERE (user_id IS NULL OR user_id = $1)
      AND category = ANY($2)
      AND type = 'expense'
      ORDER BY date DESC
    `, [userId, problematicCategories]);

    console.log(`📊 Found ${result.rows.length} transactions to re-categorize\n`);

    if (result.rows.length === 0) {
      console.log('✅ No transactions need re-categorization');
      return;
    }

    let updatedCount = 0;
    const updates = {};

    console.log('🔍 Analyzing transactions...\n');

    for (const transaction of result.rows) {
      const newCategory = categorizeTransaction(transaction.description);
      
      // Only update if the new category is different
      if (newCategory !== transaction.category) {
        updates[transaction.id] = {
          old: transaction.category,
          new: newCategory,
          description: transaction.description,
          amount: transaction.amount
        };
      }
    }

    console.log(`📝 Transactions to update: ${Object.keys(updates).length}\n`);

    if (Object.keys(updates).length === 0) {
      console.log('✅ All transactions are already correctly categorized');
      return;
    }

    // Show preview
    console.log('Preview of changes:');
    console.log('─────────────────────────────────────────────────────────────────');
    let previewCount = 0;
    for (const [id, update] of Object.entries(updates)) {
      if (previewCount < 20) {
        console.log(`${update.old.padEnd(20)} → ${update.new.padEnd(20)} €${parseFloat(update.amount).toFixed(2).padStart(8)}`);
        console.log(`   "${update.description.substring(0, 60)}"`);
        previewCount++;
      }
    }
    if (Object.keys(updates).length > 20) {
      console.log(`   ... and ${Object.keys(updates).length - 20} more`);
    }
    console.log('─────────────────────────────────────────────────────────────────\n');

    // Apply updates
    console.log('💾 Applying updates...\n');
    
    for (const [id, update] of Object.entries(updates)) {
      await pool.query(`
        UPDATE transactions
        SET category = $1
        WHERE id = $2
      `, [update.new, id]);
      
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        process.stdout.write(`\r   Updated: ${updatedCount}/${Object.keys(updates).length}`);
      }
    }
    
    console.log(`\r   Updated: ${updatedCount}/${Object.keys(updates).length}\n`);

    // Summary by new category
    console.log('\n📊 SUMMARY BY NEW CATEGORY:');
    console.log('─────────────────────────────────────────────────────────────────');
    
    const categorySummary = {};
    for (const update of Object.values(updates)) {
      if (!categorySummary[update.new]) {
        categorySummary[update.new] = { count: 0, total: 0 };
      }
      categorySummary[update.new].count++;
      categorySummary[update.new].total += parseFloat(update.amount);
    }

    const sortedCategories = Object.entries(categorySummary)
      .sort((a, b) => b[1].total - a[1].total);

    for (const [category, data] of sortedCategories) {
      console.log(`${category.padEnd(30)} ${String(data.count).padStart(3)} txns   €${data.total.toFixed(2).padStart(10)}`);
    }

    console.log('\n✅ Re-categorization complete!');
    console.log(`\n💡 Total transactions updated: ${updatedCount}`);
    console.log(`💡 Go to Budget tab and refresh to see the updated totals\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

recategorizeTransactions();

