import React, { createContext, useContext, useState, useEffect } from 'react';

// JWT decoding utility (without external library)
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Invalid JWT token:', error);
    return null;
  }
}

function isTokenExpired(exp) {
  // Add 5 minutes buffer time to prevent edge cases
  const bufferTime = 300;
  return Date.now() >= (exp * 1000) - (bufferTime * 1000);
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from stored token or URL parameter
  useEffect(() => {
    const initializeAuth = async () => {
      let tokenToUse = null;
      let tokenSource = '';
      
      // Priority 1: Check URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        tokenToUse = urlToken;
        tokenSource = 'url';
      }
      
      // Priority 2: Check stored token
      if (!tokenToUse) {
        const storedToken = localStorage.getItem('coach_portal_auth_token');
        if (storedToken) {
          tokenToUse = storedToken;
          tokenSource = 'storage';
        }
      }
      
      if (tokenToUse) {
        const success = await validateAndSetToken(tokenToUse);
        if (success) {
          // Store token if it came from URL
          if (tokenSource === 'url') {
            localStorage.setItem('coach_portal_auth_token', tokenToUse);
          }
          
          // Clean URL if token came from URL parameter
          if (tokenSource === 'url') {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.delete('token');
            const cleanUrl = window.location.pathname + 
              (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, document.title, cleanUrl);
          }
          
          console.log(`JWT token loaded from: ${tokenSource}`);
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const validateAndSetToken = async (tokenString) => {
    console.log('🔍 Starting JWT token validation...');
    console.log('Token length:', tokenString.length);
    console.log('Token preview:', tokenString.substring(0, 50) + '...');

    const payload = parseJwt(tokenString);
    
    if (!payload) {
      console.error('❌ Invalid JWT token format - could not parse payload');
      return false;
    }

    console.log('✅ JWT payload parsed successfully:', payload);

    // Check required fields
    if (!payload.email || !payload.exp) {
      console.error('❌ JWT token missing required fields (email, exp)');
      console.error('Available fields:', Object.keys(payload));
      return false;
    }

    console.log('✅ JWT required fields present');

    // Check if token is expired
    if (isTokenExpired(payload.exp)) {
      console.error('❌ JWT token has expired');
      const expDate = new Date(payload.exp * 1000);
      console.error('Token expired at:', expDate.toISOString());
      console.error('Current time:', new Date().toISOString());
      return false;
    }

    console.log('✅ JWT token is not expired');

    // Set user and token
    const user = {
      email: payload.email,
      name: payload.name,
      exp: payload.exp
    };

    setUser(user);
    setToken(tokenString);
    return true;
  };

  const login = async (tokenString) => {
    const success = await validateAndSetToken(tokenString);
    if (success) {
      localStorage.setItem('coach_portal_auth_token', tokenString);
    }
    return success;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('coach_portal_auth_token');
    console.log('User logged out - token cleared');
  };

  // Check token expiration periodically
  useEffect(() => {
    if (user && user.exp) {
      const checkExpiration = () => {
        if (isTokenExpired(user.exp)) {
          console.warn('Token expired, logging out...');
          logout();
        }
      };

      // Check every minute
      const interval = setInterval(checkExpiration, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 