import React, { useState, useEffect } from 'react';
import { TrendingUp, CheckCircle, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthOTPVerification from './AuthOTPVerification';

const AuthMagicLink = () => {
  const { login, logout, isLoading, isEmailSent, clearEmailSent, user, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  


  // Load saved email on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rhwb-coach-portal_user_email');
    const savedRememberMe = localStorage.getItem('rhwb-coach-portal_remember_me');
    
    if (savedEmail && savedRememberMe === 'true') {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Check if we're in override mode
  const urlParams = new URLSearchParams(window.location.search);
  const overrideEmail = urlParams.get('email');
  const isOverrideMode = !!overrideEmail;

  const handleLogin = async () => {
    setLoginError('');
    
    if (!email) {
      setLoginError('Please enter your email address');
      return;
    }

    try {
      const result = await login(email, rememberMe);
      
      if (!result.success) {
        const errorMessage = result.error || 'Failed to send OTP';
        setLoginError(errorMessage);
        alert(errorMessage);
      } else if (result.fromSession) {
        // User authenticated from session - no OTP needed
        // The user state will be set by the login function, so we don't need to do anything else
      } else {
        // OTP sent successfully - AuthContext will set isEmailSent to true
      }
    } catch (error) {
      console.error('DEBUG: Login error:', error);
      setLoginError('An error occurred. Please try again.');
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (loginError) setLoginError('');
  };

  const handleOTPSuccess = (session) => {
    // OTP verification successful, user will be automatically logged in
    // Don't clear email sent state immediately - let the auth state change handle it
  };

  const handleOTPBack = () => {
    clearEmailSent();
  };

  // Show loading spinner while checking authentication (but not during OTP verification)
  if (isLoading && !isEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show user info and logout option if authenticated
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header with user info and logout */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">RHWB Connect</h1>
                  <p className="text-sm text-gray-600">
                    Welcome, {user.name || user.email} ({user.role})
                    {isOverrideMode && (
                      <span className="text-orange-600 font-bold ml-2">(Override Mode)</span>
                    )}
                  </p>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Successful</h2>
            <p className="text-gray-600">You are now signed in and can access the dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show OTP verification if needed - This should render when isEmailSent is true
  if (isEmailSent) {
    return (
      <AuthOTPVerification
        email={email}
        onBack={handleOTPBack}
        onSuccess={handleOTPSuccess}
      />
    );
  }

  // Show login form if not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200 max-w-md w-full">
        <div>
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl mb-6 inline-block">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">RHWB Connect</h1>
            <p className="text-gray-600">Sign in with your authorized email to access the dashboard</p>
          </div>

          {/* Error Messages */}
          {(loginError || authError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{loginError || authError}</p>
            </div>
          )}

          {/* Authentication Info */}
          <div className="mb-6">
            <div className="flex items-center justify-center mb-3">
              <Key className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Secure Authentication</span>
            </div>
            <p className="text-xs text-gray-500 text-center">
              If you have an active session, you'll be signed in immediately. Otherwise, we'll send you a 6-digit code.
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your authorized email address"
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me on this device
              </label>
            </div>
            
            <div className="text-xs text-gray-500">
              {rememberMe 
                ? "Your login is saved on this computer permanently until you sign out."
                : "Your login will only last for this browser session. Uncheck if using a public computer."
              }
            </div>

            {/* Submit Button */}
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Only authorized users can access this dashboard. 
              If you believe you should have access, please{' '}
              <a 
                href="mailto:tech@rhwb.org?subject=RHWB Connect Access Request"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                send an email to RHWB Tech Team
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthMagicLink; 