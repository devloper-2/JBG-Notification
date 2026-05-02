import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, LoginCredentials, AuthContextType } from '../types/auth';
import { authService } from '../services/authService';
import { setLogoutHandler, clearLogoutHandler } from '../utils/tokenHandler';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('userData');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          // Set auth header for future requests
          authService.setAuthHeader(storedToken);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear corrupted data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Register logout handler for token expiration
  useEffect(() => {
    setLogoutHandler(logout);
    
    return () => {
      clearLogoutHandler();
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      console.log('AuthContext: Starting login process'); // Debug log
      setIsLoading(true);
      const response = await authService.login(credentials);
      
      console.log('AuthContext: Login response received', { user: response.user?.email }); // Debug log
      
      // Store user data and token
      setUser(response.user);
      setToken(response.accessToken);
      
      // Set auth header for future requests
      authService.setAuthHeader(response.accessToken);
      
      // Persist to localStorage
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('userData', JSON.stringify(response.user));
      
      console.log('AuthContext: Login completed successfully'); // Debug log
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // Clear auth header
    authService.clearAuthHeader();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    
    // Redirect to login page
    window.location.href = '/signin';
  };

  const isAuthenticated = !!user && !!token;

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
