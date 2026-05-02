// API Configuration Constants
//
// Usage:
// 1. Change CURRENT_ENV to 'LOCAL' for development or 'LIVE' for production
// 2. All service files automatically use the correct API URL
// 3. Use getApiUrl() helper for constructing full URLs if needed

export const API_URLS = {
  // Local development API
  // LOCAL: 'http://localhost:3000/api',
  // LOCAL: 'https://api.codezpark.com/jbg',
  LOCAL: 'https://api.jbggola.com/api',

  // Live production API
  LIVE: 'https://api.jbggola.com/api',
  // LIVE: 'http://localhost:3000/api',
} as const;

// Current environment - change this to switch between local and live
export const CURRENT_ENV: keyof typeof API_URLS = 'LOCAL';

// Get the current API base URL
export const API_BASE_URL = API_URLS[CURRENT_ENV];

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};
