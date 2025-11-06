import React, { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, FileText, X, CheckCircle, AlertCircle, Loader, Building2, Clipboard } from 'lucide-react';
import { parsePDFTransactions, parseCSVTransactions } from '../utils/pdfParser';
import { uploadTransactions, getAccounts } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

function Upload({ onUploadComplete }) {
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'paste'
  const [files, setFiles] = useState([]);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [parsedTransactionsData, setParsedTransactionsData] = useState(null); // Store parsed data before account selection
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Debug: Log when showAccountSelector changes
  useEffect(() => {
    console.log('🔄 showAccountSelector changed to:', showAccountSelector);
    console.log('🔄 parsedTransactionsData:', parsedTransactionsData ? 'exists' : 'null');
  }, [showAccountSelector, parsedTransactionsData]);

  const fetchAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data.accounts);
      if (data.accounts.length > 0) {
        setSelectedAccount(data.accounts[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => 
      file.type === 'application/pdf' || 
      file.name.endsWith('.csv') ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.xlsx')
    );
    
    if (validFiles.length !== newFiles.length) {
      setError('Only PDF, CSV, and Excel files are supported');
      setTimeout(() => setError(''), 3000);
    }
    
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    // Show account selector if accounts exist
    if (accounts.length > 0) {
      setShowAccountSelector(true);
      return;
    }

    // Process without account if no accounts exist
    await processAndUpload();
  };

  const processPastedText = async () => {
    if (!pastedText.trim()) {
      setError('Please paste some text content');
      return;
    }

    // First, parse the data (we'll fetch accounts AFTER parsing succeeds)
    setProcessing(true);
    setError('');
    setResults(null);
    // Don't hide account selector here - we'll show it after parsing
    // setShowAccountSelector(false);

    try {
      // Create a virtual file from pasted text
      const lines = pastedText.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('No content found in pasted text');
      }

      // Create a Blob with the pasted text
      const blob = new Blob([pastedText], { type: 'text/plain' });
      const virtualFile = new File([blob], 'pasted-content.txt', { type: 'text/plain' });

      // Try to parse as CSV (most bank statements are CSV-like)
      let parseResult;
      try {
        parseResult = await parseCSVTransactions(virtualFile);
      } catch (parseError) {
        console.error('CSV parse failed, trying as text:', parseError);
        throw new Error('Failed to parse pasted content. Please ensure it\'s in CSV format (columns separated by commas or semicolons).');
      }

      if (!parseResult || !parseResult.transactions || parseResult.transactions.length === 0) {
        throw new Error('No transactions found in pasted content. Please check the format.');
      }

      let allTransactions = parseResult.transactions;
      let lastBalance = parseResult.lastBalance || null;
      let creditCardData = null;

      if (parseResult.accountType === 'credit' && parseResult.creditCard) {
        creditCardData = parseResult.creditCard;
        lastBalance = parseResult.creditCard.balance;
      }

      if (allTransactions.length === 0) {
        throw new Error('No transactions to upload. Please check the content format.');
      }

      // Store parsed data
      setParsedTransactionsData({
        transactions: allTransactions,
        lastBalance: lastBalance,
        creditCardData: creditCardData
      });

      setProcessing(false);

      // Fetch accounts AFTER parsing succeeds (like CSV upload does)
      console.log('🔄 Fetching accounts after parsing...');
      let fetchedAccounts = accounts;
      try {
        const data = await getAccounts();
        console.log('📡 API Response:', data);
        fetchedAccounts = data?.accounts || [];
        setAccounts(fetchedAccounts);
        if (fetchedAccounts.length > 0) {
          setSelectedAccount(fetchedAccounts[0].id.toString());
          console.log('✅ Set selected account to:', fetchedAccounts[0].id);
        }
      } catch (err) {
        console.error('❌ Failed to fetch accounts:', err);
      }

      // Debug: Log accounts status
      console.log('📊 Parsed transactions:', allTransactions.length);
      console.log('📊 Accounts available:', fetchedAccounts.length);
      console.log('📊 Accounts:', fetchedAccounts);

      // Always show account selector UI (even if no accounts, to prompt user to create one)
      console.log('🔵 Setting showAccountSelector to TRUE');
      setShowAccountSelector(true);
      console.log('🔵 showAccountSelector should now be true');
      
      if (fetchedAccounts.length > 0) {
        console.log('✅ Showing account selector with accounts');
      } else {
        console.log('⚠️ No accounts found - showing prompt to create account');
      }
    } catch (err) {
      console.error('Processing error:', err);
      const errorMessage = err.response?.data?.message ||
                          err.response?.data?.error ||
                          err.message ||
                          'Failed to process pasted content';
      setError(errorMessage);
      setProcessing(false);
      setParsedTransactionsData(null);
    }
  };

  const uploadParsedTransactions = async (accountId) => {
    if (!parsedTransactionsData) {
      setError('No parsed transactions data found. Please paste and process again.');
      return;
    }

    setShowAccountSelector(false);
    setProcessing(true);
    setError('');
    setResults(null);

    try {
      const { transactions, lastBalance, creditCardData } = parsedTransactionsData;
      const accountToUse = accountId || selectedAccount || null;

      // Upload to backend
      const uploadResult = await uploadTransactions(transactions, accountToUse, lastBalance);

      // Handle credit card data if applicable
      if (creditCardData && accountToUse) {
        const { updateAccount } = await import('../utils/api');
        const account = accounts.find(a => a.id.toString() === accountToUse);

        if (account) {
          await updateAccount(account.id, {
            name: account.name,
            accountType: 'credit',
            color: account.color,
            balance: creditCardData.balance || account.balance,
            currency: account.currency,
            excludeFromStats: account.exclude_from_stats || false,
            creditLimit: creditCardData.creditLimit
          });
        }
      }

      setResults({
        count: uploadResult.count || transactions.length,
        skipped: uploadResult.skipped || 0,
        total: transactions.length,
        transactions: transactions,
        account: accounts.find(a => a.id.toString() === accountToUse)?.name || 'Default',
        balanceUpdated: uploadResult.balanceUpdated,
        isCreditCard: !!creditCardData,
        creditCard: creditCardData
      });

      // Clear parsed data and pasted text after successful upload
      setParsedTransactionsData(null);
      setTimeout(() => {
        setPastedText('');
        onUploadComplete();
      }, 2000);

    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.message ||
                          err.response?.data?.error ||
                          err.message ||
                          'Failed to upload transactions';
      setError(errorMessage);
      setProcessing(false);
      return;
    } finally {
      setProcessing(false);
    }
  };

  // Legacy function name for compatibility - redirects to new flow
  const processPastedContent = async () => {
    await uploadParsedTransactions(selectedAccount);
  };

  const processAndUpload = async () => {
    setShowAccountSelector(false);
    setProcessing(true);
    setError('');
    setResults(null);


    try {
      let allTransactions = [];
      let lastBalance = null;
      let creditCardData = null;
      
      for (const file of files) {
        let parseResult;
        
        // Determine file type - check both MIME type and extension
        const fileName = file.name.toLowerCase();
        const isPDF = file.type === 'application/pdf' || fileName.endsWith('.pdf');
        const isCSV = file.type === 'text/csv' || 
                     file.type === 'application/vnd.ms-excel' ||
                     fileName.endsWith('.csv') || 
                     fileName.endsWith('.xls') || 
                     fileName.endsWith('.xlsx');
        
        if (isPDF) {
          parseResult = await parsePDFTransactions(file);
        } else if (isCSV) {
          parseResult = await parseCSVTransactions(file);
        } else {
          console.error(`Unknown file type: ${file.type}, file: ${file.name}`);
          setError(`Unsupported file type: ${file.type || 'unknown'}. Please upload PDF or CSV files.`);
          setProcessing(false);
          return;
        }
        
        if (!parseResult || !parseResult.transactions) {
          console.error(`No transactions found in ${file.name}`);
          continue;
        }
        
        if (parseResult.transactions.length === 0) {
          console.warn(`Parse result has 0 transactions for ${file.name}`);
        }
        
        allTransactions = [...allTransactions, ...parseResult.transactions];
        
        // Check if it's a credit card statement
        if (parseResult.accountType === 'credit' && parseResult.creditCard) {
          creditCardData = parseResult.creditCard;
          lastBalance = parseResult.creditCard.balance; // Use credit card debt as balance
        }
        
        // Store last balance from CSV if available
        if (parseResult.lastBalance !== undefined && parseResult.lastBalance !== null) {
          lastBalance = parseResult.lastBalance;
        }
      }

      if (allTransactions.length === 0) {
        throw new Error('No transactions to upload. Please check the file format.');
      }
      
      // Upload to backend with selected account and balance
      const uploadResult = await uploadTransactions(allTransactions, selectedAccount || null, lastBalance);
      
      // If it's a credit card, update the account with credit limit
      if (creditCardData && selectedAccount) {
        const { updateAccount } = await import('../utils/api');
        const account = accounts.find(a => a.id.toString() === selectedAccount);
        
        if (account) {
          await updateAccount(account.id, {
            name: account.name,
            accountType: 'credit',
            color: account.color,
            balance: creditCardData.balance || account.balance,
            currency: account.currency,
            excludeFromStats: account.exclude_from_stats || false,
            creditLimit: creditCardData.creditLimit
          });
        }
      }
      
      setResults({
        count: uploadResult.count || allTransactions.length,
        skipped: uploadResult.skipped || 0,
        total: allTransactions.length,
        transactions: allTransactions,
        account: accounts.find(a => a.id.toString() === selectedAccount)?.name || 'Default',
        balanceUpdated: uploadResult.balanceUpdated,
        isCreditCard: !!creditCardData,
        creditCard: creditCardData
      });

      // Clear files after successful upload
      setTimeout(() => {
        setFiles([]);
        onUploadComplete();
      }, 2000);

    } catch (err) {
      console.error('Processing error:', err);
      
      // Show more detailed error message
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to process files';
      
      setError(errorMessage);
      // Don't redirect on error - let user see the error
      setProcessing(false);
      return;
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Upload Area */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-3xl font-bold text-gradient mb-2">{t('uploadTitle')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('uploadDescription')}
        </p>

        {/* Mode Selector */}
        <div className="flex space-x-2 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setUploadMode('file')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
              uploadMode === 'file'
                ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <UploadIcon className="w-4 h-4 inline mr-2" />
            Upload File
          </button>
          <button
            onClick={() => setUploadMode('paste')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
              uploadMode === 'paste'
                ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Clipboard className="w-4 h-4 inline mr-2" />
            Paste Text
          </button>
        </div>

        {/* File Upload Section */}
        {uploadMode === 'file' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
              ${isDragging 
                ? 'border-primary bg-blue-50' 
                : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }
            `}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload files"
          >
            <div className="gradient-primary p-4 rounded-full mx-auto mb-4 w-20 h-20 flex items-center justify-center">
              <UploadIcon className="w-10 h-10 text-white" />
            </div>
            <p className="text-lg font-bold text-gray-700 mb-2">
              {t('dropFilesHere')}
            </p>
            <p className="text-sm text-gray-500">
              {t('supportsFiles')}
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.csv,.xls,.xlsx"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        )}

        {/* Paste Text Section */}
        {uploadMode === 'paste' && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Clipboard className="w-6 h-6 text-primary" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Paste Bank Statement Content
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Copy and paste content directly from your bank's website
                </p>
              </div>
            </div>
            
            <textarea
              ref={textareaRef}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              onPaste={(e) => {
                // Auto-focus and select all on paste for better UX
                setTimeout(() => {
                  textareaRef.current?.select();
                }, 10);
              }}
              placeholder="Paste your bank statement content here...&#10;&#10;Example formats:&#10;- CSV: Date,Description,Amount&#10;- Table format from bank website&#10;- Plain text with transaction data"
              className="w-full h-64 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              style={{ fontFamily: 'monospace' }}
            />
            
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {pastedText.length > 0 ? `${pastedText.split('\n').length} lines` : 'Ready to paste'}
              </p>
              {pastedText.length > 0 && (
                <button
                  onClick={() => setPastedText('')}
                  className="text-xs text-gray-500 hover:text-danger transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="font-medium text-gray-700">Selected Files ({files.length})</h3>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="text-gray-400 hover:text-danger transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Process Button - File Mode */}
        {uploadMode === 'file' && files.length > 0 && !showAccountSelector && (
          <button
            onClick={processFiles}
            disabled={processing}
            className="mt-6 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>{t('processing')}</span>
              </>
            ) : (
              <>
                <UploadIcon className="w-5 h-5" />
                <span>{t('processAndUpload')}</span>
              </>
            )}
          </button>
        )}

        {/* Process Button - Paste Mode */}
        {uploadMode === 'paste' && pastedText.trim() && !showAccountSelector && (
          <button
            onClick={processPastedText}
            disabled={processing}
            className="mt-6 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>{t('processing')}</span>
              </>
            ) : (
              <>
                <Clipboard className="w-5 h-5" />
                <span>Process Pasted Content</span>
              </>
            )}
          </button>
        )}

        {/* Account Selector Modal */}
        {showAccountSelector && (
          <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border-2 border-purple-200" style={{ zIndex: 1000 }}>
            <div className="flex items-center space-x-3 mb-4">
              <Building2 className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Select Account for Transactions
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {parsedTransactionsData ? (
                <>
                  ✅ Successfully parsed <strong>{parsedTransactionsData.transactions.length} transactions</strong>.
                  <br />
                  {accounts.length > 0 ? (
                    'Choose which account these transactions belong to:'
                  ) : (
                    <>
                      ⚠️ <strong>No accounts found.</strong> Please create an account first in Settings, then try again.
                    </>
                  )}
                </>
              ) : (
                accounts.length > 0 ? (
                  'Choose which account these transactions belong to:'
                ) : (
                  '⚠️ No accounts found. Please create an account first.'
                )
              )}
            </p>
            {accounts.length > 0 ? (
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="input-primary mb-4"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.account_type}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 <strong>Tip:</strong> Go to <strong>Settings</strong> → <strong>Accounts</strong> to create your first bank account, then come back here to upload transactions.
                </p>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (uploadMode === 'file') {
                    processAndUpload();
                  } else {
                    uploadParsedTransactions(selectedAccount);
                  }
                }}
                disabled={processing || (accounts.length > 0 && !selectedAccount) || accounts.length === 0}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>{t('processing')}</span>
                  </>
                ) : accounts.length === 0 ? (
                  <>
                    <Building2 className="w-5 h-5" />
                    <span>Create Account First (Go to Settings)</span>
                  </>
                ) : (
                  <>
                    {uploadMode === 'file' ? (
                      <>
                        <UploadIcon className="w-5 h-5" />
                        <span>Upload to Selected Account</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-5 h-5" />
                        <span>Upload to Selected Account</span>
                      </>
                    )}
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowAccountSelector(false);
                  setParsedTransactionsData(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {results && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-success">
                Successfully processed {results.count} transactions!
              </p>
              {results.isCreditCard && results.creditCard && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900">
                    💳 Credit Card Detected: {results.creditCard.name}
                  </p>
                  {results.creditCard.creditLimit && (
                    <p className="text-xs text-blue-700 mt-1">
                      Credit Limit: €{results.creditCard.creditLimit.toFixed(2)}
                    </p>
                  )}
                  {results.creditCard.currentDebt && (
                    <p className="text-xs text-red-700 mt-1">
                      Current Debt: €{results.creditCard.currentDebt.toFixed(2)}
                    </p>
                  )}
                  {results.creditCard.availableCredit && (
                    <p className="text-xs text-green-700 mt-1">
                      Available Credit: €{results.creditCard.availableCredit.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
              {results.skipped > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ {results.skipped} duplicate(s) skipped
                </p>
              )}
              {results.balanceUpdated && (
                <p className="text-xs text-blue-600 mt-1">
                  ✅ Account balance updated from CSV
                </p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                ✅ Upload complete! You can continue uploading more files or navigate to other sections.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Instructions</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start space-x-2">
            <span className="text-primary font-bold">1.</span>
            <span>Download your bank statement as PDF, CSV or Excel from ING or Sabadell online banking.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-primary font-bold">2.</span>
            <span>For Sabadell: Export "Consulta de movimientos" or "Credit Card Statement" as Excel/CSV.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-primary font-bold">3.</span>
            <span>Drag and drop the file(s) into the upload area above, or click to browse.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-primary font-bold">4.</span>
            <span>Click "Process and Upload" - the app auto-detects the format and extracts transactions.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-primary font-bold">5.</span>
            <span>View your financial dashboard with charts and insights automatically generated.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Upload;


