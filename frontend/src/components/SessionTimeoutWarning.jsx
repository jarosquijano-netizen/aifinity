import React from 'react';
import { AlertTriangle } from 'lucide-react';

function SessionTimeoutWarning({ timeRemaining, onStayLoggedIn, onLogout }) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-fadeIn">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">
              Session Timeout Warning
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Your session will expire due to inactivity
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-center">
              <span className="text-3xl font-bold text-yellow-600">
                {formattedTime}
              </span>
              <span className="text-sm text-gray-600 ml-2">
                remaining
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onStayLoggedIn}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Logout Now
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Click anywhere or press any key to stay logged in
        </p>
      </div>
    </div>
  );
}

export default SessionTimeoutWarning;

