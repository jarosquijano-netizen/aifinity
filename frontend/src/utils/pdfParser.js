import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
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
 * Parse ING bank statement
 */
function parseINGStatement(text) {
  const transactions = [];
  const lines = text.split('\n');
  
  // ING format typically: Date Description Amount
  // Pattern: DD-MM-YYYY or DD/MM/YYYY
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
      
      // Get the last amount (usually the balance change)
      const amountStr = amountMatches[amountMatches.length - 1];
      const amount = parseAmount(amountStr);
      
      // Extract description (text between date and amount)
      let description = line
        .replace(dateMatch[0], '')
        .replace(amountStr, '')
        .trim();
      
      // Clean up description
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
          bank: 'ING'
        });
      }
    }
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
 */
function parseDate(dateStr) {
  // Handle DD-MM-YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[-/]/);
  
  if (parts.length === 3) {
    let [day, month, year] = parts;
    
    // Pad day and month with leading zeros
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    
    // Handle 2-digit year
    if (year.length === 2) {
      year = '20' + year;
    }
    
    return `${year}-${month}-${day}`;
  }
  
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
  
  // Salary/Income
  if (descLower.includes('salary') || descLower.includes('payroll') || 
      descLower.includes('nomina') || descLower.includes('salario')) {
    return 'Salary';
  }
  
  // Groceries
  if (descLower.includes('supermarket') || descLower.includes('grocery') ||
      descLower.includes('mercadona') || descLower.includes('carrefour') ||
      descLower.includes('lidl') || descLower.includes('aldi')) {
    return 'Groceries';
  }
  
  // Transport
  if (descLower.includes('transport') || descLower.includes('gas') ||
      descLower.includes('petrol') || descLower.includes('uber') ||
      descLower.includes('taxi') || descLower.includes('metro') ||
      descLower.includes('gasolina')) {
    return 'Transport';
  }
  
  // Restaurants
  if (descLower.includes('restaurant') || descLower.includes('cafe') ||
      descLower.includes('bar') || descLower.includes('food')) {
    return 'Restaurants';
  }
  
  // Shopping
  if (descLower.includes('amazon') || descLower.includes('shop') ||
      descLower.includes('store') || descLower.includes('zara') ||
      descLower.includes('h&m')) {
    return 'Shopping';
  }
  
  // Utilities
  if (descLower.includes('electric') || descLower.includes('water') ||
      descLower.includes('internet') || descLower.includes('phone') ||
      descLower.includes('gas supply')) {
    return 'Utilities';
  }
  
  // Rent
  if (descLower.includes('rent') || descLower.includes('alquiler') ||
      descLower.includes('landlord')) {
    return 'Rent';
  }
  
  // Entertainment
  if (descLower.includes('cinema') || descLower.includes('theater') ||
      descLower.includes('spotify') || descLower.includes('netflix') ||
      descLower.includes('entertainment')) {
    return 'Entertainment';
  }
  
  // Healthcare
  if (descLower.includes('pharmacy') || descLower.includes('hospital') ||
      descLower.includes('doctor') || descLower.includes('medical')) {
    return 'Healthcare';
  }
  
  return 'Other';
}

/**
 * Main function to parse PDF transactions
 */
export async function parsePDFTransactions(file) {
  try {
    const text = await extractTextFromPDF(file);
    const bank = detectBank(text);
    
    let transactions = [];
    
    if (bank === 'ING') {
      transactions = parseINGStatement(text);
    } else if (bank === 'Sabadell') {
      transactions = parseSabadellStatement(text);
    } else {
      // Try generic parsing
      transactions = parseINGStatement(text); // Use ING parser as fallback
    }
    
    return {
      bank,
      transactions,
      rawText: text
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}

/**
 * Parse CSV file - detects format automatically
 */
export async function parseCSVTransactions(file) {
  try {
    const text = await file.text();
    const lines = text.split('\n');
    
    // Check if it's a credit card statement
    const isCreditCard = detectSabadellCreditCardFormat(text);
    
    if (isCreditCard) {
      return parseSabadellCreditCard(lines, text);
    }
    
    // Detect if it's a Sabadell statement
    const isSabadellFormat = detectSabadellFormat(text);
    
    if (isSabadellFormat) {
      return parseSabadellCSV(lines);
    } else {
      return parseGenericCSV(lines);
    }
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
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
 * Detect if CSV is Sabadell bank format
 */
function detectSabadellFormat(text) {
  // Check for Sabadell-specific headers
  return text.includes('F. Operativa') && 
         text.includes('Concepto') && 
         text.includes('F. Valor') &&
         text.includes('Importe');
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
    
    // Find header row (contains F. Operativa, Concepto, etc.)
    if (line.includes('F. Operativa') && line.includes('Concepto')) {
      headerRowIndex = i;
      break;
    }
  }
  
  // Parse transactions starting after header
  if (headerRowIndex === -1) {
    // If no header found, try generic parsing
    return parseGenericCSV(lines);
  }
  
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = parseCSVLine(line);
    
    // Sabadell format: F.Operativa, Concepto, F.Valor, Importe, Saldo, Ref1, Ref2
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
    
    return 'Otras compras';
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
  
  return 'Otros gastos';
}

/**
 * Parse generic CSV format
 */
function parseGenericCSV(lines) {
  const transactions = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle quoted fields)
    const fields = parseCSVLine(line);
    
    if (fields.length >= 5) {
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
  if (descLower.includes('hotel') || descLower.includes('airbnb') ||
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
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
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


