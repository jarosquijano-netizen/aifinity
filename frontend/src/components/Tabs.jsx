import React from 'react';

function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-1 inline-flex space-x-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-6 py-2.5 rounded-md font-medium transition-all duration-200
            ${activeTab === tab.id
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
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
















