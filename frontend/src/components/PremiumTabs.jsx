import React from 'react';
import { Upload as UploadIcon, BarChart3, TrendingUp, Lightbulb, Wallet, Settings as SettingsIcon, List } from 'lucide-react';
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

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-premium p-2 inline-flex space-x-2 border border-gray-100/50 animate-fadeIn" role="tablist">
      {tabs.map((tab) => {
        const Icon = tabIcons[tab.id];
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform
              ${isActive
                ? 'text-white shadow-lg scale-105'
                : 'text-gray-600 hover:bg-gray-50 hover:scale-102'
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
              {Icon && <Icon className="w-4 h-4" />}
              <span>{t(tab.id)}</span>
            </div>
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-white rounded-full shadow-md" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PremiumTabs;

