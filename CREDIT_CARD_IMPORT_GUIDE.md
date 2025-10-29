# 💳 Credit Card Import Guide - Banco Sabadell

## 📊 What We Can Extract from Your Credit Card Statement

Based on your Sabadell credit card XLS/CSV, we can extract:

### 🔢 Credit Card Information
- ✅ **Contract Number**: 004014368330
- ✅ **Related Account**: 0081-0055-47-0002602069
- ✅ **Cardholder Name**: QUIJANO Y SAUMET, JOE YAROLAV
- ✅ **Credit Limit**: 2,000.00 EUR
- ✅ **Current Debt** (Saldo dispuesto): 1,226.75 EUR (in red = what you owe)
- ✅ **Available Credit** (Saldo disponible): 748.64 EUR (what you can still spend)
- ✅ **Monthly Payment**: Fixed 500.00 EUR

### 💳 Card Details
- ✅ **Card Number**: 4106_____0012 (masked)
- ✅ **Card Type**: VISA CLASSIC BSAB

### 📝 Transaction Details
Each transaction shows:
- ✅ **Date** (FECHA): e.g., 16/10, 09/10, 30/09
- ✅ **Description** (CONCEPTO): Aliexpress.com, SP PETALS STUDIO JEWEL
- ✅ **Location** (LOCALIDAD): LUXEMBOURG, INTERNET, VILANOVA I LA
- ✅ **Status** (SIT. MOV): AUT (Authorized)
- ✅ **Amount** (IMPORTE): Positive for expenses, **negative for refunds**

### 💰 Statement Summary
- ✅ **Previous Balance** (Saldo aplazado anterior): 1,177.32 EUR
- ✅ **Current Month Operations**: 49.43 EUR
- ✅ **Total to Pay** (IMPORTE TOTAL A LIQUIDAR): 1,226.75 EUR
- ✅ **Pending Operations by Month**: October 2025, November 2025

---

## 🎯 How Credit Card Statements Differ

| Feature | Regular Bank Account | Credit Card |
|---------|---------------------|-------------|
| **Balance** | Positive = money you have | Negative = money you owe (debt) |
| **Transactions** | Income & Expenses | Expenses & Refunds |
| **Refunds** | Rare | Common (shown as negative) |
| **Limit** | No limit | Credit limit (max debt) |
| **Payment** | N/A | Monthly payment due |
| **CSV Section** | "MOVIMIENTOS" | "MOVIMIENTOS DE CREDITO" |

---

## 🚀 Implementation Plan

### Step 1: Create Credit Card Parser

We need a **new parser function** specifically for Sabadell credit card statements:

```javascript
/**
 * Detect if CSV is Sabadell CREDIT CARD statement
 */
function detectSabadellCreditCardFormat(text) {
  return text.includes('MOVIMIENTOS DE CREDITO') || 
         text.includes('Saldo dispuesto') ||
         text.includes('Límite de') ||
         (text.includes('VISA') && text.includes('Límite'));
}

/**
 * Parse Sabadell Credit Card Statement
 */
function parseSabadellCreditCard(lines) {
  const result = {
    accountType: 'credit',
    creditCard: {},
    transactions: []
  };
  
  let inTransactionSection = false;
  let cardNumber = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Extract Credit Card Info
    if (line.includes('Límite de')) {
      const match = line.match(/Límite de ([\d.,]+)\s*EUR/);
      if (match) {
        result.creditCard.creditLimit = parseAmount(match[1]);
      }
    }
    
    if (line.includes('Saldo dispuesto:')) {
      const match = line.match(/Saldo dispuesto:\s*([\d.,]+)\s*EUR/);
      if (match) {
        // Current debt (positive number, but we'll store as negative)
        result.creditCard.currentDebt = parseAmount(match[1]);
        result.creditCard.balance = -parseAmount(match[1]); // Negative = debt
      }
    }
    
    if (line.includes('Saldo disponible:')) {
      const match = line.match(/Saldo disponible:\s*([\d.,]+)\s*EUR/);
      if (match) {
        result.creditCard.availableCredit = parseAmount(match[1]);
      }
    }
    
    if (line.includes('Fijo mensual de')) {
      const match = line.match(/Fijo mensual de ([\d.,]+)\s*EUR/);
      if (match) {
        result.creditCard.monthlyPayment = parseAmount(match[1]);
      }
    }
    
    if (line.includes('Tarjeta:')) {
      const match = line.match(/Tarjeta:\s*([\d_]+)/);
      if (match) {
        result.creditCard.cardNumber = match[1];
      }
    }
    
    if (line.includes('Contrato')) {
      const match = line.match(/Contrato\s+([\d]+)/);
      if (match) {
        result.creditCard.contractNumber = match[1];
      }
    }
    
    // Find transaction section
    if (line.includes('MOVIMIENTOS DE CREDITO')) {
      inTransactionSection = true;
      continue;
    }
    
    // Parse transactions
    if (inTransactionSection) {
      // Look for header row: FECHA CONCEPTO LOCALIDAD SIT. MOV IMPORTE
      if (line.includes('FECHA') && line.includes('CONCEPTO') && line.includes('IMPORTE')) {
        // Next lines will be transactions
        continue;
      }
      
      // Stop at summary section
      if (line.includes('Saldo aplazado anterior') || 
          line.includes('Total operaciones mes actual')) {
        break;
      }
      
      // Parse transaction line
      const fields = parseCSVLine(line);
      if (fields.length >= 3) {
        const date = fields[0]; // FECHA (DD/MM)
        const concept = fields[1]; // CONCEPTO
        const location = fields[2]; // LOCALIDAD
        let amount = null;
        
        // Amount might be in different positions
        for (let j = fields.length - 1; j >= 0; j--) {
          const field = fields[j].trim();
          if (field.match(/^-?[\d.,]+\s*EUR(\(\d\))?$/)) {
            const amountMatch = field.match(/(-?[\d.,]+)\s*EUR/);
            if (amountMatch) {
              amount = parseAmount(amountMatch[1]);
              break;
            }
          }
        }
        
        if (date && concept && amount !== null && amount !== 0) {
          const currentYear = new Date().getFullYear();
          const fullDate = parseCreditCardDate(date, currentYear);
          
          // Determine if it's a refund (negative amount)
          const isRefund = amount < 0;
          
          const transaction = {
            bank: 'Sabadell',
            date: fullDate,
            description: `${concept} - ${location}`.trim(),
            amount: Math.abs(amount),
            type: 'expense', // All credit card transactions are expenses
            category: categorizeCreditCardTransaction(concept, isRefund),
            isRefund: isRefund // Mark refunds
          };
          
          result.transactions.push(transaction);
        }
      }
    }
  }
  
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
    return 'Reembolsos'; // Refunds category
  }
  
  // Online shopping
  if (descLower.includes('aliexpress') || descLower.includes('amazon') ||
      descLower.includes('ebay')) {
    return 'Compras online';
  }
  
  // Jewelry/Gifts
  if (descLower.includes('jewel') || descLower.includes('joyeria') ||
      descLower.includes('regalo')) {
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
```

### Step 2: Update Main Parser

In `pdfParser.js`, add credit card detection:

```javascript
export async function parseCSVTransactions(file) {
  try {
    const text = await file.text();
    const lines = text.split('\n');
    
    // Check if it's a credit card statement
    const isCreditCard = detectSabadellCreditCardFormat(text);
    
    if (isCreditCard) {
      return parseSabadellCreditCard(lines);
    }
    
    // Otherwise, check for regular account formats
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
```

### Step 3: Update Upload Component

In `Upload.jsx`, handle credit card data:

```javascript
const handleUpload = async () => {
  try {
    const parsed = await parseCSVTransactions(selectedFile);
    
    // Check if it's a credit card
    if (parsed.accountType === 'credit') {
      // Show credit card account selector or create new one
      const creditCard = parsed.creditCard;
      
      // Option 1: Ask user to select existing credit card or create new
      const accountId = await showCreditCardSelector(creditCard);
      
      // Upload transactions
      const response = await api.uploadTransactions(
        parsed.transactions,
        accountId,
        creditCard.balance // Use current debt as balance
      );
      
      // Update credit card account info
      await api.updateAccount(accountId, {
        creditLimit: creditCard.creditLimit,
        balance: creditCard.balance,
        availableCredit: creditCard.availableCredit
      });
      
      setMessage(`✅ Imported ${parsed.transactions.length} transactions`);
    } else {
      // Regular account import (existing code)
      // ...
    }
  } catch (error) {
    console.error('Upload error:', error);
    setError('Failed to upload transactions');
  }
};
```

---

## 📋 Example: Your Statement

From your image, here's what we extract:

### Credit Card Account
```javascript
{
  name: "VISA CLASSIC *0012",
  accountType: "credit",
  creditLimit: 2000.00,
  balance: -1226.75, // Negative = debt
  availableCredit: 748.64,
  contractNumber: "004014368330",
  cardNumber: "4106_____0012",
  monthlyPayment: 500.00
}
```

### Transactions
```javascript
[
  {
    date: "2025-10-16",
    description: "Aliexpress.com - LUXEMBOURG",
    amount: 24.61,
    type: "expense",
    category: "Compras online",
    isRefund: false
  },
  {
    date: "2025-10-09",
    description: "Aliexpress.com - INTERNET",
    amount: 20.26,
    type: "expense",
    category: "Compras online",
    isRefund: false
  },
  {
    date: "2025-10-09",
    description: "Aliexpress.com - INTERNET",
    amount: 6.08,
    type: "expense",
    category: "Reembolsos", // Refund!
    isRefund: true
  },
  {
    date: "2025-09-27",
    description: "SP PETALS STUDIO JEWEL - VILANOVA I LA",
    amount: 4.98,
    type: "expense",
    category: "Reembolsos", // Refund!
    isRefund: true
  }
]
```

---

## 🎯 How Refunds Work

### In Your Statement:
```
09/10   Aliexpress.com   INTERNET   20,26 EUR   ← Purchase
09/10   Aliexpress.com   INTERNET   -6,08 EUR   ← Refund (negative!)
```

### In Finova:
- **Purchase**: Adds 20.26 EUR to debt (reduces available credit)
- **Refund**: Subtracts 6.08 EUR from debt (increases available credit)
- **Net Effect**: +14.18 EUR debt

### Transaction Type:
- ✅ All credit card movements are `type: 'expense'`
- ✅ Refunds are marked with `isRefund: true`
- ✅ Refunds show in special category "Reembolsos"

---

## 📊 Display in Dashboard

### Credit Card Balance Card
```jsx
<div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl text-white">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm opacity-80">VISA *0012</h3>
      <p className="text-3xl font-bold">-€1,226.75</p>
      <p className="text-sm mt-1">Current Debt</p>
    </div>
    <CreditCard className="w-12 h-12 opacity-50" />
  </div>
  
  <div className="mt-4 pt-4 border-t border-white/20">
    <div className="flex justify-between text-sm">
      <span>Available:</span>
      <span className="font-bold">€748.64</span>
    </div>
    <div className="flex justify-between text-sm mt-1">
      <span>Limit:</span>
      <span>€2,000.00</span>
    </div>
    
    {/* Utilization Bar */}
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1">
        <span>Utilization</span>
        <span>61.3%</span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2">
        <div 
          className="bg-white rounded-full h-2" 
          style={{ width: '61.3%' }}
        />
      </div>
    </div>
  </div>
</div>
```

### Refunds in Transaction List
```jsx
<tr className={transaction.isRefund ? 'bg-green-50' : ''}>
  <td>{transaction.date}</td>
  <td>
    {transaction.description}
    {transaction.isRefund && (
      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
        Refund
      </span>
    )}
  </td>
  <td className={transaction.isRefund ? 'text-green-600' : 'text-red-600'}>
    {transaction.isRefund ? '+' : '-'}€{transaction.amount}
  </td>
</tr>
```

---

## 🔄 Monthly Payment Tracking

Based on your statement: **Fixed monthly payment of 500.00 EUR**

### Option 1: Automatic Payment Reminder
```javascript
// Check if payment is due this month
if (creditCard.dueDay && creditCard.monthlyPayment) {
  const today = new Date();
  const dueDate = new Date(today.getFullYear(), today.getMonth(), creditCard.dueDay);
  
  if (today >= dueDate && !paymentMadeThisMonth) {
    showPaymentReminder({
      account: creditCard.name,
      amount: creditCard.monthlyPayment,
      dueDate: dueDate
    });
  }
}
```

### Option 2: Record Payment
When user pays the credit card:
```javascript
const recordCreditCardPayment = async (cardId, amount, fromAccountId) => {
  // 1. Reduce credit card debt
  await api.updateAccount(cardId, {
    balance: currentBalance + amount // Move toward 0
  });
  
  // 2. Create payment transaction
  await api.createTransaction({
    accountId: cardId,
    type: 'income', // Payment reduces debt
    amount: amount,
    description: 'Credit Card Payment',
    category: 'Pago tarjeta',
    date: new Date().toISOString()
  });
  
  // 3. If paying from another account, deduct there
  if (fromAccountId) {
    await api.createTransaction({
      accountId: fromAccountId,
      type: 'expense',
      amount: amount,
      description: 'Payment to VISA *0012',
      category: 'Pago tarjeta',
      computable: false // Don't double-count
    });
  }
};
```

---

## 💡 Best Practices

### 1. Import Credit Card Statement Monthly
- Download statement at end of billing cycle
- Import into Finova
- Track debt progression

### 2. Separate Refunds Category
- Create "Reembolsos" category
- Easy to see what was refunded
- Don't confuse with regular expenses

### 3. Monitor Utilization
- Keep below 30% for good credit score
- Your current: 61.3% (High! ⚠️)
- Alert when exceeds threshold

### 4. Track Payment History
- Record each payment
- See debt reduction over time
- Project when card will be paid off

---

## 🚀 Quick Start

### Step 1: Add Migration for Credit Cards
```bash
node backend/migrations/add-credit-card-features.js
```

### Step 2: Update Parser
Add credit card parsing functions to `frontend/src/utils/pdfParser.js`

### Step 3: Test Import
1. Open Finova
2. Go to Upload tab
3. Drop your credit card CSV
4. Should auto-detect as credit card
5. Creates/updates credit card account
6. Imports all transactions

---

## 📈 Future Enhancements

### Phase 1 (Essential)
- ✅ Parse credit card CSV
- ✅ Extract credit limit and debt
- ✅ Import transactions with refunds
- ✅ Display debt vs available credit

### Phase 2 (Nice to Have)
- 📅 Payment due date tracking
- 🔔 Payment reminders
- 📊 Debt progression chart
- 💰 Interest calculation
- 🎯 Payoff projections

### Phase 3 (Advanced)
- 📧 Auto-import from email
- 🤖 AI spending recommendations
- 📱 Mobile notifications
- 💳 Multi-card comparison

---

## ❓ Questions to Consider

1. **Should refunds be separate transactions or modify original?**
   - Recommendation: **Separate transactions** marked with `isRefund: true`
   - Easier to track and analyze

2. **How to handle pending operations?**
   - Your statement shows "Total operaciones pendientes 10/2025: 49,43 EUR"
   - Recommendation: Import as regular transactions, they'll appear when statement finalizes

3. **Auto-create credit card account or ask user?**
   - Recommendation: **Ask user** to select existing or create new
   - Prevents duplicates

4. **What to do with monthly payment info?**
   - Store in account metadata
   - Use for payment reminders
   - Don't auto-deduct (user must record actual payment)

---

## 🎯 Summary

Your credit card CSV contains:
- ✅ Credit limit: 2,000.00 EUR
- ✅ Current debt: 1,226.75 EUR (61.3% utilization)
- ✅ Available credit: 748.64 EUR
- ✅ Multiple transactions with refunds
- ✅ Previous balance + current month operations

**Next Steps:**
1. Implement credit card parser
2. Add credit card account type handling
3. Update UI to show debt vs available credit
4. Test import with your actual file

Want me to implement the credit card parser now? 🚀



