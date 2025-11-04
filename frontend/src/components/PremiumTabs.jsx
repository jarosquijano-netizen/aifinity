import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, BarChart3, TrendingUp, Lightbulb, Wallet, Settings as SettingsIcon, List, Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const tabIcons = {
  dashboard: BarChart3,
  transactions: List,
  trends: TrendingUp,
  insights: Lightbulb,
  budget: Wallet,
  upload: UploadIcon,
  settings: SettingsIcon,
};

function PremiumTabs({ tabs, activeTab, onChange }) {
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Prevent body scroll when mobile menu is open
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleTabClick = (tabId) => {
    onChange(tabId);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Desktop Menu */}
      <div className="hidden md:block w-full">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-premium p-2 flex flex-wrap gap-2 justify-center items-center border border-gray-100/50 dark:border-gray-700/50 animate-fadeIn w-full overflow-x-auto" role="tablist" style={{ minWidth: '100%' }}>
          {tabs.map((tab) => {
            const Icon = tabIcons[tab.id];
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  relative px-4 md:px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform whitespace-nowrap flex-shrink-0
                  ${isActive
                    ? 'text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-102'
                  }
                `}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                } : {}}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
              >
                <div className="flex items-center space-x-2">
                  {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                  <span className="truncate">{t(tab.id)}</span>
                </div>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-white rounded-full shadow-md" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden w-full">
        {/* Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-premium p-4 border border-gray-100/50 dark:border-gray-700/50 flex items-center justify-between animate-fadeIn"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          <div className="flex items-center space-x-3">
            {tabIcons[activeTab] && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}>
                {React.createElement(tabIcons[activeTab], { className: "w-5 h-5 text-white" })}
              </div>
            )}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {t(activeTab)}
            </span>
          </div>
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          ) : (
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Mobile Menu Dropdown */}
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
              isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Panel - Full Screen */}
          <div className={`fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="p-4 space-y-2">
              {/* Close Button */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              {/* Menu Items */}
              {tabs.map((tab) => {
                const Icon = tabIcons[tab.id];
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`
                      w-full relative px-4 py-4 rounded-xl font-semibold transition-all duration-300 transform
                      flex items-center space-x-3 text-left
                      ${isActive
                        ? 'text-white shadow-lg scale-[1.02]'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                    `}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    } : {}}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                  >
                    {Icon && (
                      <Icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                    )}
                    <span className="flex-1">{t(tab.id)}</span>
                    {isActive && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-md" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      </div>
    </>
  );
}

export default PremiumTabs;

