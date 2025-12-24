import React from 'react';
import { TrendingUp, User, LogOut, Globe, Moon, Sun } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

function Header({ user, onLogout, clerkUserButton, onLogoClick }) {
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleLogoClick = () => {
    if (onLogoClick && user) {
      onLogoClick();
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 backdrop-blur-xl shadow-premium border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="container mx-auto px-4 py-2 max-w-[95%] 2xl:max-w-[1800px]">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div 
            className={`flex items-center space-x-4 ${onLogoClick && user ? 'cursor-pointer' : ''}`}
            onClick={handleLogoClick}
          >
            <div className="w-20 h-20 overflow-hidden flex items-center justify-center flex-shrink-0">
              <img 
                src={theme === 'dark' ? '/aifinity-logo-dark.png' : '/aifinity-logo.png'}
                alt="AiFinity.app Logo" 
                className="h-full w-auto object-contain transform hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold tracking-tight" style={{
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)'
                  : 'linear-gradient(135deg, #0891b2 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontWeight: '700',
                letterSpacing: '-0.02em'
              }}>
                {t('appName')}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide mt-0.5">
                {t('appTagline')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-800/40 dark:hover:to-purple-800/40 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>
            
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-800/40 dark:hover:to-blue-800/40 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              aria-label="Toggle language"
            >
              <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase">{language}</span>
            </button>

            {/* User Info & Logout */}
            {user && (
              <div className="flex items-center space-x-3">
                {/* User Info */}
                <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-md">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {user.fullName || user.email}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-medium"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">{t('logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
