import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

// App-specific configuration
const APP_CONFIG = {
  name: 'RHWB Coach Portal',
  storagePrefix: 'rhwb-coach-portal',
  redirectUrl: '/auth/callback',
  emailSubject: 'Sign in to RHWB Coach Portal'
};

// Helper function to validate email against v_rhwb_roles view
const validateEmailAccess = async (email) => {
  try {
    // Check Supabase configuration first
    if (!process.env.REACT_APP_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL.includes('<YOUR_SUPABASE_URL>')) {
      const fallbackRole = determineUserRole(email);
      return { isValid: true, role: fallbackRole };
    }
    
    if (!process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY.includes('<YOUR_SUPABASE_ANON_KEY>')) {
      const fallbackRole = determineUserRole(email);
      return { isValid: true, role: fallbackRole };
    }
    
    // First, test the connection with a simple query and aggressive timeout
    let connectionTestPassed = false;
    
    try {
      // Add a very short timeout for the connection test
      const connectionTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timeout')), 3000); // 3 second timeout
      });
      
      // Test connection using the v_rhwb_roles view
      const connectionTest = supabase
        .from('v_rhwb_roles')
        .select('count')
        .limit(1);
      
      const { error: testError } = await Promise.race([connectionTest, connectionTimeout]);
      
      if (testError) {
        if (testError.code === 'PGRST116') {
          // Fallback to email-based role determination
          const fallbackRole = determineUserRole(email);
          return { isValid: true, role: fallbackRole };
        }
      } else {
        connectionTestPassed = true;
      }
    } catch (testErr) {
      // Fallback to email-based role determination
      const fallbackRole = determineUserRole(email);
      return { isValid: true, role: fallbackRole };
    }
    
    // Only proceed with database query if connection test passed
    if (!connectionTestPassed) {
      const fallbackRole = determineUserRole(email);
      return { isValid: true, role: fallbackRole };
    }
    
    // Add timeout protection for the main query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000); // 5 second timeout
    });
    
    // Query the v_rhwb_roles view (similar to v_pulse_roles in Pulse app)
    const queryPromise = supabase
      .from('v_rhwb_roles')
      .select('email_id, role, full_name')
      .eq('email_id', email.toLowerCase())
      .maybeSingle();

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);


    if (error) {
      // Check for specific error types
      if (error.code === 'PGRST116') {
        // This means no rows found - user doesn't exist in either table
        return { 
          isValid: false, 
          error: 'This email address is not authorized to access RHWB Connect. Please use the same email address that you registered with RHWB or contact support for access.' 
        };
      }
      
      if (error.code === '42P01') {
        // Table or view doesn't exist
        return { 
          isValid: false, 
          error: 'Database configuration error. Please contact support.' 
        };
      }
      
      if (error.message?.includes('timeout')) {
        return { isValid: false, error: 'Database connection timeout. Please try again.' };
      }
      
      // Log other errors for debugging but don't expose to user
      console.warn('Database query error:', error);
      return { 
        isValid: false, 
        error: 'This email address is not authorized to access RHWB Connect. Please use the same email address that you registered with RHWB or contact support for access.' 
      };
    }

    if (!data) {
      return { 
        isValid: false, 
        error: 'This email address is not authorized to access RHWB Connect. Please use the same email address that you registered with RHWB or contact support for access.' 
      };
    }

    // Return the role and full name from the view
    return { isValid: true, role: data.role, fullName: data.full_name };

  } catch (error) {
    // Log the error for debugging but don't expose it to the user
    console.warn('Authentication validation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        const fallbackRole = determineUserRole(email);
        return { isValid: true, role: fallbackRole };
      }
    }
    
    // If we can't validate due to database issues, fall back to email-based role
    const fallbackRole = determineUserRole(email);
    return { isValid: true, role: fallbackRole };
  }
};

// Helper function to determine user role from email
const determineUserRole = (email) => {
  // You can customize this logic based on your needs
  // For now, we'll use a simple email-based approach
  if (email.includes('admin') || email.includes('manager')) {
    return 'admin';
  } else if (email.includes('coach') || email.includes('trainer')) {
    return 'coach';
  } else {
    return 'coach'; // Default to coach for RHWB
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setAuthError(error.message);
        } else {
          setSession(session);
          
          if (session?.user) {
            // Validate the authenticated user against roles table
            const validation = await validateEmailAccess(session.user.email);
            if (validation.isValid && validation.role) {
              const authUser = {
                email: session.user.email,
                role: validation.role,
                name: validation.fullName || session.user.user_metadata?.name || session.user.email,
                id: session.user.id
              };
              setUser(authUser);
            } else {
              // User is authenticated but not authorized - log them out
              await supabase.auth.signOut();
              setUser(null);
            }
          } else {
            // Check for email parameter override
            const urlParams = new URLSearchParams(window.location.search);
            const overrideEmail = urlParams.get('email');
            
            if (overrideEmail) {
              // Validate the override email
              const validation = await validateEmailAccess(overrideEmail);
              
              if (validation.isValid && validation.role) {
                // Create a mock user for the override email
                const authUser = {
                  email: overrideEmail,
                  role: validation.role,
                  name: validation.fullName || overrideEmail,
                  id: 'override-user'
                };
                setUser(authUser);
                setSession({}); // Mock session
              } else {
                setAuthError(validation.error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setAuthError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        // Check for URL parameter override first
        const urlParams = new URLSearchParams(window.location.search);
        const overrideEmail = urlParams.get('email');
        
        if (overrideEmail) {
          // Validate the override email
          const validation = await validateEmailAccess(overrideEmail);
          
          if (validation.isValid && validation.role) {
            // Create a mock user for the override email
            const authUser = {
              email: overrideEmail,
              role: validation.role,
              name: validation.fullName || overrideEmail,
              id: 'override-user'
            };
            setUser(authUser);
            setIsLoading(false);
            setAuthError(null);
            return; // Exit early, don't process session
          } else {
            setAuthError(validation.error);
            setIsLoading(false);
            return; // Exit early, don't process session
          }
        }
        
        if (session?.user) {
          // Validate the authenticated user against roles table
          const validation = await validateEmailAccess(session.user.email);
          if (validation.isValid && validation.role) {
            const authUser = {
              email: session.user.email,
              role: validation.role,
              name: validation.fullName || session.user.user_metadata?.name || session.user.email,
              id: session.user.id
            };
            setUser(authUser);
          } else {
            // User is authenticated but not authorized - log them out
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
        setAuthError(null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // OTP login
  const login = async (email, rememberMe = false) => {
    try {
      setAuthError(null);
      setIsLoading(true);
      
      // First, validate the email against roles table
      const validation = await validateEmailAccess(email);
      
      if (!validation.isValid) {
        setIsLoading(false);
        return { success: false, error: validation.error || 'Email address not authorized' };
      }

      // If email is valid, send OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          shouldCreateUser: true,
          data: {
            app: APP_CONFIG.name,
            app_domain: window.location.hostname,
            auth_method: 'otp'
          }
        }
      });

      if (error) {
        // Log the full error for debugging
        console.error('Supabase OTP error:', error);
        
        // Handle specific Supabase configuration errors
        if (error.message.includes('signups not allowed')) {
          return { 
            success: false, 
            error: 'Email signup is disabled in Supabase. Please contact your administrator to enable email signup for authentication.' 
          };
        }
        return { success: false, error: error.message };
      }

      // Store remember me preference with app-specific keys
      if (rememberMe) {
        localStorage.setItem(`${APP_CONFIG.storagePrefix}_remember_me`, 'true');
        localStorage.setItem(`${APP_CONFIG.storagePrefix}_user_email`, email.toLowerCase());
      } else {
        localStorage.removeItem(`${APP_CONFIG.storagePrefix}_remember_me`);
        localStorage.removeItem(`${APP_CONFIG.storagePrefix}_user_email`);
      }

      setIsEmailSent(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      setAuthError(null);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      console.log('Sign out successful');
      setUser(null);
      setSession(null);
      
      // Clear app-specific local storage on logout
      localStorage.removeItem(`${APP_CONFIG.storagePrefix}_remember_me`);
      localStorage.removeItem(`${APP_CONFIG.storagePrefix}_user_email`);
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Clear email sent state
  const clearEmailSent = () => {
    setIsEmailSent(false);
  };

  // Get user's coach email (for backward compatibility)
  const getCoachEmail = () => {
    return user?.email || null;
  };

  const value = {
    user,
    session,
    isLoading,
    authError,
    login,
    logout,
    clearEmailSent,
    getCoachEmail,
    isAuthenticated: !!user,
    isEmailSent,
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