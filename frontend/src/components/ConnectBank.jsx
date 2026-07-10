import React, { useEffect, useState } from 'react';
import { Link2, RefreshCw, Trash2, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import {
  startSaltEdgeConnect,
  listSaltEdgeConnections,
  syncSaltEdgeConnection,
  removeSaltEdgeConnection,
} from '../utils/api';

function ConnectBank({ onSyncComplete }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const fetchConnections = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSaltEdgeConnections();
      setConnections(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleConnect = async () => {
    setError('');
    setInfo('');
    try {
      const returnTo = `${window.location.origin}/?saltedge=return`;
      const { connectUrl } = await startSaltEdgeConnect(returnTo);
      window.location.href = connectUrl;
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to start connection');
    }
  };

  const handleSync = async (connectionId) => {
    setBusyId(connectionId);
    setError('');
    setInfo('');
    try {
      const r = await syncSaltEdgeConnection(connectionId);
      setInfo(`Imported ${r.transactionsImported} transactions across ${r.accountsCreated} new accounts.`);
      if (onSyncComplete) onSyncComplete();
    } catch (e) {
      setError(e.response?.data?.error || 'Sync failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (connectionId) => {
    if (!confirm('Disconnect this bank? Existing transactions remain but no further sync.')) return;
    setBusyId(connectionId);
    try {
      await removeSaltEdgeConnection(connectionId);
      await fetchConnections();
    } catch (e) {
      setError(e.response?.data?.error || 'Remove failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Connect Bank (Salt Edge)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Auto-import transactions from Sabadell and other banks via PSD2.
          </p>
        </div>
        <button
          onClick={handleConnect}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Link2 size={16} /> Connect Bank
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-3">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {info && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-3">
          <CheckCircle size={16} /> {info}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader size={16} className="animate-spin" /> Loading…</div>
      ) : connections.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No bank connections yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {connections.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{c.provider_name || c.provider_code}</div>
                <div className="text-xs text-gray-500">
                  Status: {c.status} · Last success: {c.last_success_at || 'never'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSync(c.id)}
                  disabled={busyId === c.id}
                  className="inline-flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {busyId === c.id ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync
                </button>
                <button
                  onClick={() => handleRemove(c.id)}
                  disabled={busyId === c.id}
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ConnectBank;
