import React, { useState } from 'react';
import { Mail, TrendingUp, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AuthResetPassword = ({ onSwitchToLogin }) => {
  const { resetPassword, isLoading, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email) {
      setFormError('Please enter your email address');
      return;
    }

    const result = await resetPassword(email);
    if (result.success) {
      setIsSubmitted(true);
    } else {
      setFormError(result.error);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200 max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 rounded-xl mb-6 inline-block">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600">We've sent a password reset link to your email</p>
          </div>

          {/* Success Message */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">
              If an account with the email <strong>{email}</strong> exists, you will receive a password reset link shortly.
            </p>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm">
              <strong>What to do next:</strong>
            </p>
            <ul className="text-blue-700 text-sm mt-2 space-y-1">
              <li>• Check your email inbox</li>
              <li>• Click the password reset link</li>
              <li>• Create a new password</li>
              <li>• Sign in with your new password</li>
            </ul>
          </div>

          {/* Back to Login */}
          <button
            onClick={onSwitchToLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl mb-6 inline-block">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your email to receive a reset link</p>
        </div>

        {/* Error Messages */}
        {(authError || formError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{authError || formError}</p>
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending reset link...
              </div>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <button
            onClick={onSwitchToLogin}
            className="flex items-center justify-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthResetPassword; 