# 🏦 Credit Cards Implementation Guide

## Current Status ✅

Your system **already has the foundation** for credit cards:
- ✅ Database: `account_type` enum includes 'credit'
- ✅ Frontend: AddAccountModal displays credit card option
- ✅ Backend: Accounts API handles all types equally
- ✅ Transactions: Already linked to accounts via `account_id`

## What's Missing 🚧

Credit cards need **special handling** because they work differently than regular accounts:

### 1. **Balance Interpretation**
- **Regular Account**: Positive balance = money you have
- **Credit Card**: Negative balance = money you owe (debt)

### 2. **Transaction Types**
Regular accounts have:
- `income` → increases balance
- `expense` → decreases balance

Credit cards need:
- `expense` → increases debt (reduces balance)
- `payment` → reduces debt (increases balance toward 0)

### 3. **Credit Limit**
- Track maximum credit available
- Show "available credit" = limit - current debt

### 4. **Payment Due Dates**
- Monthly due date
- Statement closing date
- Overdue payment alerts

---

## 🎯 Recommended Implementation Strategy

### **Option A: Minimal Implementation (Quick)**
Keep it simple - just add credit limit tracking and proper balance display.

### **Option B: Full Implementation (Recommended)**
Complete credit card management with payments, limits, and special UI.

---

## 📋 Option B: Full Implementation Plan

### **Phase 1: Database Changes**

#### 1.1 Add Credit Card Fields to `bank_accounts`
```sql
ALTER TABLE bank_accounts 
  ADD COLUMN credit_limit DECIMAL(12, 2),
  ADD COLUMN statement_day INTEGER,
  ADD COLUMN due_day INTEGER;
```

**Fields:**
- `credit_limit`: Maximum credit available (e.g., 5000)
- `statement_day`: Day of month statement closes (e.g., 25)
- `due_day`: Day of month payment is due (e.g., 10)

#### 1.2 Add Payment Tracking (Optional)
Create a separate table for credit card payments:
```sql
CREATE TABLE credit_card_payments (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(100), -- e.g., 'Bank Transfer', 'Direct Debit'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Phase 2: Backend Changes**

#### 2.1 Update Account Routes
Modify `backend/routes/accounts.js`:

```javascript
// Add credit card specific fields to create/update
router.post('/', optionalAuth, async (req, res) => {
  const { 
    name, accountType, color, initialAmount, currency, 
    excludeFromStats, creditLimit, statementDay, dueDay 
  } = req.body;
  
  // Validation: credit cards should have limits
  if (accountType === 'credit' && !creditLimit) {
    return res.status(400).json({ 
      error: 'Credit limit is required for credit cards' 
    });
  }
  
  // For credit cards, initial amount should be negative (debt)
  const balance = accountType === 'credit' 
    ? -Math.abs(initialAmount) 
    : initialAmount;
  
  const result = await pool.query(
    `INSERT INTO bank_accounts 
     (user_id, name, account_type, color, balance, currency, 
      exclude_from_stats, credit_limit, statement_day, due_day)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [userId, name, accountType, color, balance, currency, 
     excludeFromStats, creditLimit, statementDay, dueDay]
  );
});
```

#### 2.2 Add Credit Card Payment Endpoint
New route for recording payments:

```javascript
// Record credit card payment
router.post('/:id/payment', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { amount, date, paymentMethod, notes, fromAccountId } = req.body;
  const userId = req.user?.userId || null;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Add payment record
    await client.query(
      `INSERT INTO credit_card_payments 
       (account_id, payment_date, amount, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, date, amount, paymentMethod, notes]
    );
    
    // 2. Update credit card balance (reduce debt)
    await client.query(
      `UPDATE bank_accounts 
       SET balance = balance + $1
       WHERE id = $2 AND (user_id IS NULL OR user_id = $3)`,
      [amount, id, userId]
    );
    
    // 3. If paid from another account, reduce that balance
    if (fromAccountId) {
      await client.query(
        `UPDATE bank_accounts 
         SET balance = balance - $1
         WHERE id = $2 AND (user_id IS NULL OR user_id = $3)`,
        [amount, fromAccountId, userId]
      );
      
      // Create expense transaction in the paying account
      await client.query(
        `INSERT INTO transactions 
         (user_id, account_id, date, description, amount, type, category, computable)
         VALUES ($1, $2, $3, $4, $5, 'expense', 'Credit Card Payment', false)`,
        [userId, fromAccountId, date, 'Payment to credit card', amount]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Payment recorded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
```

#### 2.3 Add Credit Card Statistics Endpoint

```javascript
// Get credit card statistics
router.get('/:id/credit-stats', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId || null;
  
  // Get account info
  const account = await pool.query(
    `SELECT * FROM bank_accounts 
     WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
    [id, userId]
  );
  
  if (account.rows.length === 0) {
    return res.status(404).json({ error: 'Account not found' });
  }
  
  const card = account.rows[0];
  const currentDebt = Math.abs(card.balance);
  const availableCredit = card.credit_limit - currentDebt;
  const utilizationPercent = (currentDebt / card.credit_limit) * 100;
  
  // Get this month's spending
  const thisMonth = await pool.query(
    `SELECT SUM(amount) as total
     FROM transactions
     WHERE account_id = $1 
     AND type = 'expense'
     AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
     AND (user_id IS NULL OR user_id = $2)`,
    [id, userId]
  );
  
  // Get payment history
  const payments = await pool.query(
    `SELECT * FROM credit_card_payments
     WHERE account_id = $1
     ORDER BY payment_date DESC
     LIMIT 12`,
    [id]
  );
  
  res.json({
    currentDebt,
    creditLimit: card.credit_limit,
    availableCredit,
    utilizationPercent: utilizationPercent.toFixed(2),
    thisMonthSpending: thisMonth.rows[0]?.total || 0,
    statementDay: card.statement_day,
    dueDay: card.due_day,
    recentPayments: payments.rows
  });
});
```

### **Phase 3: Frontend Changes**

#### 3.1 Update `AddAccountModal.jsx`

Add credit card specific fields:

```jsx
// Add to formData state
const [formData, setFormData] = useState({
  name: '',
  accountType: 'checking',
  color: '#3b82f6',
  initialAmount: 0,
  currency: 'EUR',
  excludeFromStats: false,
  // Credit card specific
  creditLimit: 0,
  statementDay: 25,
  dueDay: 10
});

// In the form, add conditional fields for credit cards
{formData.accountType === 'credit' && (
  <>
    {/* Credit Limit */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Credit Limit <span className="text-danger">*</span>
      </label>
      <input
        type="number"
        step="0.01"
        value={formData.creditLimit}
        onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value))}
        className="w-full px-4 py-2 border rounded-lg"
        placeholder="5000"
        required
      />
    </div>
    
    {/* Statement and Due Days */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Statement Day
        </label>
        <input
          type="number"
          min="1"
          max="31"
          value={formData.statementDay}
          onChange={(e) => handleChange('statementDay', parseInt(e.target.value))}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Due Day
        </label>
        <input
          type="number"
          min="1"
          max="31"
          value={formData.dueDay}
          onChange={(e) => handleChange('dueDay', parseInt(e.target.value))}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>
    </div>
    
    {/* Initial Debt Note */}
    <div className="bg-yellow-50 p-3 rounded-lg">
      <p className="text-xs text-yellow-800">
        💡 Enter current debt as a positive number. 
        It will be stored as negative (debt).
      </p>
    </div>
  </>
)}
```

#### 3.2 Create Credit Card Payment Modal

Create new file: `frontend/src/components/CreditCardPaymentModal.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { X, CreditCard, Wallet } from 'lucide-react';
import api from '../utils/api';

function CreditCardPaymentModal({ creditCard, onClose, onSuccess }) {
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    fromAccountId: null,
    notes: ''
  });
  
  useEffect(() => {
    loadAccounts();
  }, []);
  
  const loadAccounts = async () => {
    try {
      const response = await api.getAccounts();
      // Filter out credit cards, only show checking/savings
      const paymentAccounts = response.data.accounts.filter(
        acc => acc.account_type !== 'credit'
      );
      setAccounts(paymentAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.recordCreditCardPayment(creditCard.id, formData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Record Payment</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Payment Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          
          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          
          {/* Pay From Account */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Pay From Account (Optional)
            </label>
            <select
              value={formData.fromAccountId || ''}
              onChange={(e) => setFormData({...formData, fromAccountId: e.target.value || null})}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">Select account...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} - {acc.balance}€
                </option>
              ))}
            </select>
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg"
              rows="2"
            />
          </div>
          
          <button
            type="submit"
            className="w-full btn-primary"
          >
            Record Payment
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreditCardPaymentModal;
```

#### 3.3 Update Dashboard/Insights Display

In your dashboard, credit cards should be displayed differently:

```jsx
// In Dashboard.jsx or wherever accounts are displayed
const displayBalance = (account) => {
  if (account.account_type === 'credit') {
    const debt = Math.abs(account.balance);
    const available = account.credit_limit - debt;
    const utilization = (debt / account.credit_limit * 100).toFixed(1);
    
    return (
      <div>
        <div className="text-sm text-gray-500">Debt</div>
        <div className="text-xl font-bold text-red-600">
          -€{debt.toFixed(2)}
        </div>
        <div className="text-xs text-gray-500">
          Available: €{available.toFixed(2)} ({utilization}% used)
        </div>
      </div>
    );
  } else {
    return (
      <div>
        <div className="text-sm text-gray-500">Balance</div>
        <div className="text-xl font-bold">
          €{account.balance.toFixed(2)}
        </div>
      </div>
    );
  }
};
```

### **Phase 4: Statistics & Insights**

#### 4.1 Update Net Worth Calculation

Credit card debt should be subtracted from net worth:

```javascript
// In Dashboard or Insights
const calculateNetWorth = (accounts) => {
  return accounts.reduce((total, account) => {
    if (account.exclude_from_stats) return total;
    
    if (account.account_type === 'credit') {
      // Credit cards: negative balance = debt, subtract from net worth
      return total + account.balance; // already negative
    } else {
      // Regular accounts: add balance
      return total + account.balance;
    }
  }, 0);
};
```

#### 4.2 Add Credit Card Utilization Warning

```jsx
// Component to show credit card health
function CreditCardHealth({ accounts }) {
  const creditCards = accounts.filter(a => a.account_type === 'credit');
  
  const highUtilization = creditCards.filter(card => {
    const utilization = Math.abs(card.balance) / card.credit_limit * 100;
    return utilization > 30; // Warning threshold
  });
  
  if (highUtilization.length === 0) return null;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h3 className="font-semibold text-yellow-900 mb-2">
        ⚠️ High Credit Utilization
      </h3>
      <p className="text-sm text-yellow-800 mb-3">
        Keep credit utilization below 30% for better credit score
      </p>
      {highUtilization.map(card => {
        const utilization = (Math.abs(card.balance) / card.credit_limit * 100).toFixed(1);
        return (
          <div key={card.id} className="text-sm">
            {card.name}: {utilization}% utilization
          </div>
        );
      })}
    </div>
  );
}
```

---

## 🚀 Migration Path

### Step 1: Database Migration
Create: `backend/migrations/add-credit-card-features.js`

```javascript
import pool from '../config/database.js';

async function addCreditCardFeatures() {
  const client = await pool.connect();
  try {
    console.log('Adding credit card features...');
    
    await client.query('BEGIN');
    
    // Add credit card fields to bank_accounts
    await client.query(`
      ALTER TABLE bank_accounts 
      ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS statement_day INTEGER,
      ADD COLUMN IF NOT EXISTS due_day INTEGER;
    `);
    
    // Create credit card payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_card_payments (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
        payment_date DATE NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        payment_method VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cc_payments_account 
      ON credit_card_payments(account_id);
    `);
    
    await client.query('COMMIT');
    console.log('✅ Credit card features added successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

addCreditCardFeatures()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

### Step 2: Update API Utils
Add to `frontend/src/utils/api.js`:

```javascript
// Credit card specific endpoints
recordCreditCardPayment: (accountId, paymentData) => 
  api.post(`/accounts/${accountId}/payment`, paymentData),

getCreditCardStats: (accountId) => 
  api.get(`/accounts/${accountId}/credit-stats`),
```

### Step 3: Test
1. Create a credit card account
2. Add some expenses to it
3. Record a payment
4. Verify balance calculations
5. Check dashboard displays correctly

---

## 📊 Summary of Benefits

✅ **Proper debt tracking** - Credit card debt is clearly separated  
✅ **Payment history** - Track when and how much was paid  
✅ **Credit utilization** - Monitor credit health  
✅ **Accurate net worth** - Debt is properly subtracted  
✅ **Better insights** - See spending patterns per card  
✅ **Alerts** - Warning for high utilization or due payments  

---

## 🤔 Alternative: Simplified Approach

If full implementation is too much, you can start with:

1. ✅ Just add `credit_limit` field
2. ✅ Display debt differently in UI (show as negative/red)
3. ✅ Calculate available credit
4. ⏭️ Skip payment tracking (just use regular transactions)

This gives 70% of the benefit with 30% of the effort!

---

## Questions?

Let me know which approach you prefer and I can help implement it! 🚀



