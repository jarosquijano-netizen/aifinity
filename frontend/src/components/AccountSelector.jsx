import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Wallet, CreditCard, PiggyBank, Search, Check } from 'lucide-react';

const accountTypeIcons = {
  checking: Wallet,
  credit: CreditCard,
  savings: PiggyBank,
  investment: PiggyBank,
};

const accountTypeColors = {
  checking: 'text-blue-600 dark:text-blue-400',
  credit: 'text-red-600 dark:text-red-400',
  savings: 'text-green-600 dark:text-green-400',
  investment: 'text-purple-600 dark:text-purple-400',
};

const accountTypeLabels = {
  checking: 'Checking',
  credit: 'Credit',
  savings: 'Savings',
  investment: 'Investment',
};

function AccountSelector({ 
  accounts = [], 
  selectedAccount, 
  onAccountChange, 
  label = 'Select Account',
  description = 'Choose which account these transactions belong to:',
  showBalance = false,
  disabled = false,
  className = '',
  required = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      account.name?.toLowerCase().includes(search) ||
      account.account_type?.toLowerCase().includes(search) ||
      account.bank?.toLowerCase().includes(search)
    );
  });

  // Group accounts by type
  const groupedAccounts = filteredAccounts.reduce((groups, account) => {
    const type = account.account_type || 'checking';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(account);
    return groups;
  }, {});

  const selectedAccountObj = accounts.find(acc => acc.id.toString() === selectedAccount?.toString());

  const handleSelectAccount = (accountId) => {
    onAccountChange(accountId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getAccountDisplayName = (account) => {
    const type = account.account_type || 'checking';
    const typeLabel = accountTypeLabels[type] || type;
    return `${account.name} (${typeLabel})`;
  };

  const formatBalance = (balance) => {
    const num = parseFloat(balance || 0);
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {description}
        </p>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || accounts.length === 0}
        className={`
          w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 rounded-xl 
          text-left flex items-center justify-between transition-all duration-200
          ${disabled || accounts.length === 0
            ? 'border-gray-200 dark:border-gray-600 opacity-50 cursor-not-allowed'
            : isOpen
            ? 'border-purple-500 dark:border-purple-400 shadow-lg ring-2 ring-purple-200 dark:ring-purple-800'
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
          }
        `}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {selectedAccountObj ? (
            <>
              {accountTypeIcons[selectedAccountObj.account_type] && (
                <div className={`flex-shrink-0 ${accountTypeColors[selectedAccountObj.account_type] || 'text-gray-600'}`}>
                  {React.createElement(accountTypeIcons[selectedAccountObj.account_type], { className: 'w-5 h-5' })}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {selectedAccountObj.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {accountTypeLabels[selectedAccountObj.account_type] || selectedAccountObj.account_type}
                  {showBalance && selectedAccountObj.balance !== undefined && (
                    <span className="ml-2">
                      • {formatBalance(selectedAccountObj.balance)}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3 flex-1">
              <Building2 className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                {accounts.length === 0 ? 'No accounts available' : 'Select an account...'}
              </span>
            </div>
          )}
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && accounts.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-96 overflow-hidden">
          {/* Search Input */}
          {accounts.length > 5 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* Accounts List */}
          <div className="overflow-y-auto max-h-80">
            {Object.keys(groupedAccounts).length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No accounts found matching "{searchTerm}"
              </div>
            ) : (
              Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
                <div key={type} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  {/* Type Header */}
                  <div className="px-4 py-2 bg-gray-50 dark:bg-slate-700/50 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {accountTypeLabels[type] || type}
                  </div>
                  
                  {/* Accounts in this type */}
                  {typeAccounts.map((account) => {
                    const isSelected = account.id.toString() === selectedAccount?.toString();
                    const Icon = accountTypeIcons[account.account_type] || Building2;
                    const colorClass = accountTypeColors[account.account_type] || 'text-gray-600';
                    
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => handleSelectAccount(account.id)}
                        className={`
                          w-full px-4 py-3 flex items-center justify-between transition-colors duration-150
                          ${isSelected
                            ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`flex-shrink-0 ${colorClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className={`font-medium truncate ${
                              isSelected 
                                ? 'text-purple-700 dark:text-purple-300' 
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {account.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                              <span>{account.bank || 'Bank'}</span>
                              {showBalance && account.balance !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className={account.balance < 0 ? 'text-red-600 dark:text-red-400' : ''}>
                                    {formatBalance(account.balance)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Helper Text */}
      {accounts.length > 0 && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} available
        </p>
      )}

      {/* No Accounts Message */}
      {accounts.length === 0 && (
        <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 <strong>No accounts found.</strong> Go to <strong>Settings</strong> → <strong>Accounts</strong> to create your first bank account.
          </p>
        </div>
      )}
    </div>
  );
}

export default AccountSelector;

