import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Coach Portal AuthCallback: Starting authentication callback...');
        
        // Check if we have a hash in the URL (magic link)
        const hash = window.location.hash;
        console.log('Coach Portal AuthCallback: URL hash:', hash);
        
        // Check for access token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        
        console.log('Coach Portal AuthCallback: Access token in URL:', !!accessToken);
        console.log('Coach Portal AuthCallback: Refresh token in URL:', !!refreshToken);
        
        const { data, error } = await supabase.auth.getSession();
        
        console.log('Coach Portal AuthCallback: getSession result:', { 
          hasData: !!data, 
          hasSession: !!data?.session, 
          error: error?.message 
        });
        
        if (error) {
          console.error('Coach Portal AuthCallback: Session error:', error);
          setError(error.message);
          setIsLoading(false);
          return;
        }

        if (data.session) {
          console.log('Coach Portal AuthCallback: Session found, redirecting to main app...');
          // Successfully authenticated, redirect to main app
          window.location.href = '/';
        } else {
          console.error('Coach Portal AuthCallback: No session found after authentication');
          setError('No session found after authentication');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Coach Portal AuthCallback: Unexpected error:', err);
        setError('An unexpected error occurred during authentication');
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign in...</h2>
          <p className="text-gray-600">Please wait while we verify your authentication.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200 max-w-md w-full">
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-4 mb-6 inline-block">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              Please try signing in again or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback; 