import { useState, useEffect } from 'react';
import api from '../../utils/api';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const shortName = (name) =>
  name.replace(/Sabadell|ING|Cuenta|BBVA|CaixaBank/gi, '').trim().replace(/\s+/g, ' ') || name;

const statusClasses = {
  ok:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  new:  'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export default function CopyGuide({ onRevert, reverting }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    api.get('/upload/copy-guide')
      .then(r => setData(r.data))
      .catch(err => console.error('CopyGuide fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="text-sm text-gray-400 dark:text-gray-500 p-3 text-center animate-pulse">
      Cargando guía de copia…
    </div>
  );
  if (!data) return null;

  const { accounts, lastUpload } = data;
  const hasWarnings = accounts.some(a => a.status === 'warn');

  const Chevron = ({ open }) => (
    <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <div className="space-y-3 mb-6">

      {/* ── Acordeón 1: Copiar desde por cuenta ── */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setGuideOpen(o => !o)}
          className="w-full flex items-start justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
        >
          <div className="flex gap-3 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${hasWarnings ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1.5">
                Copiar desde — por cuenta
              </p>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map(acc => (
                  <span key={acc.accountId} className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClasses[acc.status]}`}>
                    {shortName(acc.accountName)} · {acc.copyFromDate ? formatDate(acc.copyFromDate) : 'Sin datos'}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Chevron open={guideOpen} />
        </button>

        {guideOpen && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 px-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider py-3">
                Fecha desde la que copiar en el banco
              </p>
              {accounts.map(acc => (
                <div key={acc.accountId} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{acc.accountName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {acc.bank} · última tx: {acc.lastTransactionDate ? formatDate(acc.lastTransactionDate) : 'Sin transacciones'}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusClasses[acc.status]}`}>
                    {acc.copyFromDate ? `desde ${formatDate(acc.copyFromDate)}` : 'Sin datos'}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 mx-4 mb-3 p-3 rounded-lg border-l-2 border-blue-400">
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                <strong>Verde</strong> = al día (≤5 días). <strong>Ámbar</strong> = hay días sin copiar. En Sabadell Web, filtra por fecha ≥ la indicada antes de copiar.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Acordeón 2: Último upload ── */}
      {lastUpload && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setUploadOpen(o => !o)}
            className="w-full flex items-start justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
          >
            <div className="flex gap-3 flex-1 min-w-0">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1.5">Último upload</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {lastUpload.accountName}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {formatDateTime(lastUpload.uploadedAt)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {lastUpload.transactionCount} transacciones
                  </span>
                </div>
              </div>
            </div>
            <Chevron open={uploadOpen} />
          </button>

          {uploadOpen && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Detalles</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cuenta</span>
                  <span className="font-medium text-gray-900 dark:text-white">{lastUpload.accountName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Importadas</span>
                  <span className="font-medium text-gray-900 dark:text-white">{lastUpload.transactionCount} transacciones</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDateTime(lastUpload.uploadedAt)}</span>
                </div>
                {lastUpload.examples?.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ejemplos</span>
                    <span className="text-gray-400 text-xs text-right max-w-[60%]">{lastUpload.examples.join(' · ')}</span>
                  </div>
                )}
              </div>
              {onRevert && (
                <div className="px-4 pb-4">
                  <button
                    onClick={onRevert}
                    disabled={reverting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs"
                  >
                    {reverting ? (
                      <>
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Revirtiendo…
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                        </svg>
                        Revertir Upload
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
