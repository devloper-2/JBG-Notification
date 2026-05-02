import axios from 'axios';
import { LoginCredentials, LoginResponse } from '../types/auth';
import { api, setAuthHeader as setApiAuthHeader, clearAuthHeader as clearApiAuthHeader } from '../utils/apiClient';

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('AuthService: Making login request to API'); // Debug log
      console.log('AuthService: API URL:', api.defaults.baseURL); // Debug log

      const response = await api.post<LoginResponse>('/login', credentials);

      console.log('AuthService: API response received', response.status); // Debug log

      if (!response.data.user || !response.data.accessToken) {
        throw new Error('Invalid response format');
      }

      return response.data;
    } catch (error) {
      console.error('AuthService: Login error:', error); // Enhanced debug log
      if (axios.isAxiosError(error)) {
        console.log('AuthService: Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          code: error.code
        });

        if (error.response?.status === 401) {
          throw new Error('Invalid email or password');
        } else if (error.response?.status && error.response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please check your connection.');
        } else {
          throw new Error(error.response?.data?.message || 'Login failed');
        }
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  // Method to set authorization header for future requests
  setAuthHeader(token: string) {
    setApiAuthHeader(token);
  }

  // Method to remove authorization header
  clearAuthHeader() {
    clearApiAuthHeader();
  }
}

export const authService = new AuthService();
export { api };
