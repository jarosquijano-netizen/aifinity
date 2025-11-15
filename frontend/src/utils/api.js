import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
api.interceptors.request.use(async (config) => {
  // Get JWT token from localStorage (using same key as auth.js)
  const authData = localStorage.getItem('finova_auth');
  if (authData) {
    try {
      const { token } = JSON.parse(authData);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get JWT token:', error);
    }
  }
  return config;
});

// Auth endpoints
export const register = async (email, password, fullName) => {
  const response = await api.post('/auth/register', { email, password, fullName });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// Transaction endpoints
export const uploadTransactions = async (transactions, accountId = null, lastBalance = null) => {
  const response = await api.post('/transactions/upload', { 
    transactions, 
    account_id: accountId,
    lastBalance: lastBalance
  });
  return response.data;
};

export const getTransactions = async () => {
  const response = await api.get('/transactions');
  return response.data;
};

export const deleteTransaction = async (transactionId) => {
  const response = await api.delete(`/transactions/${transactionId}`);
  return response.data;
};

export const deleteAllTransactions = async () => {
  const response = await api.delete('/transactions/all');
  return response.data;
};

export const updateTransactionCategory = async (transactionId, category, updateSimilar = false, computable = true) => {
  const response = await api.patch(`/transactions/${transactionId}/category`, {
    category,
    updateSimilar,
    computable
  });
  return response.data;
};

export const bulkUpdateTransactionCategory = async (transactionIds, category, computable = true) => {
  const response = await api.post('/transactions/bulk-update-category', {
    transactionIds,
    category,
    computable
  });
  return response.data;
};

export const createTransfer = async (fromAccountId, toAccountId, amount, date, description) => {
  const response = await api.post('/transactions/transfer', {
    fromAccountId,
    toAccountId,
    amount,
    date,
    description
  });
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/transactions/categories');
  return response.data;
};

// Summary endpoint
export const getSummary = async () => {
  const response = await api.get('/summary');
  return response.data;
};

// Trends endpoints
export const getTrends = async () => {
  const response = await api.get('/trends');
  return response.data;
};

export const getInsights = async () => {
  const response = await api.get('/trends/insights');
  return response.data;
};

// Export endpoints
export const exportCSV = () => {
  const auth = getStoredAuth();
  const token = auth?.token;
  const url = `${API_URL}/export/csv${token ? `?token=${token}` : ''}`;
  window.open(url, '_blank');
};

export const exportExcel = () => {
  const auth = getStoredAuth();
  const token = auth?.token;
  const url = `${API_URL}/export/excel${token ? `?token=${token}` : ''}`;
  window.open(url, '_blank');
};

// Bank accounts endpoints
export const getAccounts = async () => {
  const response = await api.get('/accounts');
  return response.data;
};

export const createAccount = async (accountData) => {
  const response = await api.post('/accounts', accountData);
  return response.data;
};

export const updateAccount = async (id, accountData) => {
  console.log('🌐 API: Updating account', id, 'with data:', accountData);
  const response = await api.put(`/accounts/${id}`, accountData);
  console.log('✅ API: Update response:', response.data);
  return response.data;
};

export const deleteAccount = async (id) => {
  const response = await api.delete(`/accounts/${id}`);
  return response.data;
};

export const recalculateAccountBalance = async (id) => {
  const response = await api.post(`/accounts/${id}/recalculate-balance`);
  return response.data;
};

// Budget endpoints
export const getBudgetOverview = async (month) => {
  const response = await api.get('/budget/overview', { params: { month } });
  return response.data;
};

export const getBudgetInsights = async (month, useAI = true) => {
  const response = await api.get('/budget/insights', {
    params: { month, useAI: useAI.toString() }
  });
  return response.data;
};

// Get all transaction categories
export const getTransactionCategories = async () => {
  const response = await api.get('/budget/categories');
  return response.data;
};

// Get AI budget suggestions
export const getBudgetSuggestions = async () => {
  const response = await api.get('/budget/suggestions');
  return response.data;
};

export const updateCategoryBudget = async (categoryId, budgetAmount, categoryName = null) => {
  const response = await api.put(`/budget/categories/${categoryId || 'new'}`, { 
    budget_amount: budgetAmount,
    category_name: categoryName
  });
  return response.data;
};

// Cleanup/Migration endpoints
export const runCategoryMappingMigration = async () => {
  const response = await api.post('/cleanup/category-mapping');
  return response.data;
};

export const cleanupUnusedBudgetCategories = async () => {
  const response = await api.post('/cleanup/unused-budgets');
  return response.data;
};

export const finalizeCategoryCleanup = async () => {
  const response = await api.post('/cleanup/finalize');
  return response.data;
};

// AI endpoints
export const getAIConfig = async () => {
  const response = await api.get('/ai/config');
  return response.data;
};

export const saveAIConfig = async (provider, apiKey) => {
  const response = await api.post('/ai/config', { provider, apiKey });
  return response.data;
};

export const deleteAIConfig = async (configId) => {
  const response = await api.delete(`/ai/config/${configId}`);
  return response.data;
};

export const activateAIConfig = async (configId) => {
  const response = await api.post(`/ai/config/${configId}/activate`);
  return response.data;
};

export const sendAIChat = async (message, timePeriod = null, language = 'en') => {
  const response = await api.post('/ai/chat', { message, timePeriod, language });
  return response.data;
};

export const getAIChatHistory = async (limit = 50) => {
  const response = await api.get('/ai/chat/history', { params: { limit } });
  return response.data;
};

// Settings endpoints
export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await api.post('/settings', settings);
  return response.data;
};

export const getActualIncome = async (month) => {
  const response = await api.get(`/settings/actual-income/${month}`);
  return response.data;
};

export const calculateExpectedIncome = async () => {
  const response = await api.get('/settings/calculate-expected-income');
  return response.data;
};

export const updateExpectedFromActual = async () => {
  const response = await api.post('/settings/update-expected-from-actual');
  return response.data;
};

// Admin endpoints
export const getAdminUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const getAdminUserDetails = async (userId) => {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data;
};

export const getAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const deleteAdminUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

export default api;


