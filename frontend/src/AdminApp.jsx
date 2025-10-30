import { useState, useEffect } from 'react';
import { Shield, LogOut, Users, Database, TrendingUp, Home } from 'lucide-react';
import AdminLogin from './components/AdminLogin';
import Admin from './components/Admin';
import { getStoredAuth, clearAuth } from './utils/auth';

function AdminApp() {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in and is admin
    const auth = getStoredAuth();
    if (auth && auth.user && auth.user.isAdmin) {
      setAdminUser(auth.user);
    }
    setLoading(false);
  }, []);

  const handleAdminLogin = (user) => {
    setAdminUser(user);
  };

  const handleLogout = () => {
    clearAuth();
    setAdminUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // If not logged in as admin, show admin login
  if (!adminUser) {
    return <AdminLogin onAdminLogin={handleAdminLogin} />;
  }

  // If logged in as admin, show admin dashboard
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-lg sticky top-0 z-50">
        <div className="max-w-[95%] 2xl:max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <span>👑 Admin Portal</span>
                </h1>
                <p className="text-xs text-blue-100">AiFinity.app • Super Admin Dashboard</p>
              </div>
            </div>

            {/* Admin Info & Actions */}
            <div className="flex items-center space-x-4">
              {/* Stats Quick View */}
              <div className="hidden lg:flex items-center space-x-4 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg">
                <div className="flex items-center space-x-2 text-white">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">System Admin</span>
                </div>
              </div>

              {/* Admin User Info */}
              <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg">
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{adminUser.fullName || adminUser.email}</p>
                  <p className="text-xs text-blue-100">{adminUser.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  👑
                </div>
              </div>

              {/* Main App Link */}
              <a
                href="/"
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-white font-medium transition-all"
                title="Go to Main App"
              >
                <Home className="w-5 h-5" />
                <span className="hidden md:inline">Main App</span>
              </a>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium shadow-lg transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="container mx-auto px-4 py-8 max-w-[95%] 2xl:max-w-[1800px]">
        {/* Warning Banner */}
        <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-yellow-900 dark:text-yellow-300 mb-1">
                🔐 Super Admin Access
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                You have full administrative privileges. Exercise caution when managing user data and system settings.
              </p>
            </div>
          </div>
        </div>

        {/* Admin Dashboard */}
        <Admin />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-[95%] 2xl:max-w-[1800px] mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 AiFinity.app • Admin Portal
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center space-x-1">
                <Database className="w-4 h-4" />
                <span>PostgreSQL</span>
              </span>
              <span className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4" />
                <span>Railway</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AdminApp;
