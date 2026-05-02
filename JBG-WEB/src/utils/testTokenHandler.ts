import { isTokenExpiredError } from '../utils/tokenHandler';

// Test function to demonstrate token expiration error detection
export const testTokenExpirationDetection = () => {
  console.log('Testing token expiration error detection...');

  // Test cases for different error formats
  const testCases = [
    // Direct string message
    "Invalid or expired token.",
    
    // Object with message property
    { message: "Invalid or expired token." },
    
    // Axios error response format
    { 
      response: { 
        data: { 
          message: "Invalid or expired token." 
        } 
      } 
    },
    
    // Error with details array
    { 
      response: { 
        data: { 
          message: "Authentication failed", 
          details: ["Invalid or expired token."] 
        } 
      } 
    },
    
    // 401 status with token-related message
    { 
      response: { 
        status: 401, 
        data: { 
          message: "Token verification failed" 
        } 
      } 
    },
    
    // Non-token related error (should return false)
    { message: "Network error" },
    
    // 500 error (should return false)
    { 
      response: { 
        status: 500, 
        data: { 
          message: "Server error" 
        } 
      } 
    }
  ];

  testCases.forEach((testCase, index) => {
    const isExpired = isTokenExpiredError(testCase);
    console.log(`Test case ${index + 1}:`, {
      input: testCase,
      detected: isExpired,
      expected: index < 5 // First 5 should be detected as token errors
    });
  });

  console.log('Token expiration detection test completed.');
};

// Function to simulate API call with expired token response
export const simulateExpiredTokenCall = async () => {
  console.log('Simulating API call that returns expired token error...');
  
  // This simulates what would happen when an API returns an expired token error
  const mockError = {
    response: {
      status: 401,
      data: {
        message: "Invalid or expired token."
      }
    }
  };

  // This would normally be caught by our axios interceptor
  console.log('Mock error that would trigger logout:', mockError);
  
  return mockError;
};