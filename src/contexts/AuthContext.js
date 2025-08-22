import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  if (!email) {
    return { isValid: false, error: 'Email address is required' };
  }

  // First, try to get role from session storage
  const sessionRole = getSessionUserRole(email);
  if (sessionRole) {
    return { isValid: true, role: sessionRole.role, fromSession: true };
  }

  try {
    // Check Supabase configuration first
          if (!process.env.REACT_APP_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL.includes('<YOUR_SUPABASE_URL>')) {
        const fallbackRole = determineUserRole(email);
        // Save the fallback role to session
        saveSessionUserRole(email, fallbackRole);
        return { isValid: true, role: fallbackRole };
      }
    
          if (!process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY.includes('<YOUR_SUPABASE_ANON_KEY>')) {
        const fallbackRole = determineUserRole(email);
        // Save the fallback role to session
        saveSessionUserRole(email, fallbackRole);
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
          // Save the fallback role to session
          saveSessionUserRole(email, fallbackRole);
          return { isValid: true, role: fallbackRole };
        }
      } else {
        connectionTestPassed = true;
      }
    } catch (testErr) {
      // Fallback to email-based role determination
      const fallbackRole = determineUserRole(email);
      // Save the fallback role to session
      saveSessionUserRole(email, fallbackRole);
      return { isValid: true, role: fallbackRole };
    }
    
    // Only proceed with database query if connection test passed
    if (!connectionTestPassed) {
      const fallbackRole = determineUserRole(email);
      // Save the fallback role to session
      saveSessionUserRole(email, fallbackRole);
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
        const fallbackRole = determineUserRole(email);
        // Save the fallback role to session
        saveSessionUserRole(email, fallbackRole);
        return { isValid: true, role: fallbackRole };
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

    // Save the role to session and return the result
    saveSessionUserRole(email, data.role);
    return { isValid: true, role: data.role, fullName: data.full_name };

  } catch (error) {
    // Log the error for debugging but don't expose it to the user
    console.warn('Authentication validation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        const fallbackRole = determineUserRole(email);
        saveSessionUserRole(email, fallbackRole);
        return { isValid: true, role: fallbackRole };
      }
    }
    
    // If we can't validate due to database issues, fall back to email-based role
    const fallbackRole = determineUserRole(email);
    saveSessionUserRole(email, fallbackRole);
    return { isValid: true, role: fallbackRole };
  }
};

// Session storage keys for role caching
const SESSION_KEYS = {
  USER_ROLE: 'rhwb-session-user-role',
  USER_EMAIL: 'rhwb-session-user-email',
  SESSION_START: 'rhwb-session-start'
};

// Override storage keys for URL parameter overrides
const OVERRIDE_KEYS = {
  USER_ROLE: 'rhwb-override-user-role',
  USER_EMAIL: 'rhwb-override-user-email',
  OVERRIDE_START: 'rhwb-override-start'
};

// Helper function to get session user role
const getSessionUserRole = (email) => {
  try {
    const sessionEmail = sessionStorage.getItem(SESSION_KEYS.USER_EMAIL);
    const sessionRole = sessionStorage.getItem(SESSION_KEYS.USER_ROLE);
    const sessionStart = sessionStorage.getItem(SESSION_KEYS.SESSION_START);

    // Check if session role is valid for this email
    if (sessionEmail === email && sessionRole && sessionStart) {
      return { role: sessionRole, fromSession: true };
    }
    
    return null; // No valid session role
  } catch (error) {
    console.error('Error reading session role:', error);
    return null;
  }
};

// Helper function to save user role to session storage
const saveSessionUserRole = (email, role) => {
  try {
    sessionStorage.setItem(SESSION_KEYS.USER_EMAIL, email);
    sessionStorage.setItem(SESSION_KEYS.USER_ROLE, role);
    sessionStorage.setItem(SESSION_KEYS.SESSION_START, Date.now().toString());
  } catch (error) {
    console.error('Error saving session role:', error);
  }
};

// Helper function to clear session user role
const clearSessionUserRole = () => {
  try {
    sessionStorage.removeItem(SESSION_KEYS.USER_EMAIL);
    sessionStorage.removeItem(SESSION_KEYS.USER_ROLE);
    sessionStorage.removeItem(SESSION_KEYS.SESSION_START);
  } catch (error) {
    console.error('Error clearing session user role:', error);
  }
};

// Helper function to get override user role
const getOverrideUserRole = (email) => {
  try {
    const overrideEmail = sessionStorage.getItem(OVERRIDE_KEYS.USER_EMAIL);
    const overrideRole = sessionStorage.getItem(OVERRIDE_KEYS.USER_ROLE);
    const overrideStart = sessionStorage.getItem(OVERRIDE_KEYS.OVERRIDE_START);

    // Check if override role is valid for this email
    if (overrideEmail === email && overrideRole && overrideStart) {
      return { role: overrideRole, fromOverride: true };
    }
    
    return null; // No valid override role
  } catch (error) {
    console.error('Error reading override role:', error);
    return null;
  }
};

// Helper function to save override user role
const saveOverrideUserRole = (email, role) => {
  try {
    sessionStorage.setItem(OVERRIDE_KEYS.USER_EMAIL, email);
    sessionStorage.setItem(OVERRIDE_KEYS.USER_ROLE, role);
    sessionStorage.setItem(OVERRIDE_KEYS.OVERRIDE_START, Date.now().toString());
  } catch (error) {
    console.error('Error saving override role:', error);
  }
};

// Helper function to clear override user role
const clearOverrideUserRole = () => {
  try {
    sessionStorage.removeItem(OVERRIDE_KEYS.USER_EMAIL);
    sessionStorage.removeItem(OVERRIDE_KEYS.USER_ROLE);
    sessionStorage.removeItem(OVERRIDE_KEYS.OVERRIDE_START);
  } catch (error) {
    console.error('Error clearing override user role:', error);
  }
};

// Helper function to determine user role from email (fallback)
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

// Helper function to compare user objects
const isUserChanged = (currentUser, newUser) => {
  if (!currentUser && !newUser) return false; // Both null
  if (!currentUser || !newUser) return true; // One is null, other isn't
  
  // Compare key properties
  return (
    currentUser.email !== newUser.email ||
    currentUser.role !== newUser.role ||
    currentUser.name !== newUser.name ||
    currentUser.id !== newUser.id
  );
};

// Helper function to compare session objects
const isSessionChanged = (currentSession, newSession) => {
  if (!currentSession && !newSession) return false; // Both null
  if (!currentSession || !newSession) return true; // One is null, other isn't
  
  // For empty mock sessions, consider them unchanged if both are empty objects
  if (Object.keys(currentSession).length === 0 && Object.keys(newSession).length === 0) {
    return false;
  }
  
  // Compare key session properties
  return (
    currentSession.access_token !== newSession.access_token ||
    currentSession.user?.id !== newSession.user?.id ||
    currentSession.user?.email !== newSession.user?.email
  );
};

// Helper function to validate and handle URL override
const validateUrlOverride = async (overrideEmail, hasActiveSession = false) => {
  // Require active session for URL overrides
  if (!hasActiveSession) {
    return { 
      isValid: false, 
      error: 'Authentication required. Please sign in to use URL override functionality.' 
    };
  }
  
  // First, check if we have a valid override role already stored
  const overrideRole = getOverrideUserRole(overrideEmail);
  if (overrideRole) {
    return { isValid: true, role: overrideRole.role, fromOverride: true };
  }
  
  // If no stored override role, validate against database
  const validation = await validateEmailAccess(overrideEmail);
  
  if (validation.isValid && validation.role) {
    // Save the valid override role for future use
    saveOverrideUserRole(overrideEmail, validation.role);
    return validation;
  } else {
    // Invalid override email - return error
    return { 
      isValid: false, 
      error: `Email address "${overrideEmail}" is not authorized to access this application. Please contact your administrator if you believe this is an error.` 
    };
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  // Helper to update session only if changed
  const updateSession = useCallback((newSession) => {
    if (isSessionChanged(session, newSession)) {
      setSession(newSession);
    }
  }, [session]);

  // Initialize auth state
  useEffect(() => {
    // Add cleanup function for when browser is closed/refreshed
    const handleBeforeUnload = () => {
      clearOverrideUserRole();
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
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
            // First, check if we have a valid session role
            const sessionRole = getSessionUserRole(session.user.email);
            let validation;
            
            if (sessionRole) {
              validation = { isValid: true, role: sessionRole.role, fromSession: true };
            } else {
              // Validate the authenticated user against roles table
              validation = await validateEmailAccess(session.user.email);
            }
            
            if (validation.isValid && validation.role) {
              const authUser = {
                email: session.user.email,
                role: validation.role,
                name: validation.fullName || session.user.user_metadata?.name || session.user.email,
                id: session.user.id
              };
              
              // Only update user state if there's an actual change
              if (isUserChanged(user, authUser)) {
                setUser(authUser);
              }
            } else {
              // User is authenticated but not authorized - log them out
              await supabase.auth.signOut();
              setUser(null);
            }
          } else {
            // No active session - URL overrides are not allowed without authentication
            const urlParams = new URLSearchParams(window.location.search);
            const overrideEmail = urlParams.get('email');
            
            if (overrideEmail) {
              setAuthError('Authentication required. Please sign in to use URL override functionality.');
            }
            
            // Clear any existing override data since there's no session
            clearOverrideUserRole();
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
        // Only process auth state changes for actual auth events, not visibility changes
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          updateSession(session);
          
          // Clear override data when user signs out
          if (event === 'SIGNED_OUT') {
            clearOverrideUserRole();
          }
        }
        
        // Check for URL parameter override - only process if there's an active session
        const urlParams = new URLSearchParams(window.location.search);
        const overrideEmail = urlParams.get('email');
        
        if (overrideEmail && session?.user) {
          // Only allow URL overrides when there's an active authenticated session
          const validation = await validateUrlOverride(overrideEmail, true);
          
          if (validation.isValid && validation.role) {
            // Create a mock user for the override email
            const authUser = {
              email: overrideEmail,
              role: validation.role,
              name: validation.fullName || overrideEmail,
              id: 'override-user'
            };
            
            // Only update user state if there's an actual change
            if (isUserChanged(user, authUser)) {
              setUser(authUser);
            }
            setIsLoading(false);
            setAuthError(null);
            return; // Exit early, don't process session
          } else {
            setAuthError(validation.error);
            setIsLoading(false);
            return; // Exit early, don't process session
          }
        } else if (overrideEmail && !session?.user) {
          // URL override present but no active session - require authentication
          setAuthError('Authentication required. Please sign in to use URL override functionality.');
          setIsLoading(false);
          return; // Exit early, don't process session
        }
        
        if (session?.user) {
          // First, check if we have a valid session role
          const sessionRole = getSessionUserRole(session.user.email);
          let validation;
          
          if (sessionRole) {
            validation = { isValid: true, role: sessionRole.role, fromSession: true };
          } else {
            // Validate the authenticated user against roles table
            validation = await validateEmailAccess(session.user.email);
          }
          
          if (validation.isValid && validation.role) {
            const authUser = {
              email: session.user.email,
              role: validation.role,
              name: validation.fullName || session.user.user_metadata?.name || session.user.email,
              id: session.user.id
            };
            
            // Only update user state if there's an actual change
            if (isUserChanged(user, authUser)) {
              setUser(authUser);
              // Clear email sent state when user is successfully authenticated
              setIsEmailSent(false);
            }
          } else {
            // User is authenticated but not authorized - log them out
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          // No session and no URL override - clear any existing override data
          if (!overrideEmail) {
            clearOverrideUserRole();
          }
          
          // Only update user state if there's an actual change
          if (user !== null) {
            setUser(null);
          }
        }
        
        setIsLoading(false);
        setAuthError(null);
      }
    );

    return () => {
      subscription.unsubscribe();
      // Remove event listener on cleanup
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updateSession, user]);

  // OTP login
  const login = async (email, rememberMe = false) => {
    try {
      setAuthError(null);
      setIsLoading(true);
      
      // First, check if we have a valid session role for this email
      const sessionRole = getSessionUserRole(email);
      let validation;
      
      if (sessionRole) {
        validation = { isValid: true, role: sessionRole.role, fromSession: true };
        
        // If user has a valid session role, they don't need OTP - authenticate immediately
        const authUser = {
          email: email.toLowerCase(),
          role: sessionRole.role,
          name: email.toLowerCase(),
          id: 'session-user'
        };
        setUser(authUser);
        setIsEmailSent(false);
        setIsLoading(false);
        return { success: true, fromSession: true };
      } else {
        // Validate the email against roles table
        validation = await validateEmailAccess(email);
      }
      
      if (!validation.isValid) {
        setIsLoading(false);
        return { success: false, error: validation.error || 'Email address not authorized' };
      }

      // If email is valid and no session exists, send OTP
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

      setUser(null);
      setSession(null);
      
      // Clear app-specific local storage on logout
      localStorage.removeItem(`${APP_CONFIG.storagePrefix}_remember_me`);
      localStorage.removeItem(`${APP_CONFIG.storagePrefix}_user_email`);
      
      // Clear session user role on logout
      clearSessionUserRole();
      // Clear override user role on logout
      clearOverrideUserRole();
      
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

  // Clear session user role (for debugging or manual cache invalidation)
  const clearUserRoleCache = () => {
    clearSessionUserRole();
  };

  // Clear override user role (for debugging or manual cache invalidation)
  const clearOverrideRoleCache = () => {
    clearOverrideUserRole();
  };

  // Get session statistics for debugging
  const getSessionStats = () => {
    try {
      const sessionEmail = sessionStorage.getItem(SESSION_KEYS.USER_EMAIL);
      const sessionRole = sessionStorage.getItem(SESSION_KEYS.USER_ROLE);
      const sessionStart = sessionStorage.getItem(SESSION_KEYS.SESSION_START);
      
      if (sessionStart) {
        const sessionAge = Date.now() - parseInt(sessionStart);
        return {
          hasSession: !!sessionEmail && !!sessionRole,
          email: sessionEmail,
          role: sessionRole,
          sessionAge: Math.round(sessionAge / 1000), // in seconds
          sessionAgeFormatted: `${Math.round(sessionAge / 60000)}m ${Math.round((sessionAge % 60000) / 1000)}s`
        };
      }
      
      return { hasSession: false };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return { hasSession: false, error: error.message };
    }
  };

  // Get override statistics for debugging
  const getOverrideStats = () => {
    try {
      const overrideEmail = sessionStorage.getItem(OVERRIDE_KEYS.USER_EMAIL);
      const overrideRole = sessionStorage.getItem(OVERRIDE_KEYS.USER_ROLE);
      const overrideStart = sessionStorage.getItem(OVERRIDE_KEYS.OVERRIDE_START);
      
      if (overrideStart) {
        const overrideAge = Date.now() - parseInt(overrideStart);
        return {
          hasOverride: !!overrideEmail && !!overrideRole,
          email: overrideEmail,
          role: overrideRole,
          overrideAge: Math.round(overrideAge / 1000), // in seconds
          overrideAgeFormatted: `${Math.round(overrideAge / 60000)}m ${Math.round((overrideAge % 60000) / 1000)}s`
        };
      }
      
      return { hasOverride: false };
    } catch (error) {
      console.error('Error getting override stats:', error);
      return { hasOverride: false, error: error.message };
    }
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
    clearUserRoleCache,
    clearOverrideRoleCache,
    getSessionStats,
    getOverrideStats,
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