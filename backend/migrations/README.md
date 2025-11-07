# Migration: Fix user_id in Production

## Problem
Production data was created with `user_id = NULL` (shared/demo data), but after implementing copy-paste functionality, stricter `user_id` filtering was added. This caused production accounts and transactions to disappear for logged-in users.

## Solution
This migration script will:
1. Find the main user (first user in database, or user with email `jarosquijano@gmail.com`)
2. Update all accounts with `user_id = NULL` to belong to that user
3. Update all transactions with `user_id = NULL` to belong to that user
4. Update all settings with `user_id = NULL` to belong to that user
5. Update all categories with `user_id = NULL` to belong to that user (if exists)
6. Update all budgets with `user_id = NULL` to belong to that user (if exists)

## How to Run

### Option 1: Run directly with Node.js
```bash
cd backend
node migrations/fix-user-id.js
```

### Option 2: Run on Railway (Production)
1. SSH into your Railway instance or use Railway CLI
2. Navigate to backend directory
3. Run: `node migrations/fix-user-id.js`

### Option 3: Run via Railway CLI
```bash
railway run --service backend node migrations/fix-user-id.js
```

## Important Notes
- **Backup first**: Make sure you have a database backup before running this migration
- **One-time only**: This migration should only be run once
- **Transaction safe**: The migration uses database transactions, so if it fails, all changes will be rolled back
- **After migration**: All routes have been updated to use proper `user_id` filtering (no more temporary fixes)

## What Changed in Code
All routes have been updated to remove temporary fixes:
- ✅ `backend/routes/accounts.js` - Now filters by `user_id = $1` when logged in
- ✅ `backend/routes/transactions.js` - Now filters by `user_id = $1` when logged in
- ✅ `backend/routes/summary.js` - Now filters by `user_id = $1` when logged in
- ✅ `backend/routes/trends.js` - Now filters by `user_id = $1` when logged in
- ✅ `backend/routes/budget.js` - Now filters by `user_id = $1` when logged in
- ✅ `backend/routes/settings.js` - Now filters by `user_id = $1` when logged in

## Verification
After running the migration, verify:
1. All accounts have a `user_id` set (not NULL)
2. All transactions have a `user_id` set (not NULL)
3. All settings have a `user_id` set (not NULL)
4. Dashboard shows correct data
5. Transactions tab shows all transactions
6. Accounts tab shows all accounts

