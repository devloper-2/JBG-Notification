// Global reference to the logout function - will be set by AuthContext
let globalLogout: (() => void) | null = null;

export const setLogoutHandler = (logoutFn: () => void) => {
  globalLogout = logoutFn;
};

export const clearLogoutHandler = () => {
  globalLogout = null;
};

/**
 * Check if an API response indicates an expired or invalid token
 * @param error - The axios error or response data
 * @returns true if token is expired/invalid
 */
export const isTokenExpiredError = (error: any): boolean => {
  // Check various possible error formats for token expiration
  if (!error) return false;

  // Direct message check
  if (typeof error === 'string') {
    return error.toLowerCase().includes('invalid or expired token');
  }

  // Object with message property
  if (error.message && typeof error.message === 'string') {
    return error.message.toLowerCase().includes('invalid or expired token');
  }

  // Axios error response
  if (error.response?.data) {
    const data = error.response.data;
    
    // Check message in response data
    if (data.message && typeof data.message === 'string') {
      return data.message.toLowerCase().includes('invalid or expired token');
    }

    // Check error field
    if (data.error && typeof data.error === 'string') {
      return data.error.toLowerCase().includes('invalid or expired token');
    }

    // Check details array
    if (Array.isArray(data.details)) {
      return data.details.some((detail: string) => 
        typeof detail === 'string' && detail.toLowerCase().includes('invalid or expired token')
      );
    }
  }

  // Check for 401 status with specific patterns
  if (error.response?.status === 401) {
    const data = error.response.data;
    if (data && (
      (data.message && data.message.toLowerCase().includes('token')) ||
      (data.error && data.error.toLowerCase().includes('token'))
    )) {
      return true;
    }
  }

  return false;
};

/**
 * Handle token expiration by triggering logout
 * @param error - The error that triggered this handler
 */
export const handleTokenExpiration = (error?: any) => {
  console.warn('Token expired or invalid. Logging out user...', error);
  
  if (globalLogout) {
    globalLogout();
  } else {
    console.error('No logout handler registered. User cannot be logged out automatically.');
  }
};

/**
 * Check if error indicates token expiration and handle it
 * @param error - The error to check
 * @returns true if token expiration was detected and handled
 */
export const checkAndHandleTokenExpiration = (error: any): boolean => {
  if (isTokenExpiredError(error)) {
    handleTokenExpiration(error);
    return true;
  }
  return false;
};