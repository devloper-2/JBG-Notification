import React from 'react';
import UnitSelectExample from '../components/form/UnitSelectExample';

const UnitTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Unit API Integration Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing dynamic unit loading from API: <code>https://api.codezpark.com/jbg/get-unit</code>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <UnitSelectExample />
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              API Integration Features
            </h2>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Dynamic API data loading
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Multilingual support (English, Gujarati, Hindi)
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Grouped by unit type
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Error handling with retry
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                Loading states
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                Bearer token authentication
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitTestPage;