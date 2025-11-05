import React, { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, FileText, X, CheckCircle, AlertCircle, Loader, Building2 } from 'lucide-react';
import { parsePDFTransactions, parseCSVTransactions } from '../utils/pdfParser';
import { uploadTransactions, getAccounts } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

function Upload({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const fileInputRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    fetchAccounts();
  }, []);

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
        
        console.log(`📄 Processing file: ${file.name}, type: ${file.type}`);
        
        if (file.type === 'application/pdf') {
          parseResult = await parsePDFTransactions(file);
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
          parseResult = await parseCSVTransactions(file);
        }
        
        console.log(`📊 Parse result for ${file.name}:`, {
          bank: parseResult?.bank,
          transactionCount: parseResult?.transactions?.length || 0,
          accountNumber: parseResult?.accountNumber,
          lastBalance: parseResult?.lastBalance,
          transactions: parseResult?.transactions?.slice(0, 3) // Show first 3
        });
        
        if (!parseResult || !parseResult.transactions) {
          console.error(`❌ No transactions found in ${file.name}`);
          continue;
        }
        
        if (parseResult.transactions.length === 0) {
          console.warn(`⚠️ Parse result has 0 transactions for ${file.name}`);
        }
        
        allTransactions = [...allTransactions, ...parseResult.transactions];
        
        // Check if it's a credit card statement
        if (parseResult.accountType === 'credit' && parseResult.creditCard) {
          creditCardData = parseResult.creditCard;
          lastBalance = parseResult.creditCard.balance; // Use credit card debt as balance
          console.log('💳 Credit Card Statement Detected:', creditCardData);
        }
        
        // Store last balance from CSV if available
        if (parseResult.lastBalance !== undefined && parseResult.lastBalance !== null) {
          lastBalance = parseResult.lastBalance;
        }
      }

      console.log(`📤 Uploading ${allTransactions.length} transactions to backend...`);
      
      if (allTransactions.length === 0) {
        throw new Error('No transactions to upload. Please check the file format.');
      }
      
      // Upload to backend with selected account and balance
      const uploadResult = await uploadTransactions(allTransactions, selectedAccount || null, lastBalance);
      
      console.log(`✅ Upload result:`, {
        count: uploadResult.count,
        skipped: uploadResult.skipped,
        total: allTransactions.length,
        balanceUpdated: uploadResult.balanceUpdated
      });
      
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
          
          console.log(`✅ Updated credit card account with limit: €${creditCardData.creditLimit}`);
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
      setError(err.message || 'Failed to process files');
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

        {/* Process Button */}
        {files.length > 0 && !showAccountSelector && (
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

        {/* Account Selector Modal */}
        {showAccountSelector && (
          <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border-2 border-purple-200">
            <div className="flex items-center space-x-3 mb-4">
              <Building2 className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Select Account for Transactions
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Choose which account these transactions belong to:
            </p>
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
            <div className="flex space-x-3">
              <button
                onClick={processAndUpload}
                disabled={processing}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>{t('processing')}</span>
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-5 h-5" />
                    <span>Upload to Selected Account</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAccountSelector(false)}
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
                Redirecting to dashboard...
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


