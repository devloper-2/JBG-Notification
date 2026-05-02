import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from './apiConstants';
import { checkAndHandleTokenExpiration } from './tokenHandler';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling and token expiration
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Check if this is a token expiration error and handle it
    if (checkAndHandleTokenExpiration(error)) {
      // Don't proceed with normal error handling if token expired
      return Promise.reject(new Error('Token expired - user logged out'));
    }
    
    return Promise.reject(error);
  }
);

// Utility methods for managing auth headers
export const setAuthHeader = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const clearAuthHeader = () => {
  delete api.defaults.headers.common['Authorization'];
};