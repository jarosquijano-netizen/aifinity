# 🧪 AiFinity.app - Comprehensive Test Cases

**Last Updated:** October 29, 2025  
**Version:** 2.0.0  
**Status:** Ready for Testing

---

## 📋 Table of Contents

1. [Authentication Tests](#authentication-tests)
2. [Dashboard Tests](#dashboard-tests)
3. [Transactions Tests](#transactions-tests)
4. [Credit Card Tests](#credit-card-tests)
5. [Budget Tests](#budget-tests)
6. [Transfer Tests](#transfer-tests)
7. [Upload Tests](#upload-tests)
8. [Settings Tests](#settings-tests)
9. [UI/UX Tests](#uiux-tests)
10. [Performance Tests](#performance-tests)
11. [Security Tests](#security-tests)
12. [Production Tests](#production-tests)

---

## 🔐 Authentication Tests

### Test 1.1: User Registration
**Objective:** Verify new users can register successfully

**Steps:**
1. Open app (localhost or production)
2. Click "Register" or "Sign Up"
3. Enter valid email: `test@example.com`
4. Enter strong password: `Test123!@#`
5. Enter full name: `Test User`
6. Click "Register"

**Expected Result:**
- ✅ User is created in database
- ✅ JWT token is generated
- ✅ User is redirected to Dashboard
- ✅ Header shows user name and email

**Status:** ⏸️ Pending

---

### Test 1.2: User Login
**Objective:** Verify existing users can login

**Steps:**
1. Open app
2. Enter existing email
3. Enter correct password
4. Click "Login"

**Expected Result:**
- ✅ User is authenticated
- ✅ Dashboard loads
- ✅ User data persists across page refresh

**Status:** ⏸️ Pending

---

### Test 1.3: Invalid Login
**Objective:** Verify error handling for invalid credentials

**Steps:**
1. Enter invalid email
2. Enter any password
3. Click "Login"

**Expected Result:**
- ❌ Error message: "Invalid email or password"
- ❌ User remains on login screen
- ❌ No data is exposed

**Status:** ⏸️ Pending

---

### Test 1.4: Logout
**Objective:** Verify logout functionality

**Steps:**
1. Login as user
2. Click user profile dropdown
3. Click "Logout"

**Expected Result:**
- ✅ User is logged out
- ✅ Redirected to login screen
- ✅ All user data cleared from localStorage
- ✅ Cannot access protected routes

**Status:** ⏸️ Pending

---

### Test 1.5: Session Persistence
**Objective:** Verify user stays logged in after page refresh

**Steps:**
1. Login as user
2. Navigate to Dashboard
3. Refresh page (F5)

**Expected Result:**
- ✅ User remains logged in
- ✅ Dashboard loads correctly
- ✅ No re-authentication required

**Status:** ⏸️ Pending

---

## 📊 Dashboard Tests

### Test 2.1: Dashboard Loads
**Objective:** Verify dashboard displays correctly

**Steps:**
1. Login as user
2. Navigate to Dashboard tab

**Expected Result:**
- ✅ Total balance displays correctly
- ✅ Bank accounts list appears
- ✅ Credit cards widget appears (if credit cards exist)
- ✅ Recent transactions shown
- ✅ Charts render correctly

**Status:** ⏸️ Pending

---

### Test 2.2: Balance Calculation
**Objective:** Verify total balance is calculated correctly

**Pre-conditions:**
- Bank Account 1: €1,000
- Bank Account 2: €500
- Credit Card 1: -€1,251.36 (debt)

**Expected Result:**
- ✅ Total Balance = €1,000 + €500 - €1,251.36 = €248.64
- ✅ Positive balance shows in green
- ✅ Negative balance shows in red

**Status:** ⏸️ Pending

---

### Test 2.3: Credit Card Widget
**Objective:** Verify credit card widget displays correct info

**Pre-conditions:**
- Credit Card with €2,000 limit
- Current debt: €1,251.36

**Expected Result:**
- ✅ Credit Limit: €2,000.00
- ✅ Current Debt: €1,251.36
- ✅ Available Credit: €748.64 (€2,000 - €1,251.36)
- ✅ Utilization: 62.57%
- ✅ Progress bar shows 62.57%
- ✅ Color changes based on utilization:
  - Green: 0-30%
  - Yellow: 31-70%
  - Red: 71-100%

**Status:** ⏸️ Pending

---

### Test 2.4: Account Management
**Objective:** Verify users can add/edit/delete accounts

**Add Account:**
1. Click "+ Add Account"
2. Enter name: "Checking Account"
3. Select type: "checking"
4. Enter balance: €1,000
5. Select currency: EUR
6. Select color
7. Click "Save"

**Expected Result:**
- ✅ Account appears in list
- ✅ Balance updates
- ✅ Data saved to database

**Edit Account:**
1. Click "Edit" on account
2. Change balance to €1,500
3. Click "Save"

**Expected Result:**
- ✅ Balance updates
- ✅ Total balance recalculates

**Delete Account:**
1. Click "Delete" on account
2. Confirm deletion

**Expected Result:**
- ✅ Account removed from list
- ✅ Transactions remain (orphaned)
- ✅ Total balance recalculates

**Status:** ⏸️ Pending

---

## 💳 Transactions Tests

### Test 3.1: View Transactions
**Objective:** Verify transactions display correctly

**Steps:**
1. Navigate to Transactions tab

**Expected Result:**
- ✅ All transactions listed
- ✅ Sorted by date (newest first)
- ✅ Shows: date, description, category, amount, account
- ✅ Income shown in green
- ✅ Expenses shown in red
- ✅ Credit card icon appears for credit card transactions
- ✅ Transfer icon appears for transfers

**Status:** ⏸️ Pending

---

### Test 3.2: Filter Transactions
**Objective:** Verify filtering works

**By Date:**
1. Select date range: Last 30 days
2. Apply filter

**Expected Result:**
- ✅ Only transactions within range shown

**By Category:**
1. Select category: "Food"
2. Apply filter

**Expected Result:**
- ✅ Only "Food" transactions shown

**By Account:**
1. Select account: "Credit Card Joe 0012"
2. Apply filter

**Expected Result:**
- ✅ Only transactions from that account shown

**Status:** ⏸️ Pending

---

### Test 3.3: Search Transactions
**Objective:** Verify search functionality

**Steps:**
1. Enter search term: "Aliexpress"
2. Press Enter

**Expected Result:**
- ✅ Only transactions containing "Aliexpress" shown
- ✅ Search is case-insensitive

**Status:** ⏸️ Pending

---

### Test 3.4: Edit Transaction
**Objective:** Verify transaction editing

**Steps:**
1. Click "Edit" on transaction
2. Change category from "Shopping" to "Food"
3. Click "Save"

**Expected Result:**
- ✅ Category updates
- ✅ Budget calculations update
- ✅ Changes saved to database

**Status:** ⏸️ Pending

---

### Test 3.5: Delete Transaction
**Objective:** Verify transaction deletion

**Steps:**
1. Note current balance
2. Click "Delete" on €50 expense
3. Confirm deletion

**Expected Result:**
- ✅ Transaction removed
- ✅ Balance increases by €50
- ✅ Budget recalculates

**Status:** ⏸️ Pending

---

## 💳 Credit Card Tests

### Test 4.1: Upload Credit Card Statement
**Objective:** Verify credit card CSV upload

**Steps:**
1. Navigate to Upload tab
2. Create credit card account first (if not exists)
3. Select CSV file: "Credit Card Joe 0012.csv"
4. Select account: "Credit Card Joe 0012"
5. Click "Upload"

**Expected Result:**
- ✅ All transactions extracted correctly
- ✅ Credit limit detected: €2,000
- ✅ Current debt calculated: €1,251.36
- ✅ Purchases as expenses (negative)
- ✅ Refunds as income (positive)
- ✅ Categories auto-assigned
- ✅ Account balance updated
- ✅ Success message appears

**Status:** ⏸️ Pending

---

### Test 4.2: European Number Format
**Objective:** Verify correct parsing of European numbers

**Test Cases:**
- "1.251,36" → 1251.36
- "18,80" → 18.80
- "-6,08" → -6.08
- "2.000,00" → 2000.00

**Expected Result:**
- ✅ All numbers parsed correctly
- ✅ No NaN values
- ✅ Calculations accurate

**Status:** ⏸️ Pending

---

### Test 4.3: Credit Card Icon
**Objective:** Verify credit card transactions have icon

**Steps:**
1. Upload credit card statement
2. Navigate to Transactions tab

**Expected Result:**
- ✅ Credit card icon (💳) appears next to transactions
- ✅ Tooltip shows: "Credit Card Transaction"

**Status:** ⏸️ Pending

---

### Test 4.4: Credit Limit Update
**Objective:** Verify credit limit updates from statement

**Steps:**
1. Create credit card with €0 limit
2. Upload statement with €2,000 limit

**Expected Result:**
- ✅ Credit limit updates to €2,000
- ✅ Dashboard reflects new limit
- ✅ Widget displays correctly

**Status:** ⏸️ Pending

---

## 💰 Budget Tests

### Test 5.1: View Budget Categories
**Objective:** Verify budget categories display

**Steps:**
1. Navigate to Budget tab

**Expected Result:**
- ✅ All default categories shown (30+)
- ✅ Each category shows:
  - Name
  - Budget amount
  - Spent amount
  - Remaining amount
  - Progress bar
- ✅ Categories with $0 budget shown as "Not set"

**Status:** ⏸️ Pending

---

### Test 5.2: Set Budget Amount
**Objective:** Verify budget setting

**Steps:**
1. Find "Food" category
2. Click "Edit"
3. Set budget: €300
4. Click "Save"

**Expected Result:**
- ✅ Budget saved
- ✅ Progress bar updates
- ✅ Spending vs budget calculated

**Status:** ⏸️ Pending

---

### Test 5.3: Budget Alerts
**Objective:** Verify over-budget alerts

**Pre-conditions:**
- "Food" budget: €300
- "Food" spending: €350

**Expected Result:**
- ✅ Progress bar shows 116.67%
- ✅ Bar color is red
- ✅ Warning icon appears
- ✅ Message: "€50.00 over budget"

**Status:** ⏸️ Pending

---

### Test 5.4: Budget for New Users
**Objective:** Verify new users see all categories

**Steps:**
1. Create new user account
2. Login
3. Navigate to Budget tab

**Expected Result:**
- ✅ All categories appear
- ✅ All budgets are €0 (ready to set up)
- ✅ No "no data" message

**Status:** ⏸️ Pending

---

## 🔄 Transfer Tests

### Test 6.1: Create Transfer
**Objective:** Verify inter-account transfers

**Steps:**
1. Navigate to Dashboard
2. Click "Transferir" button
3. Select FROM account: "Checking"
4. Select TO account: "Savings"
5. Enter amount: €100
6. Enter date: Today
7. Enter description: "Monthly savings"
8. Click "Create Transfer"

**Expected Result:**
- ✅ Two transactions created:
  - Expense from Checking: -€100
  - Income to Savings: +€100
- ✅ Both marked as `computable: false`
- ✅ Both have category "Transferencias"
- ✅ Both have transfer icon
- ✅ Account balances update correctly
- ✅ Total balance remains the same
- ✅ Transfers excluded from budget calculations

**Status:** ⏸️ Pending

---

### Test 6.2: Auto-Detect Transfers
**Objective:** Verify automatic transfer detection

**Steps:**
1. Upload bank statement with same amount on same day
2. Check transactions list

**Expected Result:**
- ✅ Transfers detected automatically
- ✅ Marked as "Transferencias"
- ✅ Excluded from analytics

**Status:** ⏸️ Pending

---

### Test 6.3: Transfer Button Visibility
**Objective:** Verify transfer button appears correctly

**Test Case 1: 0 accounts**
- Expected: ❌ Button hidden

**Test Case 2: 1 account**
- Expected: ❌ Button hidden

**Test Case 3: 2+ accounts**
- Expected: ✅ Button visible

**Status:** ⏸️ Pending

---

## 📤 Upload Tests

### Test 7.1: Upload CSV
**Objective:** Verify CSV file upload

**Steps:**
1. Navigate to Upload tab
2. Select CSV file
3. Select account
4. Click "Upload"

**Expected Result:**
- ✅ File parsed correctly
- ✅ Transactions extracted
- ✅ Categories assigned
- ✅ Account balance updated
- ✅ Success message

**Status:** ⏸️ Pending

---

### Test 7.2: Upload XLS/XLSX
**Objective:** Verify Excel file upload

**Steps:**
1. Select .xls or .xlsx file
2. Select account
3. Click "Upload"

**Expected Result:**
- ✅ File parsed correctly
- ✅ Same as CSV upload

**Status:** ⏸️ Pending

---

### Test 7.3: Invalid File Format
**Objective:** Verify error handling

**Steps:**
1. Select .txt file
2. Try to upload

**Expected Result:**
- ❌ Error: "Invalid file format"
- ❌ Upload rejected

**Status:** ⏸️ Pending

---

### Test 7.4: Empty File
**Objective:** Verify empty file handling

**Steps:**
1. Select empty CSV
2. Try to upload

**Expected Result:**
- ❌ Error: "No transactions found"
- ❌ Upload rejected

**Status:** ⏸️ Pending

---

## ⚙️ Settings Tests

### Test 8.1: Change Language
**Objective:** Verify language switching

**Steps:**
1. Navigate to Settings
2. Click language toggle (EN/ES)

**Expected Result:**
- ✅ All UI text updates instantly
- ✅ Preference saved to localStorage
- ✅ Persists after page refresh

**Status:** ⏸️ Pending

---

### Test 8.2: Change Theme
**Objective:** Verify dark/light mode

**Steps:**
1. Click theme toggle
2. Switch to dark mode

**Expected Result:**
- ✅ Colors invert instantly
- ✅ All components update
- ✅ Preference saved
- ✅ Persists after refresh

**Status:** ⏸️ Pending

---

### Test 8.3: Currency Settings
**Objective:** Verify currency management

**Steps:**
1. Change default currency to USD
2. Create new account

**Expected Result:**
- ✅ Account defaults to USD
- ✅ Amounts displayed with $ symbol

**Status:** ⏸️ Pending

---

## 🎨 UI/UX Tests

### Test 9.1: Responsive Design
**Objective:** Verify mobile/tablet layouts

**Test on:**
- 📱 Mobile (375px)
- 📱 Tablet (768px)
- 💻 Desktop (1024px)
- 🖥️ Large Desktop (1920px)

**Expected Result:**
- ✅ Layout adapts correctly
- ✅ No horizontal scroll
- ✅ Touch targets large enough
- ✅ Text readable

**Status:** ⏸️ Pending

---

### Test 9.2: Accessibility
**Objective:** Verify accessibility features

**Tests:**
- ✅ Keyboard navigation works
- ✅ Tab order logical
- ✅ Focus indicators visible
- ✅ Screen reader compatible
- ✅ Color contrast WCAG AA

**Status:** ⏸️ Pending

---

### Test 9.3: Loading States
**Objective:** Verify loading indicators

**Expected:**
- ✅ Spinner shows during data fetch
- ✅ Skeleton screens for content
- ✅ No blank screens

**Status:** ⏸️ Pending

---

### Test 9.4: Error Messages
**Objective:** Verify error handling UI

**Expected:**
- ✅ Clear error messages
- ✅ Actionable suggestions
- ✅ No technical jargon

**Status:** ⏸️ Pending

---

## ⚡ Performance Tests

### Test 10.1: Page Load Time
**Objective:** Verify fast loading

**Metrics:**
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s

**Status:** ⏸️ Pending

---

### Test 10.2: Large Dataset
**Objective:** Verify performance with 10,000+ transactions

**Steps:**
1. Import 10,000 transactions
2. Navigate to Transactions tab
3. Apply filters

**Expected Result:**
- ✅ List renders < 2s
- ✅ Filtering < 500ms
- ✅ Scrolling smooth (60fps)

**Status:** ⏸️ Pending

---

### Test 10.3: Memory Usage
**Objective:** Verify no memory leaks

**Steps:**
1. Use app for 30 minutes
2. Switch tabs frequently
3. Check browser memory

**Expected Result:**
- ✅ Memory remains stable
- ✅ No increasing memory usage

**Status:** ⏸️ Pending

---

## 🔒 Security Tests

### Test 11.1: SQL Injection
**Objective:** Verify SQL injection protection

**Steps:**
1. Try login with: `' OR '1'='1`
2. Try description: `'; DROP TABLE transactions;--`

**Expected Result:**
- ❌ Injection attempts fail
- ✅ No database damage

**Status:** ⏸️ Pending

---

### Test 11.2: XSS Attack
**Objective:** Verify XSS protection

**Steps:**
1. Enter description: `<script>alert('XSS')</script>`
2. Save transaction

**Expected Result:**
- ✅ Script not executed
- ✅ Text sanitized

**Status:** ⏸️ Pending

---

### Test 11.3: CORS
**Objective:** Verify CORS configuration

**Steps:**
1. Try API request from different origin

**Expected Result:**
- ❌ Request blocked (localhost/aifinity.app only)

**Status:** ⏸️ Pending

---

### Test 11.4: JWT Security
**Objective:** Verify token security

**Tests:**
- ✅ Token expires after 7 days
- ✅ Invalid tokens rejected
- ✅ Tokens not exposed in URL
- ✅ HTTPS only in production

**Status:** ⏸️ Pending

---

## 🌐 Production Tests

### Test 12.1: Production Login
**Objective:** Verify production authentication

**Steps:**
1. Open https://aifinity.app
2. Create account
3. Login

**Expected Result:**
- ✅ HTTPS connection
- ✅ JWT tokens work
- ✅ Data persists

**Status:** ⏸️ Pending

---

### Test 12.2: Production Upload
**Objective:** Verify production file handling

**Steps:**
1. Login to production
2. Upload CSV file

**Expected Result:**
- ✅ File uploads to Railway backend
- ✅ Data saved to Railway PostgreSQL
- ✅ Dashboard updates

**Status:** ⏸️ Pending

---

### Test 12.3: Production Performance
**Objective:** Verify production speed

**Metrics:**
- API response time: < 500ms
- Page load: < 3s
- Database queries: < 100ms

**Status:** ⏸️ Pending

---

### Test 12.4: PWA Installation
**Objective:** Verify PWA functionality

**Steps:**
1. Open https://aifinity.app on mobile
2. Click "Add to Home Screen"
3. Open installed app

**Expected Result:**
- ✅ App installs
- ✅ Icon appears on home screen
- ✅ Opens in standalone mode
- ✅ Works offline (cached)

**Status:** ⏸️ Pending

---

## 📊 Test Summary

| Category | Total Tests | Passed | Failed | Pending |
|----------|------------|--------|--------|---------|
| Authentication | 5 | 0 | 0 | 5 |
| Dashboard | 4 | 0 | 0 | 4 |
| Transactions | 5 | 0 | 0 | 5 |
| Credit Cards | 4 | 0 | 0 | 4 |
| Budget | 4 | 0 | 0 | 4 |
| Transfers | 3 | 0 | 0 | 3 |
| Upload | 4 | 0 | 0 | 4 |
| Settings | 3 | 0 | 0 | 3 |
| UI/UX | 4 | 0 | 0 | 4 |
| Performance | 3 | 0 | 0 | 3 |
| Security | 4 | 0 | 0 | 4 |
| Production | 4 | 0 | 0 | 4 |
| **TOTAL** | **47** | **0** | **0** | **47** |

---

## 🎯 Testing Priority

### 🔴 Critical (Must Pass)
1. Authentication (all tests)
2. Dashboard balance calculation
3. Transaction upload
4. Credit card functionality
5. Production deployment

### 🟡 Important (Should Pass)
6. Budget management
7. Transfer functionality
8. Filtering and search
9. Security tests

### 🟢 Nice to Have
10. Performance tests
11. Accessibility
12. PWA features

---

## 📝 Test Execution Log

### Run 1: [DATE]
- **Tester:** [NAME]
- **Environment:** Localhost
- **Browser:** Chrome
- **Results:** [LINK]

### Run 2: [DATE]
- **Tester:** [NAME]
- **Environment:** Production
- **Browser:** Safari
- **Results:** [LINK]

---

## 🐛 Known Issues

1. **Issue:** [Description]
   - **Severity:** High/Medium/Low
   - **Status:** Open/In Progress/Fixed
   - **Assigned:** [NAME]

---

## ✅ Testing Checklist

Before deploying to production:

- [ ] All Critical tests pass
- [ ] All Important tests pass
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Accessibility verified
- [ ] Documentation updated

---

**Test Coordinator:** AI Assistant  
**Last Run:** Pending  
**Next Run:** When user wakes up 😴

