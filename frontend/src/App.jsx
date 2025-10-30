import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PremiumTabs from './components/PremiumTabs';
import Upload from './components/Upload';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Trends from './components/Trends';
import Insights from './components/Insights';
import Budget from './components/Budget';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { getStoredAuth, clearAuth } from './utils/auth';
import { useLanguage } from './context/LanguageContext';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [transactionFilters, setTransactionFilters] = useState({});
  const { t } = useLanguage();

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      setUser(auth.user);
    }
  }, []);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('dashboard');
  };

  const navigateToTransactionsWithFilter = (filters) => {
    setTransactionFilters(filters);
    setActiveTab('transactions');
  };

  const handleLogin = (authData) => {
    setUser(authData.user);
    setShowAuth(false);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'dashboard', label: t('dashboard') },
    { id: 'transactions', label: t('transactions') },
    { id: 'trends', label: t('trends') },
    { id: 'insights', label: t('insights') },
    { id: 'budget', label: t('budget') },
    { id: 'upload', label: t('upload') },
    { id: 'settings', label: t('settings') },
  ];

  // If not logged in, show only the Auth component
  if (!user) {
    return (
      <div className="min-h-screen transition-colors duration-300">
        <Header 
          user={null} 
          onLogin={() => {}} 
          onLogout={handleLogout}
        />
        <Auth onClose={() => {}} onLogin={handleLogin} />
      </div>
    );
  }

  // If logged in, show the full app
  return (
    <div className="min-h-screen transition-colors duration-300">
      <Header 
        user={user} 
        onLogin={() => setShowAuth(true)} 
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 py-8 max-w-[95%] 2xl:max-w-[1800px]">
        <div className="mb-8 animate-fadeIn">
          <PremiumTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        
        <div className="mt-6">
          {activeTab === 'dashboard' && (
            <Dashboard key={refreshTrigger} />
          )}
          
          {activeTab === 'transactions' && (
            <Transactions 
              key={refreshTrigger} 
              initialFilters={transactionFilters}
              onFiltersCleared={() => setTransactionFilters({})}
            />
          )}
          
          {activeTab === 'trends' && (
            <Trends key={refreshTrigger} />
          )}
          
          {activeTab === 'insights' && (
            <Insights key={refreshTrigger} />
          )}
          
          {activeTab === 'budget' && (
            <Budget 
              key={refreshTrigger}
              onNavigateToTransactions={navigateToTransactionsWithFilter}
            />
          )}
          
          {activeTab === 'upload' && (
            <Upload onUploadComplete={handleUploadComplete} />
          )}
          
          {activeTab === 'settings' && (
            <Settings key={refreshTrigger} />
          )}
        </div>
      </main>

      {showAuth && (
        <Auth onClose={() => setShowAuth(false)} onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;


