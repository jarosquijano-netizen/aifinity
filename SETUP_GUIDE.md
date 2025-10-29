# Finova - Quick Setup Guide 🚀

This guide will help you get Finova running on your local machine in just a few minutes.

## Prerequisites Check ✅

Run these commands to check if you have the required software:

```bash
# Check Node.js (should be v16+)
node --version

# Check npm
npm --version

# Check PostgreSQL
psql --version
```

If any are missing, install them first:
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/

## Quick Start (5 minutes) ⚡

### Step 1: Database Setup (2 min)

```bash
# Start PostgreSQL (if not running)
# Windows: Open Services and start PostgreSQL
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Create database
psql -U postgres -c "CREATE DATABASE finova;"
```

### Step 2: Backend Setup (2 min)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# The .env file is already configured with defaults
# If you have a different PostgreSQL password, edit backend/.env

# Run database migrations
npm run migrate

# Start backend server
npm run dev
```

You should see:
```
🚀 Finova API server running on http://localhost:5000
✅ Connected to PostgreSQL database
```

### Step 3: Frontend Setup (1 min)

Open a NEW terminal window:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

You should see:
```
VITE ready in X ms
➜ Local: http://localhost:3000
```

### Step 4: Open App 🎉

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the Finova dashboard!

## First Steps 📝

1. **Optional**: Click "Login" to create an account, or use demo mode
2. Go to the **Upload** tab
3. Drag and drop a PDF bank statement (ING or Sabadell)
4. Click "Process and Upload"
5. Navigate to **Dashboard** to see your financial data visualized!

## Sample CSV for Testing

If you don't have a bank statement, create a file called `sample.csv`:

```csv
Bank,Date,Category,Description,Amount,Type
ING,2024-01-15,Groceries,Mercadona Shopping,85.50,expense
ING,2024-01-16,Transport,Gas Station,45.00,expense
ING,2024-01-20,Salary,Monthly Salary,2500.00,income
ING,2024-01-25,Restaurants,Restaurant La Tasca,35.00,expense
Sabadell,2024-02-01,Rent,Monthly Rent Payment,800.00,expense
Sabadell,2024-02-05,Utilities,Electricity Bill,65.00,expense
Sabadell,2024-02-10,Entertainment,Netflix Subscription,15.99,expense
Sabadell,2024-02-15,Groceries,Carrefour,92.30,expense
Sabadell,2024-02-20,Salary,Monthly Salary,2500.00,income
ING,2024-03-01,Transport,Metro Card,40.00,expense
```

Upload this CSV to see data across multiple months!

## Troubleshooting 🔧

### "Database connection error"
- Check if PostgreSQL is running
- Verify password in `backend/.env` matches your PostgreSQL password
- Try: `psql -U postgres` to test connection

### "Port 5000 already in use"
- Change PORT in `backend/.env` to another port (e.g., 5001)
- Update `VITE_API_URL` in `frontend/.env` accordingly

### "Port 3000 already in use"
- The app will automatically suggest another port (e.g., 3001)
- Just press 'y' when Vite asks

### PDF parsing not working
- Ensure the PDF contains text (not scanned images)
- Check browser console (F12) for errors
- Try with the sample CSV first

## Default Credentials 🔑

The app works without login (demo mode), but if you want to test authentication:

1. Click "Login" → "Register"
2. Enter any email and password
3. Click "Register"

Your data will be private to your account.

## What's Next? 📈

- **Upload more statements** to see trends across months
- **View Insights** tab for AI-generated financial advice
- **Export your data** as CSV or Excel
- **Customize categories** in the code (see README.md)

## Need Help? 💬

- Check the full README.md for detailed documentation
- Review API endpoints and project structure
- Look at troubleshooting section

---

Enjoy using Finova! 🎉








