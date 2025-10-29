import React, { useState, useEffect } from 'react';
import { useUser, useAuth, SignedIn, SignedOut, SignIn, SignUp, UserButton } from '@clerk/clerk-react';
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
import { setClerkTokenGetter } from './utils/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [transactionFilters, setTransactionFilters] = useState({});
  const [showSignUp, setShowSignUp] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [jwtUser, setJwtUser] = useState(null);
  const [useJWT, setUseJWT] = useState(false);
  const { t } = useLanguage();
  
  // Try Clerk first
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useAuth();

  // Fallback to JWT auth
  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      setJwtUser(auth.user);
      setUseJWT(true);
      console.log('🔐 Using JWT authentication');
    }
  }, []);

  // Log Clerk status
  useEffect(() => {
    console.log('🔍 Clerk Status:', { user: !!clerkUser, isLoaded, hasGetToken: !!getToken });
    if (isLoaded && !clerkUser && !jwtUser) {
      console.log('⚠️ No user logged in (Clerk or JWT)');
    }
  }, [clerkUser, isLoaded, getToken, jwtUser]);

  // Setup Clerk token getter for API calls
  useEffect(() => {
    if (getToken) {
      console.log('🔑 Setting up Clerk token getter');
      setClerkTokenGetter(getToken);
    }
  }, [getToken]);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('dashboard');
  };

  const navigateToTransactionsWithFilter = (filters) => {
    setTransactionFilters(filters);
    setActiveTab('transactions');
  };

  const handleJWTLogin = (authData) => {
    setJwtUser(authData.user);
    setShowAuth(false);
    setUseJWT(true);
  };

  const handleLogout = () => {
    clearAuth();
    setJwtUser(null);
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

  // Show loading state while Clerk initializes
  if (!isLoaded && !useJWT) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading authentication...</p>
        </div>
      </div>
    );
  }

  const currentUser = clerkUser || jwtUser;
  const isAuthenticated = !!currentUser;

  // If using JWT and not authenticated, show old Auth component
  if (useJWT && !jwtUser) {
    return (
      <div className="min-h-screen transition-colors duration-300">
        <Header 
          user={null} 
          onLogin={() => setShowAuth(true)} 
          onLogout={handleLogout}
        />
        <Auth onClose={() => setShowAuth(false)} onLogin={handleJWTLogin} />
      </div>
    );
  }

  return (
    <>
      {/* Clerk Login Wall for Unauthenticated Users */}
      {!useJWT && (
        <SignedOut>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="w-full max-w-md p-8">
              <div className="text-center mb-8">
                <img 
                  src="/aifinity-logo.png" 
                  alt="AiFinity.app" 
                  className="w-24 h-24 mx-auto mb-4 animate-pulse"
                />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  AiFinity.app
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  AI-Powered Financial Intelligence
                </p>
                <button
                  onClick={() => setUseJWT(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Use classic login instead
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
                {showSignUp ? (
                  <>
                    <SignUp 
                      appearance={{
                        elements: {
                          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                          card: 'shadow-none',
                        }
                      }}
                    />
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowSignUp(false)}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Already have an account? Sign in
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <SignIn 
                      appearance={{
                        elements: {
                          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                          card: 'shadow-none',
                        }
                      }}
                    />
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowSignUp(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Don't have an account? Sign up
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </SignedOut>
      )}

      {/* Main App for Authenticated Users */}
      {isAuthenticated && (
        <div className="min-h-screen transition-colors duration-300">
          <Header 
            user={currentUser} 
            clerkUserButton={clerkUser ? <UserButton afterSignOutUrl="/" /> : null}
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
            <Auth onClose={() => setShowAuth(false)} onLogin={handleJWTLogin} />
          )}
        </div>
      )}

      {!useJWT && clerkUser && (
        <SignedIn>
          <div className="min-h-screen transition-colors duration-300">
            <Header 
              user={clerkUser} 
              clerkUserButton={<UserButton afterSignOutUrl="/" />}
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
          </div>
        </SignedIn>
      )}
    </>
  );
}

export default App;

