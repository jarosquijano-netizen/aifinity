import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file) {
  console.error('📄 extractTextFromPDF CALLED');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.error(`📄 PDF has ${pdf.numPages} pages`);
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Improved text extraction - preserve structure better
      // For table-like PDFs, items might have positioning info
      let pageText = '';
      
      // Try to preserve line structure by checking y-coordinates
      let lastY = null;
      const items = textContent.items;
      
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const currentY = item.transform ? item.transform[5] : null; // y-coordinate
        
        // If y-coordinate changed significantly, it's a new line
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        }
        
        pageText += item.str;
        
        // Add space unless next item is very close horizontally
        if (j < items.length - 1) {
          const nextItem = items[j + 1];
          const currentX = item.transform ? item.transform[4] : null;
          const nextX = nextItem.transform ? nextItem.transform[4] : null;
          
          if (currentX !== null && nextX !== null && nextX - currentX > item.width * 1.5) {
            pageText += ' ';
          }
        }
        
        lastY = currentY;
      }
      
      fullText += pageText + '\n';
      
      if (i === 1) {
        console.error(`📄 Page 1 text (first 500 chars):`, pageText.substring(0, 500));
      }
    }
    
    console.error(`📄 Total extracted text length: ${fullText.length}`);
    return fullText;
  } catch (error) {
    console.error('❌ Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

/**
 * Detect bank from PDF content
 */
function detectBank(text) {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('ing') || textLower.includes('ing bank')) {
    return 'ING';
  } else if (textLower.includes('sabadell') || textLower.includes('banco sabadell')) {
    return 'Sabadell';
  }
  
  return 'Unknown';
}

/**
 * Parse ING bank statement (PDF format)
 * Improved parser that handles table structure and multi-line transactions
 */
function parseINGStatement(text) {
  console.error('📄 parseINGStatement CALLED - PDF text length:', text.length);
  
  const transactions = [];
  const lines = text.split('\n');
  
  console.error('📄 Total lines in PDF:', lines.length);
  console.error('📄 First 20 lines:', lines.slice(0, 20));
  
  // ING PDF format: Date Pattern DD/MM/YYYY or DD-MM-YYYY
  const datePattern = /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/;
  // Amount pattern: can be negative, with comma or dot as decimal separator
  const amountPattern = /[-+]?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|[-+]?\d+[.,]\d{2}/;
  
  let processedCount = 0;
  let skippedCount = 0;
  
  // Look for lines with dates - they mark transaction rows
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 5) continue; // Skip very short lines
    
    const dateMatch = line.match(datePattern);
    
    if (dateMatch) {
      processedCount++;
      
      // Found a date - this might be a transaction row
      const dateStr = dateMatch[1];
      const date = parseDate(dateStr);
      
      // Try to find amounts in this line and following lines (in case transaction spans multiple lines)
      let fullLine = line;
      
      // Check next 2 lines for continuation (sometimes description spans lines)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        // If next line doesn't start with a date, it might be part of this transaction
        if (nextLine && !nextLine.match(datePattern)) {
          fullLine += ' ' + nextLine;
        }
      }
      
      // Find all amounts in the line
      const amountMatches = fullLine.match(new RegExp(amountPattern, 'g'));
      
      if (amountMatches && amountMatches.length > 0) {
        // In ING PDF, transactions usually have:
        // - Date
        // - Category/Description
        // - Amount (IMPORTE) - the transaction amount
        // - Balance (SALDO) - the running balance
        
        // Typically the first amount after the date is the transaction amount
        // But if there are multiple amounts, we need to identify which is the transaction amount
        // Usually it's the one that's not the balance (balance is usually last and larger)
        
        let transactionAmount = null;
        let description = '';
        
        // Try to extract the transaction amount
        // If there's only one amount, use it
        if (amountMatches.length === 1) {
          transactionAmount = parseAmount(amountMatches[0]);
        } else {
          // Multiple amounts - usually the transaction amount is smaller/more varied
          // The balance is usually the last one and might be cumulative
          // For now, try the first amount that's not too large (heuristic)
          for (const amountStr of amountMatches) {
            const amount = parseAmount(amountStr);
            // Skip if it's 0 or very large (likely a balance)
            if (amount !== 0 && Math.abs(amount) < 100000) {
              transactionAmount = amount;
              break;
            }
          }
          // If no good candidate, use the first non-zero amount
          if (!transactionAmount) {
            for (const amountStr of amountMatches) {
              const amount = parseAmount(amountStr);
              if (amount !== 0) {
                transactionAmount = amount;
                break;
              }
            }
          }
        }
        
        // Extract description - remove date and amounts
        description = fullLine
          .replace(dateMatch[0], '')
          .replace(/\d{1,2}[-/]\d{1,2}[-/]\d{4}/g, '') // Remove any other dates
          .replace(new RegExp(amountPattern, 'g'), '') // Remove amounts
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Clean up description - remove common table artifacts
        description = description
          .replace(/^\s*[A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+)*\s*/i, '') // Remove category at start
          .replace(/\s+/g, ' ')
          .trim();
        
        // If we have a valid transaction amount and description
        if (transactionAmount !== null && transactionAmount !== 0 && description.length > 0) {
          // Skip if description is too short (likely not a real transaction)
          if (description.length < 3) {
            skippedCount++;
            if (i < 10) {
              console.error(`  ⏭️ Skipped row ${i}: description too short: "${description}"`);
            }
            continue;
          }
          
          const category = categorizeTransaction(description);
          const type = transactionAmount > 0 ? 'income' : 'expense';
          
          transactions.push({
            date,
            description,
            amount: Math.abs(transactionAmount),
            type,
            category,
            bank: 'ING'
          });
          
          if (transactions.length <= 5) {
            console.error(`✅ Parsed transaction ${transactions.length}: ${date} | ${description.substring(0, 40)} | ${transactionAmount}`);
          }
        } else {
          skippedCount++;
          if (i < 10) {
            console.error(`  ⏭️ Skipped row ${i}:`, {
              dateStr,
              date,
              transactionAmount,
              description,
              amountMatches,
              fullLine: fullLine.substring(0, 100)
            });
          }
        }
      } else {
        skippedCount++;
        if (i < 10) {
          console.error(`  ⏭️ Skipped row ${i}: no amounts found`, { dateStr, line: line.substring(0, 80) });
        }
      }
    }
  }
  
  console.error(`✅ PDF parsing complete: ${transactions.length} transactions, ${skippedCount} skipped, ${processedCount} rows with dates`);
  
  if (transactions.length < 5) {
    const warningMsg = `⚠️ WARNING: Only parsed ${transactions.length} transactions from PDF!\n\nExpected more.\n\nProcessed: ${processedCount} rows with dates\nSkipped: ${skippedCount}\n\nFirst 30 lines:\n${lines.slice(0, 30).join('\n')}`;
    console.error('⚠️ WARNING:', warningMsg);
  }
  
  return transactions;
}

/**
 * Parse Sabadell bank statement
 */
function parseSabadellStatement(text) {
  const transactions = [];
  const lines = text.split('\n');
  
  // Sabadell format may vary, but typically: Date Description Amount
  const datePattern = /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/;
  const amountPattern = /[-+]?\d+[.,]\d{2}/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const dateMatch = line.match(datePattern);
    const amountMatches = line.match(new RegExp(amountPattern, 'g'));
    
    if (dateMatch && amountMatches) {
      const dateStr = dateMatch[1];
      const date = parseDate(dateStr);
      
      const amountStr = amountMatches[amountMatches.length - 1];
      const amount = parseAmount(amountStr);
      
      let description = line
        .replace(dateMatch[0], '')
        .replace(amountStr, '')
        .trim();
      
      description = description.replace(/\s+/g, ' ').trim();
      
      if (description && amount !== 0) {
        const category = categorizeTransaction(description);
        const type = amount > 0 ? 'income' : 'expense';
        
        transactions.push({
          date,
          description,
          amount: Math.abs(amount),
          type,
          category,
          bank: 'Sabadell'
        });
      }
    }
  }
  
  return transactions;
}

/**
 * Parse date string to YYYY-MM-DD format
 * Handles multiple date formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Trim whitespace
  dateStr = dateStr.trim();
  
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Handle DD-MM-YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[-/\.]/);
  
  if (parts.length === 3) {
    let day, month, year;
    
    // Try to detect format (DD-MM-YYYY vs YYYY-MM-DD)
    const firstPart = parts[0];
    const thirdPart = parts[2];
    
    if (firstPart.length === 4) {
      // YYYY-MM-DD format
      [year, month, day] = parts;
    } else {
      // DD-MM-YYYY format
      [day, month, year] = parts;
    }
    
    // Pad day and month with leading zeros
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    
    // Handle 2-digit year
    if (year.length === 2) {
      year = '20' + year;
    }
    
    // Validate date parts
    if (year.length === 4 && month.length === 2 && day.length === 2) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Try parsing as ISO date
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString().split('T')[0];
  }
  
  // Fallback to today's date
  console.warn(`⚠️ Could not parse date: "${dateStr}", using today's date`);
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse amount string to number
 * Handles both European (1.251,36) and US (1,251.36) formats
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  const str = amountStr.toString().trim();
  
  // Remove currency symbols and spaces
  let cleaned = str.replace(/[€$£\s]/g, '');
  
  // Detect format by checking if comma or dot appears last
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // European format: 1.251,36 -> remove dots, replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,251.36 -> remove commas
    cleaned = cleaned.replace(/,/g, '');
  }
  
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

/**
 * Categorize transaction based on description
 */
function categorizeTransaction(description) {
  const descLower = description.toLowerCase();
  
  // === INCOME & SALARY ===
  if (descLower.includes('salary') || descLower.includes('payroll') || 
      descLower.includes('nomina') || descLower.includes('nómina') ||
      descLower.includes('salario') || descLower.includes('sueldo')) {
    return 'Salary';
  }
  
  // === GROCERIES & SUPERMARKETS (Spanish) ===
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
      descLower.includes('cafe') || descLower.includes('cafeteria') ||
      descLower.includes('bar ') || descLower.includes('food') ||
      descLower.includes('mc donald') || descLower.includes('mcdonald') ||
      descLower.includes('burger king') || descLower.includes('kfc') ||
      descLower.includes('telepizza') || descLower.includes('domino') ||
      descLower.includes('starbucks') || descLower.includes('dunkin') ||
      descLower.includes('pollo campero') || descLower.includes('foodtruck') ||
      descLower.includes('panaderia') || descLower.includes('carnisseria') ||
      descLower.includes('tapa') || descLower.includes('cerveceria') ||
      descLower.includes('pizzeria') || descLower.includes('hamburgues')) {
    return 'Alimentación > Restaurante';
  }
  
  // === TRANSPORT & GAS ===
  if (descLower.includes('gas') || descLower.includes('gasolina') ||
      descLower.includes('petrol') || descLower.includes('repsol') ||
      descLower.includes('cepsa') || descLower.includes('bp ') ||
      descLower.includes('galp') || descLower.includes('shell')) {
    return 'Transporte > Gasolina';
  }
  
  if (descLower.includes('parking') || descLower.includes('peaje') ||
      descLower.includes('autopista') || descLower.includes('aparcament') ||
      descLower.includes('estacionamiento')) {
    return 'Transporte > Parking y peaje';
  }
  
  if (descLower.includes('transport') || descLower.includes('transporte') ||
      descLower.includes('uber') || descLower.includes('cabify') ||
      descLower.includes('taxi') || descLower.includes('metro') ||
      descLower.includes('renfe') || descLower.includes('fgc') ||
      descLower.includes('tmb')) {
    return 'Transporte > Transportes';
  }
  
  // === SHOPPING & RETAIL ===
  if (descLower.includes('zara') || descLower.includes('h&m') ||
      descLower.includes('mango') || descLower.includes('pull&bear') ||
      descLower.includes('bershka') || descLower.includes('stradivarius') ||
      descLower.includes('massimo dutti') || descLower.includes('primark')) {
    return 'Compras > Ropa';
  }
  
  if (descLower.includes('decathlon') || descLower.includes('sport') ||
      descLower.includes('gimnasio') || descLower.includes('gym') ||
      descLower.includes('fitness') || descLower.includes('club deportivo') ||
      descLower.includes('piscina') || descLower.includes('yoga') ||
      descLower.includes('pilates') || descLower.includes('crossfit')) {
    return 'Deporte > Deporte';
  }
  
  if (descLower.includes('amazon') || descLower.includes('aliexpress') ||
      descLower.includes('ebay') || descLower.includes('shop') ||
      descLower.includes('tienda') || descLower.includes('store') ||
      descLower.includes('ikea') || descLower.includes('leroy merlin') ||
      descLower.includes('media markt') || descLower.includes('mediamarkt') ||
      descLower.includes('fnac') || descLower.includes('worten') ||
      descLower.includes('compra tarj')) {
    return 'Compras > Compras';
  }
  
  // === ONLINE SERVICES & SUBSCRIPTIONS ===
  if (descLower.includes('spotify') || descLower.includes('netflix') ||
      descLower.includes('amazon prime') || descLower.includes('disney+') ||
      descLower.includes('hbo') || descLower.includes('youtube premium') ||
      descLower.includes('google one') || descLower.includes('icloud') ||
      descLower.includes('dropbox') || descLower.includes('chatgpt') ||
      descLower.includes('openai') || descLower.includes('notion') ||
      descLower.includes('canva') || descLower.includes('adobe') ||
      descLower.includes('microsoft 365') || descLower.includes('office 365')) {
    return 'Servicios > Servicios y productos online';
  }
  
  // === UTILITIES & BILLS ===
  if (descLower.includes('internet') || descLower.includes('fibra') ||
      descLower.includes('wifi')) {
    return 'Servicios > Internet';
  }
  
  if (descLower.includes('phone') || descLower.includes('telefono') ||
      descLower.includes('movistar') || descLower.includes('vodafone') ||
      descLower.includes('orange') || descLower.includes('yoigo') ||
      descLower.includes('jazztel') || descLower.includes('masmovil') ||
      descLower.includes('móvil')) {
    return 'Servicios > Móvil';
  }
  
  if (descLower.includes('television') || descLower.includes('televisión') ||
      descLower.includes('tv') || descLower.includes('canal+')) {
    return 'Servicios > Televisión';
  }
  
  if (descLower.includes('electric') || descLower.includes('electrica') ||
      descLower.includes('endesa') || descLower.includes('iberdrola') ||
      descLower.includes('naturgy') || descLower.includes('fenosa')) {
    return 'Servicios > Electricidad';
  }
  
  // === RENT & HOUSING ===
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
  
  // === INSURANCE ===
  if (descLower.includes('seguro')) {
    if (descLower.includes('auto') || descLower.includes('coche') || descLower.includes('vehiculo')) {
      return 'Seguros > Seguro auto';
    } else if (descLower.includes('salud') || descLower.includes('health') ||
               descLower.includes('sanitas') || descLower.includes('adeslas')) {
      return 'Seguros > Seguro salud';
    } else if (descLower.includes('hogar') || descLower.includes('home') || descLower.includes('casa')) {
      return 'Seguros > Seguro hogar';
    }
    return 'Seguros > Seguro salud'; // Default
  }
  
  if (descLower.includes('insurance') || descLower.includes('sanitas') ||
      descLower.includes('adeslas') || descLower.includes('asisa') ||
      descLower.includes('mutua') || descLower.includes('mapfre') ||
      descLower.includes('axa') || descLower.includes('allianz') ||
      descLower.includes('generali')) {
    return 'Seguros > Seguro salud';
  }
  
  // === HEALTHCARE & PHARMACY ===
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
  
  // === EDUCATION ===
  if (descLower.includes('libreria') || descLower.includes('librería') ||
      descLower.includes('bookstore') || descLower.includes('casa del libro')) {
    return 'Educación > Librería';
  }
  
  if (descLower.includes('escuela') || descLower.includes('escola') ||
      descLower.includes('colegio') || descLower.includes('universidad') ||
      descLower.includes('universitat') || descLower.includes('estudios') ||
      descLower.includes('education') || descLower.includes('academy') ||
      descLower.includes('academia') || descLower.includes('curso')) {
    return 'Educación > Estudios';
  }
  
  // === ENTERTAINMENT & LEISURE ===
  if (descLower.includes('cinema') || descLower.includes('cine') ||
      descLower.includes('theater') || descLower.includes('teatro') ||
      descLower.includes('teatre') || descLower.includes('museum') ||
      descLower.includes('museo') || descLower.includes('concert') ||
      descLower.includes('concierto') || descLower.includes('entrada') ||
      descLower.includes('ticket') || descLower.includes('espectaculo')) {
    return 'Ocio > Espectáculos';
  }
  
  if (descLower.includes('hotel') || descLower.includes('resort') ||
      descLower.includes('vacation') || descLower.includes('vacaciones') ||
      descLower.includes('viaje') || descLower.includes('travel') ||
      descLower.includes('vuelo') || descLower.includes('flight')) {
    return 'Ocio > Vacation';
  }
  
  if (descLower.includes('ocio') || descLower.includes('parque') ||
      descLower.includes('zoo') || descLower.includes('entretenimiento')) {
    return 'Ocio > Entretenimiento';
  }
  
  // === BANK FEES & CHARGES ===
  if (descLower.includes('comision') || descLower.includes('comisión') ||
      descLower.includes('bank fee') || descLower.includes('cargo banco') ||
      descLower.includes('mantenimiento') || descLower.includes('tarjeta anual')) {
    return 'Servicios > Cargos bancarios';
  }
  
  // === TAXES ===
  if (descLower.includes('impuesto') || descLower.includes('hacienda') ||
      descLower.includes('tax') || descLower.includes('iva') ||
      descLower.includes('agencia tributaria') || descLower.includes('ajuntament')) {
    return 'Organismos > Impuestos';
  }
  
  // === LOANS & FINANCING ===
  if (descLower.includes('prestamo') || descLower.includes('préstamo') ||
      descLower.includes('loan') || descLower.includes('financiera') ||
      descLower.includes('cetelem') || descLower.includes('credito') ||
      descLower.includes('crédito') || descLower.includes('cuota')) {
    return 'Finanzas > Préstamos';
  }
  
  // === TRANSFERS (should be excluded from budget) ===
  if (descLower.includes('transferencia') || descLower.includes('transfer') ||
      descLower.includes('traspaso') || descLower.includes('bizum')) {
    return 'Finanzas > Transferencias';
  }
  
  // === CASH WITHDRAWALS ===
  if (descLower.includes('cajero') || descLower.includes('atm') ||
      descLower.includes('efectivo') || descLower.includes('cash') ||
      descLower.includes('retirada') || descLower.includes('reintegro')) {
    return 'Finanzas > Efectivo';
  }
  
  // === FINTECH & DIGITAL WALLETS ===
  if (descLower.includes('revolut') || descLower.includes('n26') ||
      descLower.includes('paypal') || descLower.includes('verse') ||
      descLower.includes('wise')) {
    return 'Finanzas > Transferencias';
  }
  
  return 'Otros > Otros';
}

/**
 * Main function to parse PDF transactions
 */
export async function parsePDFTransactions(file) {
  console.error('🚀🚀🚀 parsePDFTransactions CALLED with file:', file.name);
  
  try {
    console.error('📄 Extracting text from PDF...');
    const text = await extractTextFromPDF(file);
    console.error('📄 PDF text extracted, length:', text.length);
    console.error('📄 First 500 chars:', text.substring(0, 500));
    
    const bank = detectBank(text);
    console.error('🏦 Detected bank:', bank);
    
    let transactions = [];
    
    if (bank === 'ING') {
      console.error('🏦 Using ING parser...');
      transactions = parseINGStatement(text);
    } else if (bank === 'Sabadell') {
      console.error('🏦 Using Sabadell parser...');
      transactions = parseSabadellStatement(text);
    } else {
      console.error('🏦 Bank unknown, using ING parser as fallback...');
      transactions = parseINGStatement(text); // Use ING parser as fallback
    }
    
    console.error(`✅ PDF parsing complete: ${transactions.length} transactions found`);
    
    return {
      bank,
      transactions,
      rawText: text
    };
  } catch (error) {
    console.error('❌ Error parsing PDF:', error);
    throw error;
  }
}

/**
 * Parse CSV file - detects format automatically
 */
export async function parseCSVTransactions(file) {
  console.error('🚀🚀🚀 parseCSVTransactions CALLED with file:', file.name, file.type);
  
  try {
    const text = await file.text();
    console.error('📖 File text read, length:', text.length);
    
    // Handle both Windows (\r\n) and Unix (\n) line endings
    // DON'T filter empty lines - we need to preserve line indices for header detection
    const lines = text.split(/\r?\n/);
    
    console.error(`📄 CSV file: ${file.name}, ${lines.length} lines`);
    console.error(`📄 First 5 lines with indices:`, lines.slice(0, 5).map((l, i) => `[${i}] ${l.substring(0, 80)}`));
    
    // Check if it's a credit card TEXT format (copy-paste) FIRST
    const isCreditCardText = detectSabadellCreditCardTextFormat(text, lines);
    if (isCreditCardText) {
      console.log('💳 Detected: Sabadell Credit Card TEXT format (copy-paste)');
      return parseSabadellCreditCardTextFormat(lines, text);
    }
    
    // Check if it's a credit card statement (CSV format)
    const isCreditCard = detectSabadellCreditCardFormat(text);
    
    if (isCreditCard) {
      console.log('💳 Detected: Sabadell Credit Card format');
      return parseSabadellCreditCard(lines, text);
    }
    
    // Check for Sabadell text format FIRST (copy-paste from website) - multi-line format
    const isSabadellTextFormat = detectSabadellTextFormat(text, lines);
    if (isSabadellTextFormat) {
      console.error('🏦 Detected: Sabadell Text format (copy-paste) - CALLING parseSabadellTextFormat');
      const result = parseSabadellTextFormat(lines);
      console.error(`✅ Sabadell Text parser returned ${result.transactions.length} transactions`);
      return result;
    }
    
    // Detect if it's a Sabadell statement (CSV format)
    const isSabadellFormat = detectSabadellFormat(text);
    
    if (isSabadellFormat) {
      console.log('🏦 Detected: Sabadell Bank format');
      return parseSabadellCSV(lines);
    }
    
    // Detect ING Spanish format (Movimientos de la Cuenta with F. VALOR header)
    console.error('🔍 Checking for ING formats...');
    console.error('🔍 Text preview:', text.substring(0, 200));
    console.error('🔍 First 10 lines:', lines.slice(0, 10));
    
    // Check for ING text format FIRST (copy-paste from website) - most specific format
    const isINGTextFormat = detectINGTextFormat(text, lines);
    if (isINGTextFormat) {
      console.error('🏦 Detected: ING Text format (copy-paste) - CALLING parseINGTextFormat');
      const result = parseINGTextFormat(lines);
      console.error(`✅ ING Text parser returned ${result.transactions.length} transactions`);
      return result;
    }
    
    // Check for tab-separated ING format (Fecha, Descripción, Importe, Saldo)
    // Only check if function exists to avoid errors
    if (typeof detectINGTabFormat === 'function') {
      const isINGTabFormat = detectINGTabFormat(text, lines);
      if (isINGTabFormat) {
        console.error('🏦 Detected: ING Tab-separated format - CALLING parseINGTabFormat');
        const result = parseINGTabFormat(lines);
        console.error(`✅ ING Tab parser returned ${result.transactions.length} transactions`);
        return result;
      }
    }
    
    const isINGSpanishFormat = detectINGSpanishFormat(text, lines);
    console.error('🔍 ING format detection result:', isINGSpanishFormat);
    
    if (isINGSpanishFormat) {
      console.error('🏦 Detected: ING Spanish format - CALLING parseINGSpanishCSV');
      const result = parseINGSpanishCSV(lines);
      console.error(`✅ ING parser returned ${result.transactions.length} transactions`);
      
      // Log warning if only 1 transaction
      if (result.transactions.length <= 1) {
        const errorMsg = `⚠️ WARNING: Only parsed ${result.transactions.length} transaction from ING CSV!\n\nExpected many more.\n\nCSV lines: ${lines.length}\nFirst 10 lines:\n${lines.slice(0, 10).join('\n')}`;
        console.error('❌ CRITICAL:', errorMsg);
      }
      
      return result;
    } else {
      console.error('❌ ING format NOT detected!');
      console.error('Text contains "movimientos":', text.toLowerCase().includes('movimientos'));
      console.error('Text contains "número de cuenta":', text.toLowerCase().includes('número de cuenta'));
    }
    
    // Try to detect other bank formats
    console.log('🔍 Checking for other bank formats...');
    const detectedFormat = detectBankFormat(text, lines);
    if (detectedFormat) {
      console.log(`🏦 Detected: ${detectedFormat.bank} format`);
      return parseDetectedFormat(lines, detectedFormat);
    }
    
    // Fall back to generic CSV parsing
    console.log('📋 Using generic CSV parser');
    return parseGenericCSV(lines);
  } catch (error) {
    console.error('❌ Error parsing CSV:', error);
    console.error('Error stack:', error.stack);
    // Return empty result instead of throwing
    return {
      bank: 'Unknown',
      transactions: [],
      error: error.message
    };
  }
}

/**
 * Detect if CSV is Sabadell CREDIT CARD statement
 */
function detectSabadellCreditCardFormat(text) {
  return text.includes('MOVIMIENTOS DE CREDITO') || 
         text.includes('Saldo dispuesto') ||
         text.includes('Límite de') ||
         text.includes('Forma pago mensual') ||
         (text.includes('VISA') && text.includes('Límite'));
}

/**
 * Detect Sabadell text format (copy-paste from website)
 * Format: Multi-line with header "Fecha	Descripción	Importe	Saldo" followed by alternating lines
 * Example:
 *   Fecha	Descripción	Importe	Saldo	
 *   06/11/2025
 *   SEGUROS SECURITAS DIRECT ESPANA S.A.U.
 *   -39,89 €
 *   Devolver
 *   -7,85 €
 */
function detectSabadellTextFormat(text, lines) {
  // Check for Sabadell header in first few lines
  let hasHeader = false;
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line && line.includes('Fecha') && line.includes('Descripción') && line.includes('Importe') && line.includes('Saldo')) {
      hasHeader = true;
      headerIndex = i;
      break;
    }
  }
  
  if (!hasHeader) {
    return false;
  }
  
  // Check for date pattern DD/MM/YYYY (Sabadell format) after header
  const hasSabadellDatePattern = /\d{2}\/\d{2}\/\d{4}/.test(text);
  
  // Check if it's multi-line format (not single-line CSV)
  // If header exists but next lines don't have tabs separating all fields, it's multi-line
  // Look at lines after header - if they're single values (dates, descriptions, amounts), it's multi-line
  let isMultiLine = false;
  if (headerIndex >= 0 && headerIndex + 1 < lines.length) {
    const nextLine = lines[headerIndex + 1].trim();
    // If next line is just a date (DD/MM/YYYY), it's multi-line format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(nextLine)) {
      isMultiLine = true;
    }
  }
  
  const result = hasHeader && hasSabadellDatePattern && isMultiLine;
  console.log('🔍 Sabadell Text format detection:', { hasHeader, hasSabadellDatePattern, isMultiLine, result });
  
  return result;
}

/**
 * Parse Sabadell text format (copy-paste from website)
 * Format: Multi-line where each transaction spans multiple lines:
 *   Fecha	Descripción	Importe	Saldo	
 *   06/11/2025
 *   SEGUROS SECURITAS DIRECT ESPANA S.A.U.
 *   -39,89 €
 *   Devolver (category)
 *   -7,85 € (balance)
 */
function parseSabadellTextFormat(lines) {
  console.error('📝 parseSabadellTextFormat CALLED with', lines.length, 'lines');
  
  const transactions = [];
  let lastBalance = null;
  let headerIndex = -1;
  
  // Find header row
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (line && line.includes('Fecha') && line.includes('Descripción') && line.includes('Importe') && line.includes('Saldo')) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    console.error('❌ No Sabadell header found');
    return {
      bank: 'Sabadell',
      accountNumber: null,
      lastBalance: null,
      transactions: []
    };
  }
  
  // Parse transactions starting after header
  let i = headerIndex + 1;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }
    
    // Check if this line is a date (DD/MM/YYYY format)
    const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})$/);
    
    if (dateMatch) {
      // Found a date line - start parsing transaction
      const dateStr = dateMatch[1];
      const parsedDate = parseSabadellDate(dateStr);
      
      if (!parsedDate) {
        console.warn(`⚠️ Could not parse date: "${dateStr}"`);
        i++;
        continue;
      }
      
      // Next line should be description
      i++;
      const description = i < lines.length ? lines[i].trim() : '';
      
      // Next line should be amount
      i++;
      const amountLine = i < lines.length ? lines[i].trim() : '';
      
      // Parse amount (can have negative sign)
      let amountStr = amountLine.replace(/[€\s]/g, '').trim();
      const isNegative = amountStr.startsWith('−') || amountStr.startsWith('-');
      amountStr = amountStr.replace(/[−-]/, '');
      const parsedAmount = parseAmount(amountStr);
      
      if (isNaN(parsedAmount) || parsedAmount === 0) {
        console.warn(`⚠️ Could not parse amount: "${amountLine}"`);
        i++;
        continue;
      }
      
      const finalAmount = isNegative ? -parsedAmount : parsedAmount;
      
      // Next line might be category (like "Devolver", "Ahorrar una parte") or balance
      i++;
      let category = '';
      let balanceStr = '';
      
      if (i < lines.length) {
        const nextLine = lines[i].trim();
        
        // Check if it's a balance (contains number with € or matches balance pattern)
        // Handle formats like: "308,95 €", "1.250,93 €", "308.95 €"
        const balanceMatch = nextLine.match(/([−-]?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*€/);
        const isBalancePattern = /^[−-]?\d+[.,]\d+\s*€?$/.test(nextLine) || 
                                  /^[−-]?\d{1,3}(\.\d{3})*,\d{2}\s*€?$/.test(nextLine); // Handles 1.250,93 € format
        
        if (balanceMatch || isBalancePattern) {
          // It's balance, not category
          balanceStr = nextLine;
        } else {
          // It's likely a category (like "Devolver", "Ahorrar una parte", "Fraccionar")
          // Check if it's a known category or short text (not a number)
          if (nextLine.length < 50 && !/^\d/.test(nextLine) && !nextLine.match(/^[−-]?\d/)) {
            category = nextLine;
            // Next line should be balance
            i++;
            balanceStr = i < lines.length ? lines[i].trim() : '';
          } else {
            // Might be balance without € symbol, check if it's a number
            const numMatch = nextLine.match(/^([−-]?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)$/);
            if (numMatch) {
              balanceStr = nextLine;
            } else {
              // Unknown format, skip this transaction
              console.warn(`⚠️ Unexpected format after amount: "${nextLine}"`);
              i++;
              continue;
            }
          }
        }
      }
      
      // Parse balance
      if (balanceStr) {
        const isBalanceNegative = balanceStr.startsWith('−') || balanceStr.startsWith('-');
        let cleanedBalance = balanceStr.replace(/[€\s]/g, '').trim();
        cleanedBalance = cleanedBalance.replace(/[−-]/, '');
        
        // Handle thousand separators (1.250,93 -> 1250.93)
        // Check if it has dots as thousand separators (European format)
        if (cleanedBalance.includes('.') && cleanedBalance.includes(',')) {
          // European format: 1.250,93
          cleanedBalance = cleanedBalance.replace(/\./g, '').replace(',', '.');
        }
        
        let parsedBalance = parseFloat(cleanedBalance);
        
        if (!isNaN(parsedBalance) && parsedBalance !== 0) {
          lastBalance = isBalanceNegative ? -parsedBalance : parsedBalance;
        }
      }
      
      // Map category or use smart categorization
      let mappedCategory = category || categorizeTransaction(description);
      
      transactions.push({
        bank: 'Sabadell',
        date: parsedDate,
        category: mappedCategory,
        description: description || 'Transaction',
        amount: Math.abs(finalAmount),
        type: finalAmount > 0 ? 'income' : 'expense'
      });
      
      continue;
    }
    
    i++;
  }
  
  console.error(`✅ Sabadell Text format parsed: ${transactions.length} transactions`);
  console.error(`📊 Last balance: ${lastBalance}`);
  
  return {
    bank: 'Sabadell',
    accountNumber: null,
    lastBalance: lastBalance,
    transactions
  };
}

/**
 * Detect if CSV is Sabadell bank format
 */
function detectSabadellFormat(text) {
  // Check for Sabadell-specific headers (comma-separated format)
  const hasCommaFormat = text.includes('F. Operativa') && 
                         text.includes('Concepto') && 
                         text.includes('F. Valor') &&
                         text.includes('Importe');
  
  // Check for tab-separated format (Fecha, Descripción, Importe, Saldo)
  const hasTabFormat = text.includes('Fecha') && 
                       text.includes('Descripción') && 
                       text.includes('Importe') &&
                       text.includes('Saldo');
  
  return hasCommaFormat || hasTabFormat;
}

/**
 * Detect ING Spanish CSV format (Movimientos de la Cuenta)
 */
function detectINGSpanishFormat(text, lines) {
  const textLower = text.toLowerCase();
  
  // Check for ING-specific indicators
  const hasMovimientos = textLower.includes('movimientos de la cuenta') || 
                         textLower.includes('número de cuenta');
  
  // Look for the specific header row - check first 15 lines (more than before)
  let foundHeader = false;
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    if (!line) continue; // Skip empty lines
    
    const lineLower = line.toLowerCase();
    if (lineLower.includes('f. valor') && 
        lineLower.includes('categoría') && 
        lineLower.includes('importe')) {
      foundHeader = true;
      break;
    }
  }
  
  const result = hasMovimientos && foundHeader;
  console.log('🔍 ING format detection:', { hasMovimientos, foundHeader, result });
  
  return result;
}

/**
 * Parse ING Spanish CSV format
 * Format: F. VALOR,CATEGORÍA,SUBCATEGORÍA,DESCRIPCIÓN,COMENTARIO,IMAGEN,IMPORTE (€),SALDO (€)
 */
function parseINGSpanishCSV(lines) {
  console.error('🔵🔵🔵 parseINGSpanishCSV CALLED with', lines.length, 'lines');
  
  const transactions = [];
  let accountNumber = '';
  let lastBalance = null;
  let headerRowIndex = -1;
  
  // Find header row and account number - check more lines
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    
    // Extract account number from first line
    if (i === 0 && line.includes('Número de cuenta:')) {
      const accountMatch = line.match(/Número de cuenta:\s*([\d\s]+)/);
      if (accountMatch) {
        accountNumber = accountMatch[1].replace(/\s/g, '');
        console.log('✅ Found account number:', accountNumber);
      }
    }
    
    // Find header row
    const lineLower = line.toLowerCase();
    if (lineLower.includes('f. valor') && 
        lineLower.includes('categoría') && 
        lineLower.includes('importe')) {
      headerRowIndex = i;
      console.error('✅ Found header row at index:', i, 'Content:', line.substring(0, 100));
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    console.error('❌ Could not find ING header row');
    console.error('First 10 lines:', lines.slice(0, 10));
    return {
      bank: 'ING',
      transactions: []
    };
  }
  
  // Parse header row to get column indices
  const headerRow = lines[headerRowIndex];
  const headers = parseCSVLine(headerRow);
  
  console.error('📋 ING CSV Headers:', headers);
  console.error('📋 Header row index:', headerRowIndex);
  console.error('📋 Total lines:', lines.length);
  
  const dateColumn = headers.findIndex(h => {
    const hLower = h.toLowerCase();
    return hLower.includes('f. valor') || hLower.includes('fecha') || hLower.includes('f.operativa');
  });
  const categoryColumn = headers.findIndex(h => {
    const hLower = h.toLowerCase();
    return hLower.includes('categoría') || hLower.includes('categoria');
  });
  const descriptionColumn = headers.findIndex(h => {
    const hLower = h.toLowerCase();
    return hLower.includes('descripción') || hLower.includes('descripcion') || hLower.includes('concepto');
  });
  const amountColumn = headers.findIndex(h => {
    const hLower = h.toLowerCase();
    return hLower.includes('importe') || hLower.includes('amount') || hLower.includes('cantidad');
  });
  const balanceColumn = headers.findIndex(h => {
    const hLower = h.toLowerCase();
    return hLower.includes('saldo') || hLower.includes('balance');
  });
  
  console.error('📍 Column indices:', {
    dateColumn,
    categoryColumn,
    descriptionColumn,
    amountColumn,
    balanceColumn
  });
  
  if (dateColumn === -1 || amountColumn === -1) {
    console.error('❌ Missing required columns:', { dateColumn, amountColumn });
    return {
      bank: 'ING',
      transactions: []
    };
  }
  
  // Parse transactions
  let skippedCount = 0;
  let processedCount = 0;
  let validCount = 0;
  
  console.error(`🔄 Starting to parse transactions from line ${headerRowIndex + 1} to ${lines.length - 1}`);
  
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    
    processedCount++;
    
    // Skip truly empty lines
    if (!line) {
      if (i <= headerRowIndex + 5 || i >= lines.length - 3) {
        console.error(`Row ${i}: Empty line, skipping`);
      }
      continue;
    }
    
    const fields = parseCSVLine(line);
    
    // Debug: log first 10 rows and last 5 rows in detail
    if (i <= headerRowIndex + 10 || i >= lines.length - 5) {
      console.error(`Row ${i}: ${fields.length} fields`, {
        raw: line.substring(0, 80),
        fields: fields.slice(0, 8),
        dateCol: dateColumn,
        descCol: descriptionColumn,
        amountCol: amountColumn
      });
    }
    
    // Skip if not enough columns
    const maxColumn = Math.max(dateColumn, descriptionColumn, amountColumn);
    if (fields.length <= maxColumn) {
      skippedCount++;
      if (i <= headerRowIndex + 10 || i >= lines.length - 5) {
        console.error(`  ❌ Skipped row ${i}: not enough columns (have ${fields.length}, need ${maxColumn + 1})`);
      }
      continue;
    }
    
    const dateStr = fields[dateColumn]?.trim();
    const category = fields[categoryColumn]?.trim() || '';
    const description = fields[descriptionColumn]?.trim() || '';
    const amountStr = fields[amountColumn]?.trim();
    const balanceStr = balanceColumn >= 0 ? fields[balanceColumn]?.trim() : null;
    
    // Skip if missing required fields (date and amount are required, description can be empty)
    if (!dateStr || !amountStr) {
      skippedCount++;
      if (i <= headerRowIndex + 10 || i >= lines.length - 5) {
        console.error(`  ❌ Skipped row ${i}: missing date or amount`, { 
          dateStr, 
          amountStr, 
          description: description.substring(0, 30),
          fieldsLength: fields.length
        });
      }
      continue;
    }
    
    // Use description or generate one if empty
    const finalDescription = description || `Transaction ${dateStr}`;
    
    // Parse date (DD/MM/YYYY format)
    const parsedDate = parseDate(dateStr);
    
    // Validate parsed date format before proceeding
    if (!parsedDate || !/^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
      skippedCount++;
      if (i <= headerRowIndex + 10 || i >= lines.length - 5) {
        console.error(`  ❌ Skipped row ${i}: invalid date format: "${dateStr}" -> "${parsedDate}"`);
      }
      continue;
    }
    
    // Parse amount (can be negative)
    const parsedAmount = parseAmount(amountStr);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      skippedCount++;
      if (i <= headerRowIndex + 10 || i >= lines.length - 5) {
        console.error(`  ❌ Skipped row ${i}: invalid amount`, { amountStr, parsedAmount });
      }
      continue;
    }
    
    validCount++;
    
    // Determine type from amount sign
    const type = parsedAmount > 0 ? 'income' : 'expense';
    
    // Store last balance (first valid one)
    if (balanceStr && lastBalance === null) {
      const parsedBalance = parseAmount(balanceStr);
      if (!isNaN(parsedBalance)) {
        lastBalance = parsedBalance;
      }
    }
    
    // Map ING categories to our categories
    let mappedCategory = category;
    if (category) {
      const categoryLower = category.toLowerCase();
      
      // Map ING categories to our system
      if (categoryLower.includes('alimentación') || categoryLower.includes('supermercado')) {
        mappedCategory = 'Food & Dining';
      } else if (categoryLower.includes('vehículo') || categoryLower.includes('transporte')) {
        mappedCategory = 'Transportation';
      } else if (categoryLower.includes('hogar')) {
        mappedCategory = 'Housing';
      } else if (categoryLower.includes('compras')) {
        mappedCategory = 'Shopping';
      } else if (categoryLower.includes('ocio') || categoryLower.includes('viajes')) {
        mappedCategory = 'Entertainment';
      } else if (categoryLower.includes('ingresos')) {
        mappedCategory = 'Ingresos';
      } else if (categoryLower.includes('transferencia')) {
        mappedCategory = 'Transferencias';
      } else {
        // Use smart categorization
        mappedCategory = categorizeTransaction(finalDescription);
      }
    } else {
      mappedCategory = categorizeTransaction(finalDescription);
    }
    
    transactions.push({
      bank: 'ING',
      date: parsedDate,
      category: mappedCategory,
      description: finalDescription,
      amount: Math.abs(parsedAmount),
      type: type
    });
  }
  
  console.error(`✅ ING CSV parsed: ${transactions.length} transactions`);
  console.error(`📊 Summary: ${validCount} valid, ${skippedCount} skipped, ${processedCount} rows processed`);
  console.error(`📊 Header at row ${headerRowIndex}, parsing from row ${headerRowIndex + 1} to ${lines.length - 1}`);
  console.error(`📊 ING Parse Summary: Valid: ${validCount}, Skipped: ${skippedCount}, Processed: ${processedCount}, Saved: ${transactions.length}`);
  
  if (transactions.length === 0) {
    console.error('❌ No transactions parsed from ING CSV!');
    console.error('Check column indices:', {
      dateColumn,
      categoryColumn,
      descriptionColumn,
      amountColumn,
      balanceColumn
    });
    console.error('First 15 lines:', lines.slice(0, 15));
  } else if (transactions.length === 1) {
    console.error('⚠️ WARNING: Only parsed 1 transaction from ING CSV! Expected many more.');
    console.error(`Processed ${processedCount} rows, skipped ${skippedCount}, valid ${validCount}`);
    console.error('CSV lines:', lines.length);
    console.error('Header row index:', headerRowIndex);
    console.error('First 15 lines:', lines.slice(0, 15));
    console.error('Sample parsed transaction:', transactions[0]);
    
    // Show what columns we're extracting
    console.error('Column extraction test - row 5 (first transaction):');
    if (lines.length > headerRowIndex + 1) {
      const testLine = lines[headerRowIndex + 1];
      const testFields = parseCSVLine(testLine);
      console.error('Test line:', testLine.substring(0, 100));
      console.error('Test fields:', testFields);
      console.error('Extracted:', {
        date: testFields[dateColumn],
        description: testFields[descriptionColumn],
        amount: testFields[amountColumn]
      });
    }
  }
  
  return {
    bank: 'ING',
    accountNumber: accountNumber || null,
    lastBalance: lastBalance,
    transactions
  };
}

/**
 * Detect ING text format (copy-paste from website)
 * Format: Date line, Description, Category, Amount, "Balance en cuenta tras este movimiento"
 */
function detectINGTextFormat(text, lines) {
  const textLower = text.toLowerCase();
  
  // Check for key indicators
  const hasBalanceLine = textLower.includes('balance en cuenta tras este movimiento');
  const hasImporte = textLower.includes('importe:');
  const hasSpanishMonths = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(text);
  
  // Check if we have date patterns like "5 de noviembre de 2025"
  const hasSpanishDatePattern = /\d+\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}/i.test(text);
  
  const result = hasBalanceLine && hasImporte && (hasSpanishMonths || hasSpanishDatePattern);
  console.log('🔍 ING Text format detection:', { hasBalanceLine, hasImporte, hasSpanishMonths, hasSpanishDatePattern, result });
  
  return result;
}

/**
 * Parse Spanish date string like "5 de noviembre de 2025" or "miércoles, 5 de noviembre de 2025"
 */
function parseSpanishDate(dateStr) {
  if (!dateStr) return null;
  
  const months = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
  };
  
  // Remove day names (lunes, martes, etc.) and "Ayer"
  let cleaned = dateStr.trim();
  cleaned = cleaned.replace(/^(ayer|hoy|mañana|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miércoles|jueves|viernes|sábado|domingo)[,\s]*/i, '');
  
  // Match pattern: "5 de noviembre de 2025" or "04 de noviembre de 2025"
  const match = cleaned.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i);
  
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2].toLowerCase()];
    const year = match[3];
    
    if (month && day && year) {
      return `${year}-${month}-${day}`;
    }
  }
  
  // Try fallback parsing
  return parseDate(dateStr);
}

/**
 * Parse ING text format (copy-paste from website)
 * Format example:
 *   miércoles, 5 de noviembre de 2025
 *   Transferencia recibida de JOE YAROLAV QUIJANO Y SAUMET
 *   ING transfer
 *   400,00 €
 *   Importe: 400,00 €
 *   76,69 €
 *   Balance en cuenta tras este movimiento: 76,69 €
 */
function parseINGTextFormat(lines) {
  console.error('📝 parseINGTextFormat CALLED with', lines.length, 'lines');
  
  const transactions = [];
  let lastBalance = null;
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }
    
    // Skip day names like "Ayer", "hoy", "mañana"
    if (/^(ayer|hoy|mañana)$/i.test(line)) {
      i++;
      continue;
    }
    
    // Skip date lines without year (like "martes, 04 de noviembre")
    // We'll use the next line which has the full date with year
    const dateWithoutYearMatch = line.match(/(lunes|martes|miércoles|jueves|viernes|sábado|domingo)[,\s]+\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)$/i);
    if (dateWithoutYearMatch && !line.match(/\d{4}/)) {
      i++;
      continue;
    }
    
    // Check if this line is a date (contains Spanish month WITH year)
    const dateMatch = line.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i);
    
    if (dateMatch) {
      // Found a date line - start parsing transaction
      const dateStr = line;
      const parsedDate = parseSpanishDate(dateStr);
      
      if (!parsedDate) {
        console.warn(`⚠️ Could not parse date: "${dateStr}"`);
        i++;
        continue;
      }
      
      // Next line should be description
      i++;
      const description = i < lines.length ? lines[i].trim() : '';
      
      // Next line should be category
      i++;
      const category = i < lines.length ? lines[i].trim() : '';
      
      // Next line should be amount
      i++;
      let amountLine = i < lines.length ? lines[i].trim() : '';
      
      // Skip if this line is "Importe:" - the actual amount should be on the previous structure
      // But sometimes the format might have amount on a different line
      // Check if current line starts with "Importe:" - if so, we might have missed the amount
      if (amountLine.toLowerCase().startsWith('importe:')) {
        // Try to extract amount from "Importe: X €" line
        const importeMatch = amountLine.match(/importe:\s*([−-]?\d+[.,]\d+)/i);
        if (importeMatch) {
          amountLine = importeMatch[1];
        } else {
          // Skip this line and try next line
          i++;
          amountLine = i < lines.length ? lines[i].trim() : '';
        }
      }
      
      // Parse amount (can have negative sign or minus symbol)
      let amountStr = amountLine.replace(/[€\s]/g, '').trim();
      const isNegative = amountStr.startsWith('−') || amountStr.startsWith('-');
      amountStr = amountStr.replace(/[−-]/, '');
      const parsedAmount = parseAmount(amountStr);
      
      if (isNaN(parsedAmount) || parsedAmount === 0) {
        console.warn(`⚠️ Could not parse amount: "${amountLine}"`);
        i++;
        continue;
      }
      
      const finalAmount = isNegative ? -parsedAmount : parsedAmount;
      
      // Skip "Importe: X €" line if we haven't already
      i++;
      if (i < lines.length && lines[i].toLowerCase().includes('importe:')) {
        i++;
      }
      
      // Get balance - could be on separate line or in "Balance en cuenta" line
      i++;
      let balanceStr = i < lines.length ? lines[i].trim() : '';
      let parsedBalance = null;
      
      // Check if this line contains "Balance en cuenta" - extract balance from it
      if (balanceStr.toLowerCase().includes('balance en cuenta')) {
        const balanceMatch = balanceStr.match(/([−-]?\d+[.,]\d+)/);
        if (balanceMatch) {
          balanceStr = balanceMatch[1];
        }
      }
      
      // Parse balance
      const isBalanceNegative = balanceStr.startsWith('−') || balanceStr.startsWith('-');
      balanceStr = balanceStr.replace(/[€\s−-]/g, '').trim();
      parsedBalance = parseAmount(balanceStr);
      
      if (!isNaN(parsedBalance) && parsedBalance !== 0) {
        lastBalance = isBalanceNegative ? -parsedBalance : parsedBalance;
      }
      
      // Skip "Balance en cuenta tras este movimiento" line if we haven't already processed it
      i++;
      if (i < lines.length && lines[i].toLowerCase().includes('balance en cuenta tras este movimiento')) {
        // Try to extract balance from this line if we didn't get it before
        if (isNaN(parsedBalance) || parsedBalance === 0) {
          const balanceLine = lines[i];
          const balanceMatch = balanceLine.match(/([−-]?\d+[.,]\d+)/);
          if (balanceMatch) {
            let extractedBalance = balanceMatch[1];
            const isNeg = extractedBalance.startsWith('−') || extractedBalance.startsWith('-');
            extractedBalance = extractedBalance.replace(/[−-]/g, '');
            const parsed = parseAmount(extractedBalance);
            if (!isNaN(parsed) && parsed !== 0) {
              lastBalance = isNeg ? -parsed : parsed;
            }
          }
        }
        i++;
      }
      
      // Map category
      let mappedCategory = category;
      if (category) {
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('transferencia') || categoryLower.includes('transfer')) {
          mappedCategory = 'Transferencias';
        } else if (categoryLower.includes('suscripciones') || categoryLower.includes('subscription')) {
          mappedCategory = 'Subscriptions';
        } else if (categoryLower.includes('parking') || categoryLower.includes('garaje')) {
          mappedCategory = 'Transportation';
        } else if (categoryLower.includes('préstamo') || categoryLower.includes('prestamo')) {
          mappedCategory = 'Loans';
        } else if (categoryLower.includes('inversiones') || categoryLower.includes('fondos')) {
          mappedCategory = 'Investments';
        } else if (categoryLower.includes('comisión') || categoryLower.includes('comision')) {
          mappedCategory = 'Fees';
        } else {
          mappedCategory = categorizeTransaction(description);
        }
      } else {
        mappedCategory = categorizeTransaction(description);
      }
      
      transactions.push({
        bank: 'ING',
        date: parsedDate,
        category: mappedCategory,
        description: description || 'Transaction',
        amount: Math.abs(finalAmount),
        type: finalAmount > 0 ? 'income' : 'expense'
      });
      
      continue;
    }
    
    i++;
  }
  
  console.error(`✅ ING Text format parsed: ${transactions.length} transactions`);
  console.error(`📊 Last balance: ${lastBalance}`);
  
  return {
    bank: 'ING',
    accountNumber: null,
    lastBalance: lastBalance,
    transactions
  };
}

/**
 * Parse Sabadell bank CSV/Excel export
 */
function parseSabadellCSV(lines) {
  const transactions = [];
  let accountNumber = '';
  let headerRowIndex = -1;
  let lastBalance = null; // Store the balance from CSV (first valid one = most recent)
  let balanceFound = false; // Flag to capture only the first balance
  
  // Find account number and header row
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Extract account number
    if (line.includes('Cuenta:')) {
      const match = line.match(/ES\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/);
      if (match) {
        accountNumber = match[0].replace(/\s/g, '');
      }
    }
    
    // Find header row - check for both formats
    if (line.includes('F. Operativa') && line.includes('Concepto')) {
      headerRowIndex = i;
      break;
    } else if (line.includes('Fecha') && line.includes('Descripción') && line.includes('Importe')) {
      // Tab-separated format: Fecha, Descripción, Importe, Saldo
      headerRowIndex = i;
      break;
    }
  }
  
  // Parse transactions starting after header
  if (headerRowIndex === -1) {
    console.error('❌ No Sabadell header row found');
    return {
      bank: 'Sabadell',
      accountNumber: accountNumber,
      lastBalance: null,
      transactions: []
    };
  }
  
  // Detect format by checking header row
  const headerRow = lines[headerRowIndex];
  const isTabFormat = headerRow.includes('Fecha') && headerRow.includes('Descripción');
  
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = parseCSVLine(line); // parseCSVLine handles both commas and tabs
    
    if (isTabFormat) {
      // Tab-separated format: Fecha, Descripción, Importe, Saldo
      if (fields.length >= 3) {
        const dateStr = fields[0]?.trim();
        const description = fields[1]?.trim();
        const amountStr = fields[2]?.trim();
        const balanceStr = fields.length > 3 ? fields[3]?.trim() : null;
        
        // Skip rows that are just category tags (Devolver, Ahorrar una parte, etc.)
        if (description && (description === 'Devolver' || description === 'Ahorrar una parte' || description.length < 3)) {
          continue;
        }
        
        // Parse date (DD/MM/YYYY format)
        const parsedDate = parseSabadellDate(dateStr);
        
        // Parse amount (e.g., "-39,89 €" or "290,00 €")
        const parsedAmount = parseAmount(amountStr);
        
        // Skip if amount is 0 or invalid
        if (parsedAmount === 0 || isNaN(parsedAmount) || !dateStr || !description) {
          continue;
        }
        
        // Store FIRST balance only (most recent transaction, usually at top)
        if (balanceStr && !balanceFound) {
          const parsedBalance = parseAmount(balanceStr);
          if (!isNaN(parsedBalance)) {
            lastBalance = parsedBalance;
            balanceFound = true;
          }
        }
        
        const transaction = {
          bank: 'Sabadell',
          date: parsedDate,
          category: categorizeSabadellTransaction(description),
          description: description,
          amount: Math.abs(parsedAmount),
          type: parsedAmount > 0 ? 'income' : 'expense'
        };
        
        transactions.push(transaction);
      }
    } else {
      // Comma-separated format: F.Operativa, Concepto, F.Valor, Importe, Saldo, Ref1, Ref2
      if (fields.length >= 4) {
        const operationDate = fields[0]; // F. Operativa
        const concept = fields[1];        // Concepto
        const valueDate = fields[2];      // F. Valor
        const amount = fields[3];         // Importe
        const balance = fields[4];        // Saldo
        
        // Store FIRST balance only (most recent transaction, usually at top of CSV)
        if (balance && !balanceFound) {
          const parsedBalance = parseAmount(balance);
          if (!isNaN(parsedBalance)) {
            lastBalance = parsedBalance;
            balanceFound = true; // Don't update balance again
          }
        }
        
        if (operationDate && amount && concept) {
          const parsedAmount = parseAmount(amount);
          
          // Skip if amount is 0 or invalid
          if (parsedAmount === 0 || isNaN(parsedAmount)) continue;
          
          const transaction = {
            bank: 'Sabadell',
            date: parseSabadellDate(operationDate),
            category: categorizeSabadellTransaction(concept),
            description: cleanSabadellDescription(concept),
            amount: Math.abs(parsedAmount),
            type: parsedAmount > 0 ? 'income' : 'expense'
          };
          
          transactions.push(transaction);
        }
      }
    }
  }
  
  return {
    bank: 'Sabadell',
    accountNumber: accountNumber,
    lastBalance: lastBalance, // Include last balance from CSV
    transactions
  };
}

/**
 * Parse Sabadell date format (DD/MM/YYYY)
 */
function parseSabadellDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    let [day, month, year] = parts;
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return parseDate(dateStr);
}

/**
 * Clean Sabadell transaction description
 */
function cleanSabadellDescription(description) {
  if (!description) return '';
  
  // Remove card numbers (5402XXXXXXXX4016)
  let cleaned = description.replace(/\d{4}X+\d{4}/g, '');
  
  // Remove location suffixes (e.g., -VILANOVA I LA)
  cleaned = cleaned.replace(/-[A-Z\s]+$/i, '');
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Categorize Sabadell transactions to match Spanish budget categories
 */
function categorizeSabadellTransaction(description) {
  const descLower = description.toLowerCase();
  
  // Transfers
  if (descLower.includes('traspaso')) {
    return 'Transferencias';
  }
  
  // Bizum payments
  if (descLower.includes('bizum')) {
    return 'Transferencias';
  }
  
  // Card purchases
  if (descLower.includes('compra tarj')) {
    // Groceries / Supermercado
    if (descLower.includes('mercadona') || descLower.includes('lidl') || 
        descLower.includes('aldi') || descLower.includes('guissona') ||
        descLower.includes('hiper garraf') || descLower.includes('fruta')) {
      return 'Supermercado';
    }
    
    // Restaurants
    if (descLower.includes('restaurant') || descLower.includes('bar ') ||
        descLower.includes('mcdonald') || descLower.includes('heladeria') ||
        descLower.includes('pizz') || descLower.includes('cafe')) {
      return 'Restaurante';
    }
    
    // Transport/Parking
    if (descLower.includes('aparcament') || descLower.includes('parking') ||
        descLower.includes('peaje')) {
      return 'Parking y peaje';
    }
    
    // Gas/Gasolina
    if (descLower.includes('gas station') || descLower.includes('repsol') ||
        descLower.includes('cepsa') || descLower.includes('bp ')) {
      return 'Gasolina';
    }
    
    // Entertainment/Subscriptions
    if (descLower.includes('disney') || descLower.includes('netflix')) {
      return 'Televisión';
    }
    
    if (descLower.includes('oculus') || descLower.includes('google one') ||
        descLower.includes('google*gsuite')) {
      return 'Servicios y productos online';
    }
    
    // Sports/Gym
    if (descLower.includes('aqua sport') || descLower.includes('sport')) {
      return 'Deporte';
    }
    
    // Beauty
    if (descLower.includes('peluquer') || descLower.includes('belleza')) {
      return 'Belleza';
    }
    
    // Pharmacy
    if (descLower.includes('pharmac') || descLower.includes('farmaci')) {
      return 'Farmacia';
    }
    
    // Clothing
    if (descLower.includes('ropa') || descLower.includes('zara') ||
        descLower.includes('h&m')) {
      return 'Ropa';
    }
    
    // Electronics
    if (descLower.includes('electronic') || descLower.includes('amazon') ||
        descLower.includes('media markt')) {
      return 'Electrónica';
    }
    
    // Home/Hogar
    if (descLower.includes('ikea') || descLower.includes('decor') ||
        descLower.includes('muebl')) {
      return 'Hogar';
    }
    
    // Flowers/Plants
    if (descLower.includes('flor') || descLower.includes('plant')) {
      return 'Regalos';
    }
    
    // Use smart categorization instead of generic "Otras compras"
    return categorizeTransaction(description);
  }
  
  // Direct debits (ADEUDO RECIBO)
  if (descLower.includes('adeudo recibo')) {
    // Health insurance
    if (descLower.includes('sanitas')) return 'Seguro salud';
    
    // Sports/Gym
    if (descLower.includes('aqua sport') || descLower.includes('gym')) return 'Deporte';
    
    // Community fees
    if (descLower.includes('aram residencial') || descLower.includes('comunidad')) {
      return 'Comunidad';
    }
    
    // Wave surf school
    if (descLower.includes('wave')) return 'Otros salud, saber y deporte';
    
    return 'Otros servicios';
  }
  
  // Education (Estudios)
  if (descLower.includes('estudios') || descLower.includes('escola')) {
    return 'Estudios';
  }
  
  // Financing/Loans (Préstamos)
  if (descLower.includes('financiera') || descLower.includes('cetelem') ||
      descLower.includes('santander consumer') || descLower.includes('credipago')) {
    return 'Préstamos';
  }
  
  // Utilities - Phone/Mobile
  if (descLower.includes('telefono') || descLower.includes('o2 fibra') ||
      descLower.includes('movil') || descLower.includes('movistar')) {
    return 'Móvil';
  }
  
  // Utilities - Internet
  if (descLower.includes('internet') && !descLower.includes('telefono')) {
    return 'Internet';
  }
  
  // Utilities - Electricity
  if (descLower.includes('electric') || descLower.includes('endesa') ||
      descLower.includes('iberdrola')) {
    return 'Electricidad';
  }
  
  // Utilities - Water
  if (descLower.includes('agua') || descLower.includes('water')) {
    return 'Agua';
  }
  
  // Insurance/Security - Alarmas
  if (descLower.includes('securitas') || descLower.includes('alarm')) {
    return 'Alarmas y seguridad';
  }
  
  // Insurance - Health
  if (descLower.includes('seguro') && descLower.includes('salud')) {
    return 'Seguro salud';
  }
  
  // Insurance - Home
  if (descLower.includes('seguro') && descLower.includes('hogar')) {
    return 'Seguro hogar';
  }
  
  // Insurance - Auto
  if (descLower.includes('seguro') && (descLower.includes('auto') || descLower.includes('coche'))) {
    return 'Seguro auto';
  }
  
  // Taxes (Impuestos)
  if (descLower.includes('impuestos') || descLower.includes('aj. vilanova')) {
    return 'Impuestos';
  }
  
  // Municipality (Ayuntamiento)
  if (descLower.includes('ayuntamiento')) {
    return 'Ayuntamiento';
  }
  
  // Savings (Ahorro)
  if (descLower.includes('ahorro')) {
    return 'Efectivo';
  }
  
  // Bank commissions
  if (descLower.includes('comisión') || descLower.includes('comision')) {
    return 'Cargos bancarios';
  }
  
  // Vehicle maintenance
  if (descLower.includes('taller') || descLower.includes('reparaci') ||
      descLower.includes('mecanico')) {
    return 'Mantenimiento vehículo';
  }
  
  // Home maintenance
  if (descLower.includes('fontaner') || descLower.includes('carpinter') ||
      descLower.includes('mantenimiento')) {
    return 'Mantenimiento hogar';
  }
  
  // Use smart categorization as final fallback
  return categorizeTransaction(description);
}

/**
 * Detect bank format from CSV headers/content
 */
function detectBankFormat(text, lines) {
  const textLower = text.toLowerCase();
  const firstFewLines = lines.slice(0, 10).join('\n').toLowerCase();
  
  // Try to find header row
  let headerRowIndex = -1;
  let headerRow = '';
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase();
    // Common header patterns
    if (line.includes('date') || line.includes('fecha') || line.includes('f. operativa') ||
        line.includes('transaction date') || line.includes('fecha operativa')) {
      headerRowIndex = i;
      headerRow = lines[i];
      break;
    }
  }
  
  if (headerRowIndex === -1) return null;
  
  const headers = parseCSVLine(headerRow);
  const headerLower = headerRow.toLowerCase();
  
  // Detect format based on header combinations
  const format = {
    headerRowIndex,
    headers,
    bank: 'Unknown',
    dateColumn: -1,
    descriptionColumn: -1,
    amountColumn: -1,
    balanceColumn: -1,
    typeColumn: -1
  };
  
  // Find column indices
  headers.forEach((header, index) => {
    const h = header.toLowerCase();
    if (h.includes('date') || h.includes('fecha') || h.includes('f. operativa') || h.includes('operation date')) {
      format.dateColumn = index;
    }
    if (h.includes('description') || h.includes('descripcion') || h.includes('concepto') || 
        h.includes('details') || h.includes('memo') || h.includes('narrative')) {
      format.descriptionColumn = index;
    }
    if (h.includes('amount') || h.includes('importe') || h.includes('value') || 
        h.includes('balance') || h.includes('saldo')) {
      if (h.includes('balance') || h.includes('saldo')) {
        format.balanceColumn = index;
      } else {
        format.amountColumn = index;
      }
    }
    if (h.includes('type') || h.includes('tipo') || h.includes('category') || h.includes('categoria')) {
      format.typeColumn = index;
    }
  });
  
  // Detect bank from content
  if (textLower.includes('ing') || textLower.includes('ing bank')) {
    format.bank = 'ING';
  } else if (textLower.includes('sabadell') || textLower.includes('banco sabadell')) {
    format.bank = 'Sabadell';
  } else if (textLower.includes('santander') || textLower.includes('banco santander')) {
    format.bank = 'Santander';
  } else if (textLower.includes('bbva') || textLower.includes('banco bilbao')) {
    format.bank = 'BBVA';
  } else if (textLower.includes('caixa') || textLower.includes('la caixa')) {
    format.bank = 'CaixaBank';
  } else if (textLower.includes('bankia') || textLower.includes('unicaja')) {
    format.bank = 'Bankia';
  } else {
    format.bank = 'Unknown';
  }
  
  // Check if we have minimum required columns
  if (format.dateColumn === -1 || format.amountColumn === -1) {
    return null;
  }
  
  return format;
}

/**
 * Parse CSV using detected format
 */
function parseDetectedFormat(lines, format) {
  const transactions = [];
  let accountNumber = '';
  let lastBalance = null;
  let balanceFound = false;
  
  // Look for account number in first few lines
  for (let i = 0; i < Math.min(format.headerRowIndex, 10); i++) {
    const line = lines[i];
    const accountMatch = line.match(/ES\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/);
    if (accountMatch) {
      accountNumber = accountMatch[0].replace(/\s/g, '');
      break;
    }
  }
  
  // Parse transactions starting after header
  for (let i = format.headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = parseCSVLine(line);
    
    // Check if we have enough fields
    const maxColumn = Math.max(
      format.dateColumn,
      format.descriptionColumn,
      format.amountColumn,
      format.balanceColumn || 0,
      format.typeColumn || 0
    );
    
    if (fields.length <= maxColumn) continue;
    
    const dateStr = fields[format.dateColumn];
    const description = format.descriptionColumn >= 0 ? fields[format.descriptionColumn] : '';
    const amountStr = fields[format.amountColumn];
    const balanceStr = format.balanceColumn >= 0 ? fields[format.balanceColumn] : null;
    const typeStr = format.typeColumn >= 0 ? fields[format.typeColumn] : null;
    
    // Extract balance if available (first valid one)
    if (balanceStr && !balanceFound) {
      const parsedBalance = parseAmount(balanceStr);
      if (!isNaN(parsedBalance)) {
        lastBalance = parsedBalance;
        balanceFound = true;
      }
    }
    
    if (!dateStr || !amountStr) continue;
    
    const parsedAmount = parseAmount(amountStr);
    if (parsedAmount === 0 || isNaN(parsedAmount)) continue;
    
    // Determine transaction type
    let type = 'expense';
    if (typeStr) {
      const typeLower = typeStr.toLowerCase();
      if (typeLower.includes('income') || typeLower.includes('ingreso') || 
          typeLower.includes('credit') || typeLower.includes('deposit')) {
        type = 'income';
      } else if (typeLower.includes('expense') || typeLower.includes('gasto') || 
                 typeLower.includes('debit') || typeLower.includes('payment')) {
        type = 'expense';
      }
    } else {
      // Infer from amount sign
      type = parsedAmount > 0 ? 'income' : 'expense';
    }
    
    // Validate transaction before adding
    const parsedDate = parseDate(dateStr);
    const cleanDescription = (description || '').trim();
    
    // Skip if description is empty
    if (!cleanDescription) {
      console.warn(`⚠️ Skipping transaction with empty description on date: ${parsedDate}`);
      continue;
    }
    
    const transaction = {
      bank: format.bank || 'Unknown',
      date: parsedDate,
      category: categorizeTransaction(cleanDescription),
      description: cleanDescription,
      amount: Math.abs(parsedAmount),
      type: type
    };
    
    transactions.push(transaction);
  }
  
  return {
    bank: format.bank,
    accountNumber: accountNumber || null,
    lastBalance: lastBalance,
    transactions
  };
}

/**
 * Parse generic CSV format (fallback)
 */
function parseGenericCSV(lines) {
  const transactions = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle quoted fields)
    const fields = parseCSVLine(line);
    
    // Try different column orders
    if (fields.length >= 5) {
      // Format: Bank,Date,Category,Description,Amount,Type
      const [bank, date, category, description, amount, type] = fields;
      
      if (date && amount) {
        transactions.push({
          bank: bank || 'Unknown',
          date: parseDate(date),
          category: category || categorizeTransaction(description),
          description: description || '',
          amount: Math.abs(parseFloat(amount)),
          type: type || (parseFloat(amount) > 0 ? 'income' : 'expense')
        });
      }
    } else if (fields.length >= 3) {
      // Format: Date,Description,Amount (minimal)
      const [date, description, amount] = fields;
      
      if (date && amount) {
        const parsedAmount = parseAmount(amount);
        transactions.push({
          bank: 'CSV Import',
          date: parseDate(date),
          category: categorizeTransaction(description || ''),
          description: description || '',
          amount: Math.abs(parsedAmount),
          type: parsedAmount > 0 ? 'income' : 'expense'
        });
      }
    }
  }
  
  return {
    bank: 'CSV Import',
    transactions
  };
}

/**
 * Parse Sabadell Credit Card Statement
 */
function parseSabadellCreditCard(lines, fullText) {
  const result = {
    accountType: 'credit',
    creditCard: {
      bank: 'Sabadell'
    },
    transactions: []
  };
  
  let inTransactionSection = false;
  let skipNextLines = 0;
  
  // Extract credit card info from text
  const creditLimitMatch = fullText.match(/Límite de crédito[,\s]+"?([\d.,]+)\s*EUR/);
  if (creditLimitMatch) {
    result.creditCard.creditLimit = parseAmount(creditLimitMatch[1]);
  }
  
  const debtMatch = fullText.match(/Saldo dispuesto:[,\s]+"?([\d.,]+)\s*EUR/);
  if (debtMatch) {
    const debt = parseAmount(debtMatch[1]);
    result.creditCard.currentDebt = debt;
    result.creditCard.balance = -debt; // Negative = debt
  }
  
  const availableMatch = fullText.match(/Saldo disponible:[,\s]+"?([\d.,]+)\s*EUR/);
  if (availableMatch) {
    result.creditCard.availableCredit = parseAmount(availableMatch[1]);
  }
  
  const monthlyPaymentMatch = fullText.match(/Fijo mensual de ([\d.,]+)\s*EUR/);
  if (monthlyPaymentMatch) {
    result.creditCard.monthlyPayment = parseAmount(monthlyPaymentMatch[1]);
  }
  
  const cardNumberMatch = fullText.match(/Tarjeta:[,\s]*([\d_]+)/);
  if (cardNumberMatch) {
    result.creditCard.cardNumber = cardNumberMatch[1];
  }
  
  const contractMatch = fullText.match(/Contrato[,\s]+([\d]+)/);
  if (contractMatch) {
    result.creditCard.contractNumber = contractMatch[1];
  }
  
  const cardTypeMatch = fullText.match(/VISA[^\n,]*/);
  if (cardTypeMatch) {
    result.creditCard.cardType = cardTypeMatch[0].trim();
  }
  
  // Parse transactions - look for lines after "MOVIMIENTOS DE CREDITO"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Skip if we're in skip mode
    if (skipNextLines > 0) {
      skipNextLines--;
      continue;
    }
    
    // Find transaction section
    if (line.includes('MOVIMIENTOS DE CREDITO')) {
      inTransactionSection = true;
      skipNextLines = 2; // Skip the blank line and header
      continue;
    }
    
    // Stop at summary sections
    if (line.includes('Saldo aplazado anterior') || 
        line.includes('IMPORTE TOTAL A LIQUIDAR') ||
        line.includes('MOVIMIENTOS DE DEBITO')) {
      inTransactionSection = false;
      continue;
    }
    
    // Skip header rows
    if (line.includes('FECHA') && line.includes('CONCEPTO')) {
      continue;
    }
    
    // Skip summary rows
    if (line.includes('TOTAL OPERACIONES') || 
        line.includes('Total operaciones') ||
        line.includes('Importe total')) {
      continue;
    }
    
    // Parse transaction lines
    if (inTransactionSection) {
      const fields = parseCSVLine(line);
      
      // Need at least: date, concept, location, amount
      if (fields.length >= 4) {
        const dateField = fields[0];
        
        // Check if first field looks like a date (DD/MM)
        if (dateField && dateField.match(/^\d{1,2}\/\d{1,2}$/)) {
          const concept = fields[1] || '';
          const location = fields[2] || '';
          
          // Find amount - look for numeric field followed by EUR
          let amount = null;
          for (let j = 3; j < fields.length; j++) {
            const field = fields[j].trim();
            // Check if this field is a number
            if (field.match(/^-?[\d.,]+$/)) {
              const nextField = fields[j + 1] || '';
              // Check if next field contains EUR
              if (nextField.includes('EUR') || j === fields.length - 2) {
                amount = parseAmount(field);
                break;
              }
            }
          }
          
          if (concept && amount !== null && amount !== 0) {
            const currentYear = new Date().getFullYear();
            const fullDate = parseCreditCardDate(dateField, currentYear);
            const isRefund = amount < 0;
            
            const transaction = {
              bank: 'Sabadell',
              date: fullDate,
              description: location && location !== ' ' ? `${concept} - ${location}` : concept,
              amount: Math.abs(amount),
              type: isRefund ? 'income' : 'expense',
              category: categorizeCreditCardTransaction(concept, isRefund),
              isRefund: isRefund
            };
            
            result.transactions.push(transaction);
          }
        }
      }
    }
  }
  
  // Generate credit card name from card type and last 4 digits
  const cardName = result.creditCard.cardType || 'Credit Card';
  const last4 = result.creditCard.cardNumber ? 
    result.creditCard.cardNumber.replace(/.*(\d{4})$/, '*$1') : '';
  result.creditCard.name = last4 ? `${cardName} ${last4}` : cardName;
  
  console.log('🏦 Credit Card Detected:', result.creditCard.name);
  console.log('💳 Credit Limit:', result.creditCard.creditLimit);
  console.log('💰 Current Debt:', result.creditCard.currentDebt);
  console.log('📊 Available Credit:', result.creditCard.availableCredit);
  console.log('📝 Transactions:', result.transactions.length);
  
  return result;
}

/**
 * Detect Sabadell Credit Card TEXT format (copy-paste from website)
 * Format has:
 * - "Contrato:" followed by contract number
 * - "Límite de crédito:" 
 * - "Forma pago mensual:"
 * - Transaction list with: Date (DD/MM), Concept, Location, Amount EUR
 * - "Total operaciones pendientes"
 * - "Disponible:" and "Gastado:"
 */
function detectSabadellCreditCardTextFormat(text, lines) {
  // Check for credit card specific keywords
  const hasContract = text.includes('Contrato:') || text.includes('Contrato');
  const hasCreditLimit = text.includes('Límite de crédito:') || text.includes('Límite de crédito');
  const hasMonthlyPayment = text.includes('Forma pago mensual:') || text.includes('Fijo mensual de');
  const hasPendingOps = text.includes('Total operaciones pendientes') || text.includes('operaciones pendientes');
  const hasDisponible = text.includes('Disponible:') && text.includes('Gastado:');
  
  // Check for transaction pattern: Date (DD/MM), Concept, Location, Amount
  const hasDatePattern = /\d{1,2}\/\d{1,2}/.test(text);
  const hasEURAmounts = /[\d.,]+\s*€/.test(text) || /[\d.,]+\s*EUR/.test(text);
  
  // Must have credit card keywords AND transaction pattern
  const isCreditCardText = (hasContract || hasCreditLimit) && 
                           (hasMonthlyPayment || hasPendingOps) &&
                           hasDatePattern && 
                           hasEURAmounts;
  
  // But NOT regular bank account format (which has "Fecha	Descripción	Importe	Saldo" header)
  const isRegularAccount = text.includes('Fecha') && text.includes('Descripción') && 
                          text.includes('Importe') && text.includes('Saldo') &&
                          !hasCreditLimit;
  
  return isCreditCardText && !isRegularAccount;
}

/**
 * Parse Sabadell Credit Card TEXT format (copy-paste from website)
 * Format example:
 *   Contrato: 004014368330
 *   Límite de crédito: 2.000,00 €
 *   Forma pago mensual: Fijo mensual de 500,00 €
 *   ...
 *   Fecha 	Concepto	Población/País		Importe
 *   17/11	VUELING AIRLINES	PRAT DE LLOBR		277,98 €
 *   15/11	Aliexpress.com	INTERNET	 	7,87 €
 */
function parseSabadellCreditCardTextFormat(lines, fullText) {
  const result = {
    accountType: 'credit',
    creditCard: {
      bank: 'Sabadell'
    },
    transactions: []
  };
  
  // Extract credit card info from text
  const contractMatch = fullText.match(/Contrato[:\s]+([\d-]+)/);
  if (contractMatch) {
    result.creditCard.contractNumber = contractMatch[1].trim();
  }
  
  const creditLimitMatch = fullText.match(/Límite de crédito[:\s]+([\d.,]+)\s*[€EUR]/);
  if (creditLimitMatch) {
    result.creditCard.creditLimit = parseAmount(creditLimitMatch[1]);
  }
  
  const monthlyPaymentMatch = fullText.match(/Fijo mensual de ([\d.,]+)\s*[€EUR]/);
  if (monthlyPaymentMatch) {
    result.creditCard.monthlyPayment = parseAmount(monthlyPaymentMatch[1]);
  }
  
  const disponibleMatch = fullText.match(/Disponible[:\s]+([\d.,]+)\s*[€EUR]/);
  if (disponibleMatch) {
    result.creditCard.availableCredit = parseAmount(disponibleMatch[1]);
  }
  
  const gastadoMatch = fullText.match(/Gastado[:\s]+([\d.,]+)\s*[€EUR]/);
  if (gastadoMatch) {
    const gastado = parseAmount(gastadoMatch[1]);
    result.creditCard.currentDebt = gastado;
    result.creditCard.balance = -gastado; // Negative = debt
  }
  
  // Extract card number (format: 4106__0012 or similar)
  const cardNumberMatch = fullText.match(/(\d{4}[_\d]+\d{4})/);
  if (cardNumberMatch) {
    result.creditCard.cardNumber = cardNumberMatch[1];
  }
  
  // Extract card name (e.g., "Joe Visa Credit card")
  const cardNameMatch = fullText.match(/([A-Za-z\s]+Credit\s+card)/i);
  if (cardNameMatch) {
    result.creditCard.cardType = cardNameMatch[1].trim();
  }
  
  // Find transaction section - look for header or start of transactions
  let inTransactionSection = false;
  let transactionStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for transaction header or first transaction
    if (line.includes('Fecha') && (line.includes('Concepto') || line.includes('Concepto'))) {
      transactionStartIndex = i + 1;
      inTransactionSection = true;
      break;
    }
    
    // Or look for first date pattern (DD/MM) that might be a transaction
    if (/^\d{1,2}\/\d{1,2}/.test(line) && !inTransactionSection) {
      // Check if next lines have concept and amount
      if (i + 2 < lines.length) {
        const nextLine = lines[i + 1]?.trim();
        const amountLine = lines[i + 2]?.trim() || lines[i + 1]?.trim();
        if (nextLine && amountLine && /[\d.,]+\s*[€EUR]/.test(amountLine)) {
          transactionStartIndex = i;
          inTransactionSection = true;
          break;
        }
      }
    }
  }
  
  // Parse transactions
  if (transactionStartIndex >= 0) {
    let i = transactionStartIndex;
    const currentYear = new Date().getFullYear();
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Stop at summary sections
      if (line.includes('OPERACIONES PERIODO ACTUAL') ||
          line.includes('Saldo aplazado anterior') ||
          line.includes('IMPORTE TOTAL A LIQUIDAR') ||
          line.includes('Total operaciones')) {
        break;
      }
      
      // Skip empty lines and headers
      if (!line || line.includes('Fecha') || line.includes('Concepto')) {
        i++;
        continue;
      }
      
      // Try to parse transaction line
      // Format can be:
      // 1. Single line: "17/11	VUELING AIRLINES	PRAT DE LLOBR		277,98 €"
      // 2. Multi-line:
      //    17/11
      //    VUELING AIRLINES
      //    Referencia única BS: ...
      //    PRAT DE LLOBR		277,98 €
      
      // Check if line starts with date (DD/MM)
      const dateMatch = line.match(/^(\d{1,2})\/(\d{1,2})/);
      if (dateMatch) {
        const dateStr = dateMatch[0];
        let concept = '';
        let location = '';
        let amount = null;
        let skipLines = 0;
        
        // Check if it's single-line format (has tabs and amount on same line)
        if (line.includes('\t') && /[\d.,]+\s*[€EUR]/.test(line)) {
          // Single-line format with tabs
          const parts = line.split(/\t+/);
          concept = parts[1]?.trim() || '';
          location = parts[2]?.trim() || '';
          
          // Find amount (last field with EUR/€)
          for (let j = parts.length - 1; j >= 0; j--) {
            const part = parts[j].trim();
            const amountMatch = part.match(/([\d.,]+)\s*[€EUR]/);
            if (amountMatch) {
              amount = parseAmount(amountMatch[1]);
              break;
            }
          }
        } else {
          // Multi-line format - look ahead
          // Line i: date (DD/MM)
          // Line i+1: concept (merchant name)
          // Line i+2: might be "Referencia única BS:" or location
          // Line i+3 or i+2: location and amount
          
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            
            // Skip reference lines
            if (nextLine.includes('Referencia única') || nextLine.match(/^\d{20,}$/)) {
              concept = lines[i + 2]?.trim() || '';
              location = lines[i + 3]?.trim() || '';
              const amountLine = lines[i + 4]?.trim() || lines[i + 3]?.trim() || '';
              skipLines = 4;
              
              const amountMatch = amountLine.match(/([\d.,]+)\s*[€EUR]/);
              if (amountMatch) {
                amount = parseAmount(amountMatch[1]);
                // Location might be before amount in same line
                if (!location && amountLine.includes('\t')) {
                  const parts = amountLine.split(/\t+/);
                  location = parts[0]?.trim() || '';
                }
              }
            } else {
              // No reference line, concept is next
              concept = nextLine;
              location = lines[i + 2]?.trim() || '';
              const amountLine = lines[i + 3]?.trim() || lines[i + 2]?.trim() || '';
              skipLines = 3;
              
              const amountMatch = amountLine.match(/([\d.,]+)\s*[€EUR]/);
              if (amountMatch) {
                amount = parseAmount(amountMatch[1]);
                // Location might be before amount in same line
                if (!location && amountLine.includes('\t')) {
                  const parts = amountLine.split(/\t+/);
                  location = parts[0]?.trim() || '';
                }
              }
            }
          }
        }
        
        if (concept && amount !== null && amount !== 0) {
          const fullDate = parseCreditCardDate(dateStr, currentYear);
          const isRefund = amount < 0;
          
          const transaction = {
            bank: 'Sabadell',
            date: fullDate,
            description: location ? `${concept} - ${location}`.trim() : concept,
            amount: Math.abs(amount),
            type: isRefund ? 'income' : 'expense',
            category: categorizeCreditCardTransaction(concept, isRefund),
            isRefund: isRefund
          };
          
          result.transactions.push(transaction);
          
          // Skip processed lines if multi-line format
          if (skipLines > 0) {
            i += skipLines;
            continue;
          }
        }
      }
      
      i++;
    }
  }
  
  // Generate credit card name
  const cardName = result.creditCard.cardType || 'Credit Card';
  const last4 = result.creditCard.cardNumber ? 
    result.creditCard.cardNumber.replace(/.*(\d{4})$/, '*$1') : '';
  result.creditCard.name = last4 ? `${cardName} ${last4}` : cardName;
  
  console.log('💳 Credit Card Text Format Detected:', result.creditCard.name);
  console.log('💳 Credit Limit:', result.creditCard.creditLimit);
  console.log('💰 Current Debt:', result.creditCard.currentDebt);
  console.log('📊 Available Credit:', result.creditCard.availableCredit);
  console.log('📝 Transactions:', result.transactions.length);
  
  return result;
}

/**
 * Parse credit card date (DD/MM format, add current year)
 */
function parseCreditCardDate(dateStr, year) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0];
}

/**
 * Categorize credit card transactions
 */
function categorizeCreditCardTransaction(description, isRefund) {
  const descLower = description.toLowerCase();
  
  // If it's a refund, mark it specially
  if (isRefund) {
    return 'Reembolsos';
  }
  
  // Online shopping
  if (descLower.includes('aliexpress') || descLower.includes('amazon') ||
      descLower.includes('ebay') || descLower.includes('wish')) {
    return 'Compras online';
  }
  
  // Jewelry/Gifts
  if (descLower.includes('jewel') || descLower.includes('joyeria') ||
      descLower.includes('regalo') || descLower.includes('petals') ||
      descLower.includes('studio')) {
    return 'Regalos';
  }
  
  // Restaurants
  if (descLower.includes('restaurant') || descLower.includes('bar ') ||
      descLower.includes('cafe') || descLower.includes('pizza')) {
    return 'Restaurante';
  }
  
  // Travel
      if (descLower.includes('hotel') || descLower.includes('airbnb') || descLower.includes('vacation') || descLower.includes('vacaciones') ||
      descLower.includes('booking') || descLower.includes('flight')) {
    return 'Viajes';
  }
  
  // Gas stations
  if (descLower.includes('repsol') || descLower.includes('cepsa') ||
      descLower.includes('galp') || descLower.includes('bp')) {
    return 'Gasolina';
  }
  
  // Subscriptions
  if (descLower.includes('netflix') || descLower.includes('spotify') ||
      descLower.includes('disney') || descLower.includes('google')) {
    return 'Suscripciones';
  }
  
  return 'Otras compras';
}

/**
 * Parse CSV line handling quoted fields
 * Handles: "field with, commas" correctly
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
      // Don't add quote to current field
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      // Field separator (only if not inside quotes)
      fields.push(current.trim());
      current = '';
    } else {
      // Regular character - add to current field
      current += char;
    }
  }
  
  // Add the last field (after final comma or end of line)
  fields.push(current.trim());
  
  return fields;
}

/**
 * Detect potential transfers within transactions
 * Looks for matching amounts on the same day with opposite types
 */
export function detectPotentialTransfers(transactions) {
  const potentialTransfers = [];
  
  // Group transactions by date
  const byDate = {};
  transactions.forEach((t, index) => {
    const dateKey = t.date;
    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }
    byDate[dateKey].push({ ...t, originalIndex: index });
  });
  
  // For each date, look for matching amounts with opposite types
  Object.entries(byDate).forEach(([date, dayTransactions]) => {
    for (let i = 0; i < dayTransactions.length; i++) {
      for (let j = i + 1; j < dayTransactions.length; j++) {
        const t1 = dayTransactions[i];
        const t2 = dayTransactions[j];
        
        // Check if amounts match and types are opposite
        if (
          Math.abs(t1.amount - t2.amount) < 0.01 && // Same amount (within 1 cent)
          t1.type !== t2.type && // Opposite types
          t1.category === 'Transferencias' && // Already categorized as transfer
          t2.category === 'Transferencias'
        ) {
          potentialTransfers.push({
            date: date,
            amount: t1.amount,
            transaction1: t1,
            transaction2: t2,
            confidence: 'high'
          });
        }
      }
    }
  });
  
  return potentialTransfers;
}


