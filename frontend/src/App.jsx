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
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import { getStoredAuth, clearAuth } from './utils/auth';
import { useLanguage } from './context/LanguageContext';
import { useSessionTimeout } from './hooks/useSessionTimeout';

function App() {
  // Initialize activeTab from URL hash, fallback to 'dashboard' when logged in
  const getInitialTab = () => {
    try {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      const validTabs = ['dashboard', 'transactions', 'trends', 'insights', 'budget', 'upload', 'settings'];
      if (hash && validTabs.includes(hash)) {
        return hash;
      }
      // Default to dashboard if no hash (for logged-in users)
      return 'dashboard';
    } catch (error) {
      console.error('Error getting initial tab:', error);
      return 'dashboard';
    }
  };

  const [activeTab, setActiveTab] = useState(() => getInitialTab());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [transactionFilters, setTransactionFilters] = useState({});
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const { t } = useLanguage();

  // Session timeout handler
  const handleSessionTimeout = () => {
    console.log('⏰ Session timeout - logging out user');
    clearAuth();
    setUser(null);
    setRefreshTrigger(prev => prev + 1);
    // Show a message or redirect
    alert('Your session has expired due to inactivity. Please log in again.');
  };

  // Session timeout hook (30 minutes inactivity, 1 minute warning)
  const { showWarning, timeRemaining, resetTimer } = useSessionTimeout(
    30, // 30 minutes of inactivity
    1,  // Show warning 1 minute before logout
    handleSessionTimeout
  );

  // Update URL hash when activeTab changes
  useEffect(() => {
    if (user && activeTab) {
      try {
        // Only update hash if user is logged in
        const newHash = `#/${activeTab}`;
        if (window.location.hash !== newHash) {
          window.location.hash = newHash;
        }
      } catch (error) {
        console.error('Error updating hash:', error);
      }
    }
  }, [activeTab, user]);

  // Listen for hash changes (back/forward browser buttons)
  useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash.replace('#/', '').replace('#', '');
        const validTabs = ['dashboard', 'transactions', 'trends', 'insights', 'budget', 'upload', 'settings'];
        if (hash && validTabs.includes(hash)) {
          setActiveTab(hash);
        } else if (!hash && user) {
          // If hash is empty but user is logged in, default to dashboard
          setActiveTab('dashboard');
        }
      } catch (error) {
        console.error('Error handling hash change:', error);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Also check initial hash on mount
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  useEffect(() => {
    console.log('🔍 Checking stored auth...');
    const auth = getStoredAuth();
    console.log('🔐 Stored auth:', auth);
    if (auth) {
      console.log('✅ User found in storage:', auth.user);
      setUser(auth.user);
    } else {
      console.log('❌ No user in storage - showing login');
    }
  }, []);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    // Don't redirect - stay on upload page
  };

  const navigateToTransactionsWithFilter = (filters) => {
    setTransactionFilters(filters);
    setActiveTab('transactions');
  };

  const handleLogin = (authData) => {
    setUser(authData.user);
    setShowAuth(false);
    setJustLoggedIn(true);
    // Redirect to dashboard only when coming from login
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setRefreshTrigger(prev => prev + 1);
    // Reset session timer when logging out manually
    if (resetTimer) {
      resetTimer();
    }
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
    console.log('🚪 Rendering login screen - user is null');
    return (
      <div className="min-h-screen transition-colors duration-300">
        <Header 
          user={null} 
          onLogin={() => {}} 
          onLogout={handleLogout}
        />
        <Auth onClose={() => console.log('❌ Close clicked - but we ignore it')} onLogin={handleLogin} />
      </div>
    );
  }

  console.log('✅ User is logged in, showing dashboard');

  // If logged in, show the full app
  return (
    <div className="min-h-screen transition-colors duration-300">
      <Header 
        user={user} 
        onLogin={() => setShowAuth(true)} 
        onLogout={handleLogout}
        onLogoClick={() => setActiveTab('dashboard')}
      />
      
      {/* Menu Section - Full Width */}
      <div className="w-full px-4 pt-4 md:pt-6">
        <div className="w-full md:container md:mx-auto md:max-w-[95%] 2xl:max-w-[1800px] mb-8 animate-fadeIn">
          <PremiumTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-[95%] 2xl:max-w-[1800px]">
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

      {/* Session Timeout Warning */}
      {user && showWarning && (
        <SessionTimeoutWarning
          timeRemaining={timeRemaining}
          onStayLoggedIn={() => {
            resetTimer();
            setShowWarning(false);
          }}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;


