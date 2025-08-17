import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'rhwb-coach-portal-auth', // App-specific storage key
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(`rhwb-coach-portal-${key}`);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(`rhwb-coach-portal-${key}`, value);
        } catch {
          // Handle storage errors
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(`rhwb-coach-portal-${key}`);
        } catch {
          // Handle storage errors
        }
      }
    }
  }
}); 