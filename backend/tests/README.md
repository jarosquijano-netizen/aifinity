# QA/UAT Sanity Check Test Suite

## Overview
This test suite performs comprehensive sanity checks on the AiFinity.app backend API to ensure:
- Authentication works correctly
- User data isolation (security)
- Calculations are accurate
- Data integrity (no NULL user_ids)
- Duplicate detection works
- All endpoints function properly

## Prerequisites
1. Backend server must be running
2. Database must be accessible
3. Node.js and npm installed

## Running Tests

### Local Testing
```bash
# Terminal 1: Start the backend server
cd backend
npm run dev

# Terminal 2: Run the tests
cd backend
npm run test:qa
```

### Production Testing
```bash
# Set the API URL environment variable
export API_BASE_URL=https://aifinity-production.up.railway.app/api
# Or on Windows:
set API_BASE_URL=https://aifinity-production.up.railway.app/api

# Run tests
cd backend
npm run test:qa
```

## Test Coverage

### 1. Authentication Tests
- ✅ User registration
- ✅ User login
- ✅ Token validation
- ✅ Invalid token rejection

### 2. Accounts Tests
- ✅ Create bank account
- ✅ Get user accounts
- ✅ Update account
- ✅ Account linked to correct user

### 3. Transactions Tests
- ✅ Upload transactions
- ✅ Get user transactions
- ✅ Duplicate detection
- ✅ Update transaction category

### 4. Summary & Calculations Tests
- ✅ Get summary statistics
- ✅ Income calculation accuracy
- ✅ Expenses calculation accuracy
- ✅ Current month income
- ✅ Net balance calculation

### 5. Trends Tests
- ✅ Get monthly trends
- ✅ Get insights

### 6. Budget Tests
- ✅ Get budget overview

### 7. User Isolation Tests (Security)
- ✅ User can only see own accounts
- ✅ User can only see own transactions
- ✅ User cannot update other user's accounts

### 8. Data Integrity Tests
- ✅ No NULL user_id in accounts
- ✅ No NULL user_id in transactions
- ✅ Duplicate transactions excluded from calculations

### 9. Cleanup Tests
- ✅ Delete transaction
- ✅ Delete account (with associated transactions)

## Expected Results
- **Success Rate**: Should be 100% (all tests passing)
- **Test Count**: ~30+ tests
- **Duration**: ~30-60 seconds

## Troubleshooting

### Server Not Running
```
Error: Cannot connect to server
Solution: Start the backend server with `npm run dev` in the backend directory
```

### Database Connection Issues
```
Error: Database connection failed
Solution: Check DATABASE_URL in .env file
```

### Authentication Failures
```
Error: Registration/login failed
Solution: Check if test user already exists, or database is accessible
```

## Test Data
- Test user is created with timestamp-based email to avoid conflicts
- Test data is automatically cleaned up after tests complete
- All test transactions and accounts are deleted

## Continuous Integration
These tests can be integrated into CI/CD pipelines:
```yaml
# Example GitHub Actions
- name: Run QA Tests
  run: |
    cd backend
    npm install
    npm run test:qa
```

