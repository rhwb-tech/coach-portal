import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthMagicLink from './AuthMagicLink';

const AuthWrapper = ({ children }) => {
  const { user, isLoading } = useAuth();

  // Add a fallback timeout to prevent getting stuck
  const [showFallback, setShowFallback] = useState(false);
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setShowFallback(true);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Show loading state while auth is initializing
  if (isLoading && !showFallback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show fallback if loading takes too long
  if (showFallback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <div className="flex items-center space-x-2 text-yellow-700 mb-2">
              <div className="w-5 h-5">⚠️</div>
              <h3 className="font-medium">Connection Issue</h3>
            </div>
            <p className="text-yellow-600 text-sm mb-4">
              The app is taking longer than expected to initialize. This might be due to a network issue.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated, show the main app
  if (user) {
    return children;
  }

  // Show Magic Link authentication
  return <AuthMagicLink />;
};

export default AuthWrapper; 