import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthMagicLink from './AuthMagicLink';

const AuthWrapper = ({ children }) => {
  const { user, isLoading } = useAuth();

  

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
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