import React from 'react';

function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-lg shadow-sm p-1 flex space-x-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex-1 px-4 py-2.5 rounded-md font-medium transition-all duration-200 text-sm
            ${activeTab === tab.id
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }
          `}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;



















