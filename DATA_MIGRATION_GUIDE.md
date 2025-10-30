# 📦 Data Migration Guide

## Overview

This guide will help you transfer your data from localhost to production (jarosquijano@gmail.com).

---

## 🎯 What Will Be Migrated

- ✅ **Bank Accounts** (checking, savings, credit cards)
- ✅ **Transactions** (all history)
- ✅ **Budget Categories** (with amounts)
- ✅ **Settings** (expected income, etc.)

---

## 🚀 Step-by-Step Migration Process

### **Step 1: Export Data from Localhost**

1. **Make sure localhost backend is connected to your LOCAL database**
   
   Check `backend/.env`:
   ```env
   DATABASE_URL=postgresql://localhost:5432/finova
   # Or whatever your local database is
   ```

2. **Find your localhost user email**
   
   Run this to see your local users:
   ```bash
   cd C:\Users\joe_freightos\Desktop\Finova\backend
   node -e "import('./config/database.js').then(m => m.default.query('SELECT email FROM users').then(r => console.log(r.rows)).then(() => process.exit()))"
   ```

3. **Export your data**
   
   Replace `YOUR_LOCAL_EMAIL` with your actual local email:
   ```bash
   cd C:\Users\joe_freightos\Desktop\Finova\backend
   node export-user-data.js YOUR_LOCAL_EMAIL
   ```
   
   Example:
   ```bash
   node export-user-data.js user@example.com
   ```

4. **You'll see output like:**
   ```
   📦 Exporting data for user: user@example.com
   ✅ Found user: John Doe (ID: 1)
   📊 Found 3 bank accounts
   💳 Found 150 transactions
   💰 Found 12 budget categories
   ⚙️  Found 1 settings
   
   ✅ Export complete!
   📁 File: user-data-export-user-example.com-1730300000000.json
   ```

5. **Keep the filename!** You'll need it for import.

---

### **Step 2: Import Data to Production**

1. **Switch to PRODUCTION database**
   
   Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:KEyEBzoOCmqdvHBNReryrKfXnotrpIRq@maglev.proxy.rlwy.net:31201/railway
   ```

2. **Import the data**
   
   Use the filename from Step 1:
   ```bash
   cd C:\Users\joe_freightos\Desktop\Finova\backend
   node import-user-data.js user-data-export-user-example.com-1730300000000.json jarosquijano@gmail.com
   ```

3. **You'll see output like:**
   ```
   📥 Importing data from: user-data-export...json
   🎯 Target user: jarosquijano@gmail.com
   
   ✅ Found target user: Joe Quijano (ID: 1)
   
   📊 Importing bank accounts...
      ✓ Main Checking (checking)
      ✓ Savings Account (savings)
      ✓ Credit Card joe 0012 (credit)
   
   💳 Importing transactions...
      ✓ Imported 100 transactions...
      ✅ Total transactions imported: 150
   
   💰 Importing budget...
      ✓ Food: €500
      ✓ Transport: €200
      ✓ Entertainment: €150
   
   ⚙️  Importing settings...
      ✓ Expected income: €3000
   
   ✅ Import complete!
   🎉 Data successfully imported for jarosquijano@gmail.com!
   ```

---

## ✅ Verify Import

1. **Go to production**: https://aifinity.app
2. **Login** with `jarosquijano@gmail.com`
3. **Check Dashboard** - Should see your accounts
4. **Check Transactions** - Should see all your history
5. **Check Budget** - Should see your budget categories
6. **Check Settings** - Should see your expected income

---

## 🔧 Quick Commands

### **Export (Localhost)**
```bash
cd C:\Users\joe_freightos\Desktop\Finova\backend
node export-user-data.js YOUR_LOCAL_EMAIL
```

### **Import (Production)**
```bash
cd C:\Users\joe_freightos\Desktop\Finova\backend
node import-user-data.js EXPORT_FILE.json jarosquijano@gmail.com
```

---

## 🆘 Troubleshooting

### **Problem: "User not found" during export**
**Solution:** 
- Check your local database is running
- Verify the email exists: `SELECT * FROM users;`
- Make sure `backend/.env` points to localhost database

### **Problem: "User not found" during import**
**Solution:**
- Make sure `jarosquijano@gmail.com` is registered in production
- Check `backend/.env` points to production database

### **Problem: "Account ID mapping failed"**
**Solution:**
- This shouldn't happen, but if it does:
- Delete the imported data manually
- Re-run the import

### **Problem: Duplicate transactions**
**Solution:**
- Don't run import twice!
- If you did, you'll need to manually clean up:
```sql
-- Connect to production database
DELETE FROM transactions WHERE user_id = YOUR_USER_ID AND created_at > 'IMPORT_DATE';
```

---

## ⚠️ Important Notes

### **Before You Start:**
- ✅ Make sure you have a backup of your localhost data
- ✅ Test with a small export first
- ✅ Don't run import multiple times (causes duplicates)
- ✅ Switch `DATABASE_URL` in `.env` between export and import

### **Database URLs:**
- **Localhost**: `postgresql://localhost:5432/finova` (or your local)
- **Production**: `postgresql://postgres:KEyEBzoOCmqdvHBNReryrKfXnotrpIRq@maglev.proxy.rlwy.net:31201/railway`

### **Safety:**
- Import uses transactions (ROLLBACK on error)
- Export is read-only (doesn't change anything)
- Keeps original timestamps
- Maps account IDs automatically

---

## 📊 What Gets Migrated

| Data Type | Fields | Notes |
|-----------|--------|-------|
| **Bank Accounts** | name, type, balance, currency, color, credit_limit | IDs are remapped |
| **Transactions** | date, description, amount, category, type, account | account_id mapped to new account |
| **Budget** | category, amount, color, icon | Overwrites existing if exists |
| **Settings** | expected_income, actual_income | Overwrites existing if exists |

---

## 🎯 Migration Checklist

### **Pre-Migration:**
- [ ] Localhost data is ready
- [ ] Know your local user email
- [ ] `backend/.env` points to local database
- [ ] Backend dependencies installed (`npm install`)

### **Export:**
- [ ] Run export script
- [ ] Note the output filename
- [ ] Verify export file exists
- [ ] Check file size (should be >1KB if you have data)

### **Pre-Import:**
- [ ] Switch `backend/.env` to production database
- [ ] Verify target user exists in production
- [ ] Have export filename ready

### **Import:**
- [ ] Run import script with correct filename
- [ ] Watch for errors in console
- [ ] Verify "Import complete" message

### **Post-Import:**
- [ ] Login to https://aifinity.app
- [ ] Check Dashboard shows accounts
- [ ] Check Transactions list
- [ ] Check Budget categories
- [ ] Verify balances are correct

---

## 🔄 Alternative: Manual SQL Export/Import

If the scripts don't work, you can use SQL:

### **Export SQL (Localhost):**
```sql
-- Export to SQL file
pg_dump -U postgres -d finova -t bank_accounts -t transactions -t budget -t user_settings --data-only > backup.sql
```

### **Import SQL (Production):**
```sql
-- Import from SQL file (be careful with IDs!)
psql -h maglev.proxy.rlwy.net -p 31201 -U postgres -d railway < backup.sql
```

**Note:** This method requires manual ID mapping!

---

## ✅ Success Indicators

After import, you should see in production:
- ✅ All your bank accounts in Dashboard
- ✅ All transactions in Transactions tab
- ✅ Budget categories populated
- ✅ Correct account balances
- ✅ Settings preserved
- ✅ No errors in console

---

## 📝 Example Full Migration

```bash
# 1. Export from localhost
cd C:\Users\joe_freightos\Desktop\Finova\backend

# Make sure .env points to localhost
# DATABASE_URL=postgresql://localhost:5432/finova

node export-user-data.js myemail@localhost.com

# Output: user-data-export-myemail-localhost.com-1730300000000.json

# 2. Switch to production
# Update .env:
# DATABASE_URL=postgresql://postgres:KEyEBzoOCmqdvHBNReryrKfXnotrpIRq@maglev.proxy.rlwy.net:31201/railway

# 3. Import to production
node import-user-data.js user-data-export-myemail-localhost.com-1730300000000.json jarosquijano@gmail.com

# 4. Verify in browser
# Go to https://aifinity.app and check!
```

---

**Created:** October 30, 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready to Use

