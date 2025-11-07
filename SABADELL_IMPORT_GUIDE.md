# Sabadell Bank Import Guide 📊

## ✅ What's New

Finova now **automatically detects and imports** Sabadell bank statements in Excel/CSV format!

---

## 🚀 How to Import Your Sabadell Transactions

### Step 1: Export from Sabadell Online Banking

1. Login to **Banco Sabadell** online banking
2. Go to **"Consulta de movimientos"** (Transaction History)
3. Select your date range (e.g., last month, last 3 months)
4. Click **Export** or **Download**
5. Choose **Excel** or **CSV** format

### Step 2: Upload to Finova

1. Open **Finova** → Go to **Upload** tab
2. Drag and drop your Sabadell file (or click to browse)
3. Click **"Process and Upload"**
4. ✨ **Magic!** Finova automatically:
   - Detects it's a Sabadell statement
   - Extracts account number
   - Parses all transactions
   - Auto-categorizes expenses

### Step 3: View Your Dashboard

Go to **Dashboard** tab to see:
- 📊 All your transactions organized
- 📈 Charts and KPIs
- 💡 AI-generated insights

---

## 📋 What Finova Extracts

From your Sabadell statement, Finova reads:
- ✅ **F. Operativa** → Transaction Date
- ✅ **Concepto** → Description (cleaned up)
- ✅ **Importe** → Amount (+ for income, - for expenses)
- ✅ **Account Number** → ES21 0081 0055...

---

## 🎯 Auto-Categorization

Finova automatically categorizes your Sabadell transactions:

| Sabadell Transaction | Category |
|---------------------|----------|
| MERCADONA, LIDL, ALDI, GUISSONA | **Groceries** |
| RESTAURANT, BAR, MCDONALD'S | **Restaurants** |
| COMPRA TARJ. (general) | **Shopping** |
| APP VNG APARCAMENTS | **Transport** |
| DISNEY PLUS, NETFLIX, GOOGLE | **Entertainment** |
| AQUA SPORT | **Sports** |
| ADEUDO RECIBO SANITAS | **Healthcare** |
| ADEUDO RECIBO ARAM RESIDENCIAL | **Rent** |
| ESTUDIOS REGLADOS, ESCOLA | **Education** |
| FINANCIERA CETELEM, SANTANDER | **Loans** |
| TELEFONOS O2 FIBRA | **Utilities** |
| SECURITAS DIRECT | **Insurance** |
| IMPUESTOS | **Taxes** |
| PARA AHORRO SABADELL | **Savings** |
| PAGO BIZUM | **Transfer** |
| COMISIÓN | **Bank Fees** |
| TRASPASO | **Transfer** |

---

## 🧹 Smart Cleaning

Finova cleans up Sabadell descriptions:
- ❌ Removes card numbers: `5402XXXXXXXX4016`
- ❌ Removes location suffixes: `-VILANOVA I LA`
- ✅ Keeps essential info: `MERCADONA CARRER DE LA PI`

**Before:** `COMPRA TARJ. 5402XXXXXXXX5013 MERCADONA CARRER DE LA PI-VILANOVA I LA`  
**After:** `MERCADONA CARRER DE LA PI` (Category: Groceries)

---

## 📁 Supported Formats

### ✅ Sabadell Excel Export
- Direct export from "Consulta de movimientos"
- Includes header with account info
- All columns preserved

### ✅ Sabadell CSV Export
- Copy/paste from Excel to CSV
- Tab-separated or comma-separated
- Must include headers: `F. Operativa`, `Concepto`, `Importe`

### ✅ Generic CSV
- Still works with custom CSV format
- See `sample_transactions.csv` for example

---

## 🎨 Example Transactions

Your Sabadell export will look like this:

```
F. Operativa	Concepto	F. Valor	Importe	Saldo
13/10/2025	COMPRA TARJ. MERCADONA	16/10/2025	-27.08	68.94
13/10/2025	TRASPASO 0055-00026063	13/10/2025	100.00	95.04
10/10/2025	ESTUDIOS REGLADOS ESCOLA	10/10/2025	-78.08	-112.45
```

After import, you'll see:
- **Date:** 2025-10-13
- **Description:** MERCADONA
- **Amount:** €27.08
- **Category:** Groceries
- **Type:** Expense

---

## 💡 Pro Tips

### Tip 1: Export Multiple Months
Export 3-6 months of data to see better trends and insights!

### Tip 2: Multiple Accounts
Have multiple Sabadell accounts? Upload each one separately - they'll all show in your dashboard.

### Tip 3: Regular Updates
Export and upload monthly to keep your dashboard current.

### Tip 4: Mix and Match
You can upload both Sabadell and ING statements together!

---

## 🔄 How It Works

```
1. You upload Sabadell CSV/Excel
         ↓
2. Finova detects format
   (looks for "F. Operativa", "Concepto")
         ↓
3. Extracts account number
         ↓
4. Parses each transaction
         ↓
5. Cleans descriptions
         ↓
6. Auto-categorizes
         ↓
7. Sends to database
         ↓
8. Dashboard updates instantly! ✨
```

---

## 🎉 What You Get

After uploading your Sabadell statement:

### Dashboard Tab
- Total Income, Expenses, Net Balance
- Bar chart: Expenses by category
- Pie chart: Income vs Expenses
- Recent transactions table

### Trends Tab
- Monthly income/expense comparison
- Net balance trend over time
- Category breakdown by month

### Insights Tab
- AI-generated financial advice
- Spending change detection
- Top categories analysis

---

## 🆘 Troubleshooting

### "Failed to parse CSV"
- Make sure file includes headers
- Check it's a Sabadell export (has "F. Operativa")
- Try saving Excel as CSV

### "No transactions found"
- Verify file has data rows (not just headers)
- Check columns aren't empty
- Look for transaction amounts

### Descriptions look weird
- This is normal! Sabadell includes lots of extra info
- Finova cleans it automatically
- You can see cleaned version in Dashboard

---

## 📊 Sample Data Structure

Your Sabadell CSV should have these columns:

| F. Operativa | Concepto | F. Valor | Importe | Saldo | Referencia 1 | Referencia 2 |
|-------------|----------|----------|---------|-------|--------------|--------------|
| 13/10/2025 | COMPRA TARJ... | 16/10/2025 | -27.08 | 68.94 | | 5402__5013 |

**Required columns:** F. Operativa, Concepto, Importe  
**Optional:** F. Valor, Saldo, Referencias (extracted but not used)

---

## 🎯 Ready to Try?

1. Go to **Upload** tab
2. Drop your Sabadell export
3. Click "Process and Upload"
4. See your financial data come to life! 💰📊✨

---

**Questions?** Check the main README.md or explore the app features!










