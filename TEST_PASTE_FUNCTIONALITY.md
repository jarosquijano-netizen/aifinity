# 🧪 Testing Paste Text Functionality - Guide

## Step 1: Start Servers (if not running)

### Quick Start:
Double-click: `START_LOCALHOST.bat`

### Manual Start:
```powershell
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## Step 2: Open the Application

1. Open browser: http://localhost:5173 (or http://localhost:3004)
2. Login to your account
3. Navigate to **Upload** tab

## Step 3: Test Paste Functionality

### Test Case 1: Simple CSV Format

1. Click **"Paste Text"** tab (next to "Upload File")
2. Copy and paste this sample CSV:

```
Bank,Date,Category,Description,Amount,Type
ING,2025-11-01,Groceries,Mercadona Shopping,-85.50,expense
ING,2025-11-02,Transport,Gas Station,-45.00,expense
ING,2025-11-03,Salary,Monthly Salary,2500.00,income
ING,2025-11-04,Restaurants,Restaurant La Tasca,-35.00,expense
ING,2025-11-05,Utilities,Electricity Bill,-120.00,expense
```

3. You should see "5 lines" counter at bottom
4. Click **"Process Pasted Content"** button
5. Check if transactions appear in Transactions tab

### Test Case 2: ING Bank Format

1. Still in **"Paste Text"** tab
2. Clear previous content (click "Clear")
3. Copy and paste this ING-style CSV:

```
F. VALOR,CATEGORÍA,DESCRIPCIÓN,IMPORTE
01/11/2025,Supermercado,Compra Mercadona,-85.50
02/11/2025,Transporte,Combustible Repsol,-45.00
03/11/2025,Ingresos,Nómina Mensual,2500.00
04/11/2025,Restaurantes,Cena La Tasca,-65.00
05/11/2025,Servicios,Factura Luz,-120.00
```

4. Click **"Process Pasted Content"**
5. Verify transactions are parsed correctly

## Step 4: Verify Results

✅ **Expected Behavior:**
- Textarea shows line count
- "Process Pasted Content" button appears when text is pasted
- Processing shows loading spinner
- Success message: "Successfully processed X transactions!"
- Transactions appear in Transactions tab
- Dashboard updates with new data

❌ **What to Check if Errors:**
- Browser console (F12) for JavaScript errors
- Network tab for API call failures
- Error message in red below the textarea

## Step 5: Test Account Selector

1. Make sure you have at least one account created
2. Paste some content
3. Click "Process Pasted Content"
4. You should see account selector modal
5. Select an account
6. Click "Process Pasted Content" again
7. Transactions should be linked to selected account

## Troubleshooting

**Issue: "No transactions found"**
- Check CSV format matches expected format
- Ensure columns are separated by commas
- Verify dates are in correct format (YYYY-MM-DD or DD/MM/YYYY)

**Issue: "Failed to parse pasted content"**
- Check browser console (F12) for detailed error
- Verify CSV has proper headers
- Try with simpler format first

**Issue: Button doesn't appear**
- Make sure textarea has content
- Check if textarea is visible (not in file mode)
- Refresh the page



