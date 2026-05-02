import React from 'react';
import { API_BASE_URL, CURRENT_ENV, API_URLS } from '../../utils/apiConstants';

const ApiConfigDebug: React.FC = () => {
  return (
    <div className="fixed top-4 left-4 bg-blue-100 border border-blue-400 p-4 rounded shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-sm mb-2">🔧 API Config Debug</h3>
      <div className="text-xs space-y-1">
        <div>
          <strong>Current Environment:</strong> {CURRENT_ENV}
        </div>
        <div>
          <strong>API Base URL:</strong> {API_BASE_URL}
        </div>
        <div>
          <strong>Available URLs:</strong>
          <ul className="ml-2">
            <li>Local: {API_URLS.LOCAL}</li>
            <li>Live: {API_URLS.LIVE}</li>
          </ul>
        </div>
        <div>
          <strong>Test URL:</strong> {API_BASE_URL}/outlet-menu-items
        </div>
      </div>
    </div>
  );
};

export default ApiConfigDebug;