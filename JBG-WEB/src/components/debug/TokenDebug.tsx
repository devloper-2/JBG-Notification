import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import outletMenuService from '../../services/outletMenuService';

const TokenDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string>('');
  const { token, user, isAuthenticated } = useAuth();

  useEffect(() => {
    const checkToken = () => {
      const localStorageToken = localStorage.getItem('accessToken');
      const localStorageUser = localStorage.getItem('userData');
      
      setDebugInfo({
        contextToken: token,
        contextUser: user,
        isAuthenticated,
        localStorageToken: localStorageToken,
        localStorageUser: localStorageUser ? JSON.parse(localStorageUser) : null,
        timestamp: new Date().toISOString()
      });
    };

    checkToken();
    // Check every 2 seconds
    const interval = setInterval(checkToken, 2000);
    
    return () => clearInterval(interval);
  }, [token, user, isAuthenticated]);

  const testApiCall = async () => {
    try {
      setTestResult('Testing...');
      await outletMenuService.testTokenCall();
      setTestResult('✅ API call successful!');
    } catch (error: any) {
      setTestResult(`❌ API call failed: ${error.message}`);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 p-4 rounded shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-sm mb-2">🔍 Auth Debug Info</h3>
      <div className="text-xs space-y-1">
        <div>
          <strong>Authenticated:</strong> {debugInfo.isAuthenticated ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Context Token:</strong> {debugInfo.contextToken ? `${debugInfo.contextToken.substring(0, 20)}...` : '❌ None'}
        </div>
        <div>
          <strong>LocalStorage Token:</strong> {debugInfo.localStorageToken ? `${debugInfo.localStorageToken.substring(0, 20)}...` : '❌ None'}
        </div>
        <div>
          <strong>User Email:</strong> {debugInfo.contextUser?.email || debugInfo.localStorageUser?.email || '❌ None'}
        </div>
        <div>
          <strong>Last Check:</strong> {debugInfo.timestamp?.substring(11, 19) || 'Never'}
        </div>
        <div className="mt-2">
          <button 
            onClick={testApiCall}
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            Test API Call
          </button>
        </div>
        {testResult && (
          <div className="mt-1 text-xs font-mono">
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenDebug;