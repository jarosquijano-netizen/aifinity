# 💳 How to Upload Your Credit Card Statement

## 📍 Where to Add Your Credit Card CSV

### Step 1: Open Your App
1. Start your Finova application
2. Navigate to the **"Upload"** tab (same tab where you upload regular bank statements)

### Step 2: Export Credit Card Statement from Sabadell
1. Log in to **Banco Sabadell** online banking
2. Go to your **Credit Card** section
3. Select **"Movimientos de tarjeta"** or **"Credit Card Movements"**
4. Click **"Exportar"** (Export)
5. Choose **Excel (.xls / .xlsx)** or **CSV** format
6. Download the file

### Step 3: Upload to Finova
1. In the Upload tab, you'll see a **drag-and-drop area**
2. **Drag your credit card file** into this area, OR
3. **Click the area** to browse and select your file
4. The app will automatically detect it's a credit card statement! 🎉

### Step 4: Select Credit Card Account
1. If you already have a credit card account:
   - Select it from the dropdown
2. If you DON'T have a credit card account yet:
   - Go to **Settings** → **Bank Accounts**
   - Click **"Add Account"**
   - Choose **"Credit Card"** type
   - Enter name (e.g., "VISA *0012")
   - Enter your **Credit Limit** (2,000 EUR)
   - Save

### Step 5: Process
1. Click **"Process and Upload"**
2. Wait a few seconds
3. You'll see a success message showing:
   - ✅ Number of transactions imported
   - 💳 Credit card detected
   - 📊 Credit limit
   - 💰 Current debt
   - 💵 Available credit

### Step 6: View Results
1. Go to **Dashboard** tab
2. Your credit card transactions are now imported!
3. Refunds are automatically detected (shown in green)

---

## 🎯 What the App Automatically Detects

From your credit card CSV, the app extracts:

✅ **Credit Card Info:**
- Card name (VISA CLASSIC *0012)
- Credit limit (€2,000.00)
- Current debt (€1,226.75)
- Available credit (€748.64)

✅ **All Transactions:**
- Date (16/10, 09/10, etc.)
- Merchant name (Aliexpress.com, SP PETALS STUDIO JEWEL)
- Amount (€24.61, €20.26, etc.)
- Location (LUXEMBOURG, INTERNET, VILANOVA I LA)

✅ **Refunds (Automatically):**
- Negative amounts = refunds
- Shown with green badge "Refund"
- Category: "Reembolsos"

---

## 📊 Example from Your Statement

**Your Credit Card:**
```
Card: VISA CLASSIC BSAB *0012
Credit Limit: €2,000.00
Current Debt: €1,226.75 (61.3% utilization ⚠️)
Available: €748.64
```

**Transactions Imported:**
```
16/10 | Aliexpress.com - LUXEMBOURG     | €24.61  | Purchase
09/10 | Aliexpress.com - INTERNET       | €20.26  | Purchase
09/10 | Aliexpress.com - INTERNET       | -€6.08  | 🔄 Refund
30/09 | Aliexpress.com - INTERNET       | €18.68  | Purchase
27/09 | SP PETALS STUDIO JEWEL          | -€4.98  | 🔄 Refund
```

---

## ✨ What Happens After Upload

### Dashboard Shows:
- All credit card expenses
- Refunds in green with badge
- Categorized automatically (Compras online, Regalos, etc.)

### Net Worth Calculation:
- Credit card debt is **subtracted** from net worth
- Balance shows as negative (debt)

### Insights:
- Spending patterns by category
- Refund tracking
- Month-over-month comparison

---

## 🔄 Monthly Updates

### How to Keep Your Data Current:

1. **Every Month:**
   - Download new credit card statement (last 30 days)
   - Upload to same credit card account
   - App skips duplicates automatically

2. **Multiple Cards:**
   - Create separate account for each card
   - Upload each statement to its account
   - View all cards together in dashboard

---

## 🆘 Troubleshooting

### "Failed to parse CSV"
- Make sure it's a Sabadell credit card export
- Check file contains "MOVIMIENTOS DE CREDITO" header
- Try saving Excel as CSV and retry

### "No transactions found"
- Verify your statement has transaction data
- Check date range includes transactions
- Look for "FECHA" and "IMPORTE" columns

### Transactions not showing refunds
- Negative amounts should auto-detect as refunds
- Check console logs (F12) for "isRefund: true"
- Refunds show in "Reembolsos" category

### Credit card info not detected
- Ensure CSV has "Límite de" and "Saldo dispuesto"
- Check credit limit is visible in statement
- Try exporting full statement (not filtered)

---

## 📁 File Format Support

✅ **Supported:**
- `.csv` - CSV files
- `.xls` - Excel 97-2003
- `.xlsx` - Excel 2007+

✅ **From Banks:**
- Banco Sabadell (Credit Cards)
- Banco Sabadell (Regular Accounts)
- ING (All account types)

---

## 💡 Pro Tips

### Tip 1: High Utilization Warning
Your current utilization is **61.3%** (€1,226.75 / €2,000)
- **Recommendation:** Keep below 30% for better credit score
- **Target:** Pay down to ~€600

### Tip 2: Export Full Period
- Download 3-6 months for better insights
- App handles duplicates automatically
- See spending trends over time

### Tip 3: Track Refunds
- All refunds auto-categorized as "Reembolsos"
- Easy to see what was returned
- Net spending calculation is accurate

### Tip 4: Multiple Cards
- Have multiple credit cards? No problem!
- Create account for each
- Track utilization per card
- See total debt across all cards

---

## 🎯 Ready to Upload?

### Quick Checklist:
- ✅ Downloaded credit card CSV from Sabadell
- ✅ Created credit card account in Settings (if needed)
- ✅ Open Upload tab
- ✅ Drag and drop your file
- ✅ Select your credit card account
- ✅ Click "Process and Upload"
- ✅ View results in Dashboard!

---

## 📞 Need Help?

If you encounter any issues:
1. Check browser console (F12 → Console)
2. Look for credit card detection logs
3. Verify CSV format matches Sabadell export
4. Try with sample data first

**The app will show detailed info when it detects a credit card!** 💳✨



