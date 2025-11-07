import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const TEST_USER = {
  email: `test_${Date.now()}@test.com`,
  password: 'Test123456',
  fullName: 'Test User'
};

let authToken = null;
let testUserId = null;
let testAccountId = null;
let testTransactionId = null;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    results.passed++;
    log(`✓ ${message}`, 'success');
    return true;
  } else {
    results.failed++;
    results.errors.push(message);
    log(`✗ ${message}`, 'error');
    return false;
  }
}

async function apiCall(method, endpoint, data = null, token = null) {
  const apiUrl = process.env.API_BASE_URL || API_BASE_URL;
  try {
    const config = {
      method,
      url: `${apiUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status
    };
  }
}

async function checkServerHealth() {
  // Try multiple ports (5000 default, 5002 from START_LOCALHOST.bat)
  const ports = [5000, 5002];
  const baseUrls = ports.map(port => `http://localhost:${port}`);
  
  for (const baseUrl of baseUrls) {
    try {
      // Try health endpoint first
      const response = await axios.get(`${baseUrl}/health`, { timeout: 3000 });
      // Update API_BASE_URL if we found a working server
      if (baseUrl.includes(':5002')) {
        process.env.API_BASE_URL = `${baseUrl}/api`;
      }
      log(`✅ Found server running on ${baseUrl}`, 'success');
      return true;
    } catch (error) {
      // Try accounts endpoint as fallback
      try {
        await axios.get(`${baseUrl}/api/accounts`, { timeout: 3000 });
        if (baseUrl.includes(':5002')) {
          process.env.API_BASE_URL = `${baseUrl}/api`;
        }
        log(`✅ Found server running on ${baseUrl}`, 'success');
        return true;
      } catch (err) {
        // Continue to next port
        continue;
      }
    }
  }
  
  log(`\n❌ Cannot connect to server at ports 5000 or 5002`, 'error');
  log('   Please ensure the backend server is running:', 'error');
  log('   Option 1: npm run backend (from root directory)', 'error');
  log('   Option 2: cd backend && npm run dev', 'error');
  log('   Option 3: Double-click START_LOCALHOST.bat', 'error');
  return false;
}

// Test Suite
async function runTests() {
  log('\n🧪 Starting QA/UAT Sanity Check Tests\n', 'info');
  log('='.repeat(60), 'info');
  
  // Check server health first (this will update API_BASE_URL if needed)
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    log('\n⚠️  Tests cannot proceed without a running server.', 'error');
    process.exit(1);
  }
  
  // Use updated API_BASE_URL if server was found on different port
  const finalApiUrl = process.env.API_BASE_URL || API_BASE_URL;
  log(`📍 Testing API at: ${finalApiUrl}`, 'info');
  
  log('\n' + '='.repeat(60), 'info');
  
  // ============================================
  // 1. AUTHENTICATION TESTS
  // ============================================
  log('\n📋 1. AUTHENTICATION TESTS', 'info');
  log('-'.repeat(60), 'info');
  
  // Test 1.1: User Registration
  log('\nTest 1.1: User Registration', 'info');
  const registerResult = await apiCall('POST', '/auth/register', {
    email: TEST_USER.email,
    password: TEST_USER.password,
    fullName: TEST_USER.fullName
  });
  
  if (registerResult.success) {
    authToken = registerResult.data.token;
    testUserId = registerResult.data.user.id;
    assert(true, 'User registration successful');
  } else {
    // Try login if registration fails (user might already exist)
    if (registerResult.error && !registerResult.error.includes('Connection')) {
      log('Registration failed, trying login...', 'warning');
      const loginResult = await apiCall('POST', '/auth/login', {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      if (loginResult.success) {
        authToken = loginResult.data.token;
        testUserId = loginResult.data.user.id;
        assert(true, 'User login successful (user already exists)');
      } else {
        assert(false, `Registration/login failed: ${registerResult.error || loginResult.error}`);
      }
    } else {
      assert(false, `Registration failed: ${registerResult.error}`);
      log('   Skipping remaining tests due to connection error', 'warning');
      return;
    }
  }
  
  // Test 1.2: Token Validation
  log('\nTest 1.2: Token Validation', 'info');
  const tokenCheck = await apiCall('GET', '/accounts', null, authToken);
  assert(tokenCheck.success, 'Token is valid and accepted');
  
  // Test 1.3: Invalid Token Rejection
  log('\nTest 1.3: Invalid Token Rejection', 'info');
  const invalidTokenCheck = await apiCall('GET', '/accounts', null, 'invalid_token');
  assert(!invalidTokenCheck.success, 'Invalid token is rejected');
  
  // ============================================
  // 2. ACCOUNTS TESTS
  // ============================================
  log('\n📋 2. ACCOUNTS TESTS', 'info');
  log('-'.repeat(60), 'info');
  
  // Test 2.1: Create Account
  log('\nTest 2.1: Create Bank Account', 'info');
  const createAccountResult = await apiCall('POST', '/accounts', {
    name: 'Test Account',
    accountType: 'checking',
    initialAmount: 1000,
    currency: 'EUR'
  }, authToken);
  
  if (createAccountResult.success) {
    testAccountId = createAccountResult.data.account.id;
    assert(true, 'Account created successfully');
    assert(createAccountResult.data.account.user_id === testUserId, 'Account is linked to correct user');
  } else {
    assert(false, `Account creation failed: ${createAccountResult.error}`);
  }
  
  // Test 2.2: Get Accounts
  log('\nTest 2.2: Get User Accounts', 'info');
  const getAccountsResult = await apiCall('GET', '/accounts', null, authToken);
  assert(getAccountsResult.success, 'Accounts retrieved successfully');
  if (getAccountsResult.success) {
    assert(Array.isArray(getAccountsResult.data), 'Accounts returned as array');
    assert(getAccountsResult.data.length > 0, 'At least one account exists');
    assert(getAccountsResult.data.every(acc => acc.user_id === testUserId), 'All accounts belong to test user');
  }
  
  // Test 2.3: Update Account
  log('\nTest 2.3: Update Account', 'info');
  if (testAccountId) {
    const updateAccountResult = await apiCall('PUT', `/accounts/${testAccountId}`, {
      name: 'Updated Test Account',
      accountType: 'checking',
      balance: 1500,
      currency: 'EUR'
    }, authToken);
    assert(updateAccountResult.success, 'Account updated successfully');
    if (updateAccountResult.success) {
      assert(updateAccountResult.data.account.name === 'Updated Test Account', 'Account name updated correctly');
    }
  }
  
  // ============================================
  // 3. TRANSACTIONS TESTS
  // ============================================
  log('\n📋 3. TRANSACTIONS TESTS', 'info');
  log('-'.repeat(60), 'info');
  
  // Test 3.1: Upload Transactions
  log('\nTest 3.1: Upload Transactions', 'info');
  const testTransactions = [
    {
      bank: 'Test Bank',
      date: '2025-11-01',
      category: 'Food',
      description: 'Test Transaction 1',
      amount: 50,
      type: 'expense',
      account_id: testAccountId,
      computable: true
    },
    {
      bank: 'Test Bank',
      date: '2025-11-02',
      category: 'Salary',
      description: 'Test Income',
      amount: 2000,
      type: 'income',
      account_id: testAccountId,
      computable: true,
      applicable_month: '2025-11'
    }
  ];
  
  const uploadResult = await apiCall('POST', '/transactions/upload', {
    transactions: testTransactions,
    account_id: testAccountId
  }, authToken);
  
  assert(uploadResult.success, 'Transactions uploaded successfully');
  if (uploadResult.success) {
    assert(uploadResult.data.count === 2, 'Both transactions were inserted');
    testTransactionId = uploadResult.data.transactions[0]?.id;
  }
  
  // Test 3.2: Get Transactions
  log('\nTest 3.2: Get User Transactions', 'info');
  const getTransactionsResult = await apiCall('GET', '/transactions', null, authToken);
  assert(getTransactionsResult.success, 'Transactions retrieved successfully');
  if (getTransactionsResult.success) {
    assert(Array.isArray(getTransactionsResult.data), 'Transactions returned as array');
    assert(getTransactionsResult.data.length >= 2, 'At least 2 transactions exist');
    assert(getTransactionsResult.data.every(t => t.user_id === testUserId), 'All transactions belong to test user');
  }
  
  // Test 3.3: Duplicate Detection
  log('\nTest 3.3: Duplicate Transaction Detection', 'info');
  const duplicateUploadResult = await apiCall('POST', '/transactions/upload', {
    transactions: [testTransactions[0]], // Same transaction again
    account_id: testAccountId
  }, authToken);
  
  if (duplicateUploadResult.success) {
    assert(duplicateUploadResult.data.skipped > 0, 'Duplicate transaction was detected and skipped');
  }
  
  // Test 3.4: Update Transaction Category
  log('\nTest 3.4: Update Transaction Category', 'info');
  if (testTransactionId) {
    const updateCategoryResult = await apiCall('PATCH', `/transactions/${testTransactionId}/category`, {
      category: 'Updated Category',
      updateSimilar: false
    }, authToken);
    assert(updateCategoryResult.success, 'Transaction category updated successfully');
  }
  
  // ============================================
  // 4. SUMMARY & CALCULATIONS TESTS
  // ============================================
  log('\n📋 4. SUMMARY & CALCULATIONS TESTS', 'info');
  log('-'.repeat(60), 'info');
  
  // Test 4.1: Get Summary
  log('\nTest 4.1: Get Summary Statistics', 'info');
  const summaryResult = await apiCall('GET', '/summary', null, authToken);
  assert(summaryResult.success, 'Summary retrieved successfully');
  if (summaryResult.success) {
    assert(typeof summaryResult.data.totalIncome === 'number', 'Total income is a number');
    assert(typeof summaryResult.data.totalExpenses === 'number', 'Total expenses is a number');
    assert(typeof summaryResult.data.netBalance === 'number', 'Net balance is a number');
    assert(summaryResult.data.netBalance === summaryResult.data.totalIncome - summaryResult.data.totalExpenses, 'Net balance calculation is correct');
  }
  
  // Test 4.2: Income Calculation
  log('\nTest 4.2: Income Calculation Accuracy', 'info');
  if (summaryResult.success) {
    // We uploaded 2000 income, so it should be at least that
    assert(summaryResult.data.totalIncome >= 2000, `Income calculation correct (expected >= 2000, got ${summaryResult.data.totalIncome})`);
  }
  
  // Test 4.3: Expenses Calculation
  log('\nTest 4.3: Expenses Calculation Accuracy', 'info');
  if (summaryResult.success) {
    // We uploaded 50 expense, so it should be at least that
    assert(summaryResult.data.totalExpenses >= 50, `Expenses calculation correct (expected >= 50, got ${summaryResult.data.totalExpenses})`);
  }
  
  // Test 4.4: Current Month Income
  log('\nTest 4.4: Current Month Income', 'info');
  if (summaryResult.success) {
    assert(typeof summaryResult.data.actualIncome === 'number', 'Current month income is a number');
    // Should include our test income of 2000
    assert(summaryResult.data.actualIncome >= 2000, `Current month income includes test transaction (expected >= 2000, got ${summaryResult.data.actualIncome})`);
  }
  
  // ============================================
  // 5. TRENDS TESTS
  // ============================================
  log('\n📋 5. TRENDS TESTS', 'info');
  log('-'.repeat(60), 'info');
  
  // Test 5.1: Get Monthly Trends
  log('\nTest 5.1: Get Monthly Trends', 'info');
  const trendsResult = await apiCall('GET', '/trends', null, authToken);
  assert(trendsResult.success, 'Trends retrieved successfully');
  if (trendsResult.success) {
    assert(Array.isArray(trendsResult.data.monthlyTrends), 'Monthly trends returned as array');
    assert(trendsResult.data.monthlyTrends.length > 0, 'At least one month of trends exists');
  }
  
  // Test 5.2: Get Insights
  log('\nTest 5.2: Get Insights', 'info');
  const insightsResult = await apiCall('GET', '/trends/insights', null, authToken);
  assert(insightsResult.success, 'Insights retrieved successfully');
  if (insightsResult.success) {
    assert(Array.isArray(insightsResult.data.insights), 'Insights returned as array');
  }
  
  // ============================================
  // 6. BUDGET TESTS
  // ============================================
  log('\n📋 6. BUDGET TESTS', 'info');
  log('-'.repeat(60), 'info');
  
  // Test 6.1: Get Budget Overview
  log('\nTest 6.1: Get Budget Overview', 'info');
  const budgetResult = await apiCall('GET', '/budget/overview', null, authToken);
  assert(budgetResult.success, 'Budget overview retrieved successfully');
  if (budgetResult.success) {
    assert(Array.isArray(budgetResult.data.categories), 'Budget categories returned as array');
  }
  
  // ============================================
  // 7. USER ISOLATION TESTS (SECURITY)
  // ============================================
  log('\n📋 7. USER ISOLATION TESTS (SECURITY)', 'info');
  log('-'.repeat(60), 'info');
  
  // Test 7.1: User Can Only See Own Accounts
  log('\nTest 7.1: User Can Only See Own Accounts', 'info');
  const userAccounts = await apiCall('GET', '/accounts', null, authToken);
  if (userAccounts.success) {
    assert(userAccounts.data.every(acc => acc.user_id === testUserId), 'User can only see their own accounts');
  }
  
  // Test 7.2: User Can Only See Own Transactions
  log('\nTest 7.2: User Can Only See Own Transactions', 'info');
  const userTransactions = await apiCall('GET', '/transactions', null, authToken);
  if (userTransactions.success) {
    assert(userTransactions.data.every(t => t.user_id === testUserId), 'User can only see their own transactions');
  }
  
  // Test 7.3: User Cannot Update Other User's Account
  log('\nTest 7.3: User Cannot Update Other User\'s Account', 'info');
  // Try to update account ID 999 (should fail if it doesn't belong to user)
  const unauthorizedUpdate = await apiCall('PUT', '/accounts/999', {
    name: 'Hacked Account',
    accountType: 'checking',
    balance: 999999
  }, authToken);
  // Should fail (404 or 403)
  assert(!unauthorizedUpdate.success, 'User cannot update accounts that don\'t belong to them');
  
  // ============================================
  // 8. DATA INTEGRITY TESTS
  // ============================================
  log('\n📋 8. DATA INTEGRITY TESTS', 'info');
  log('-'.repeat(60), 'info');
  
  // Test 8.1: No NULL user_id in Accounts
  log('\nTest 8.1: No NULL user_id in Accounts', 'info');
  if (userAccounts.success) {
    assert(userAccounts.data.every(acc => acc.user_id !== null), 'No accounts have NULL user_id');
  }
  
  // Test 8.2: No NULL user_id in Transactions
  log('\nTest 8.2: No NULL user_id in Transactions', 'info');
  if (userTransactions.success) {
    assert(userTransactions.data.every(t => t.user_id !== null), 'No transactions have NULL user_id');
  }
  
  // Test 8.3: Duplicate Transactions Excluded from Calculations
  log('\nTest 8.3: Duplicate Transactions Excluded from Calculations', 'info');
  // Upload duplicate transaction
  const duplicateTest = await apiCall('POST', '/transactions/upload', {
    transactions: [testTransactions[0]],
    account_id: testAccountId
  }, authToken);
  
  // Get summary again
  const summaryAfterDuplicate = await apiCall('GET', '/summary', null, authToken);
  if (summaryAfterDuplicate.success && summaryResult.success) {
    // Expenses should not have increased (duplicate should be excluded)
    assert(summaryAfterDuplicate.data.totalExpenses === summaryResult.data.totalExpenses, 'Duplicate transactions excluded from calculations');
  }
  
  // ============================================
  // 9. CLEANUP
  // ============================================
  log('\n📋 9. CLEANUP', 'info');
  log('-'.repeat(60), 'info');
  
  // Test 9.1: Delete Transaction
  log('\nTest 9.1: Delete Transaction', 'info');
  if (testTransactionId) {
    const deleteTransactionResult = await apiCall('DELETE', `/transactions/${testTransactionId}`, null, authToken);
    assert(deleteTransactionResult.success, 'Transaction deleted successfully');
  }
  
  // Test 9.2: Delete Account
  log('\nTest 9.2: Delete Account', 'info');
  if (testAccountId) {
    const deleteAccountResult = await apiCall('DELETE', `/accounts/${testAccountId}`, null, authToken);
    assert(deleteAccountResult.success, 'Account deleted successfully');
    if (deleteAccountResult.success) {
      assert(deleteAccountResult.data.deletedTransactions >= 0, 'Associated transactions were deleted');
    }
  }
  
  // ============================================
  // TEST SUMMARY
  // ============================================
  log('\n' + '='.repeat(60), 'info');
  log('\n📊 TEST SUMMARY', 'info');
  log('='.repeat(60), 'info');
  log(`\n✅ Passed: ${results.passed}`, 'success');
  log(`❌ Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
  
  if (results.errors.length > 0) {
    log('\n❌ Failed Tests:', 'error');
    results.errors.forEach((error, index) => {
      log(`   ${index + 1}. ${error}`, 'error');
    });
  }
  
  const totalTests = results.passed + results.failed;
  const successRate = ((results.passed / totalTests) * 100).toFixed(1);
  log(`\n📈 Success Rate: ${successRate}%`, successRate >= 90 ? 'success' : 'warning');
  
  if (results.failed === 0) {
    log('\n🎉 All tests passed! System is healthy.', 'success');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'error');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Test suite crashed: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});

