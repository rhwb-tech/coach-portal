import { supabase } from './supabaseClient';

/**
 * Navigation Logger Service
 * Logs user navigation events to pulse_interactions table
 */
class NavigationLogger {
  
  /**
   * Log navigation event to pulse_interactions table
   * @param {string} coachEmail - User's email
   * @param {string} menuOption - Menu option clicked (e.g., 'Know Your Runner', 'Coach Insights')
   */
  async logNavigation(coachEmail, menuOption) {
    try {
      const { error } = await supabase
        .from('pulse_interactions')
        .insert({
          created_at: new Date().toISOString(),
          email_id: coachEmail,
          event_name: 'access',
          value_text: 'RHWB Connect',
          value_label: menuOption
        });

      if (error) {
        console.warn('Failed to log navigation event:', error);
      }
    } catch (error) {
      console.warn('Failed to log navigation event:', error);
    }
  }

  /**
   * Get menu display name from view key
   * @param {string} viewKey - Internal view key (e.g., 'know-your-runner')
   * @returns {string} Display name for logging
   */
  getMenuDisplayName(viewKey) {
    const menuMap = {
      'know-your-runner': 'Know Your Runner',
      'rhwb-connect': 'OneRHWB',
      'dashboard': 'Runner Metrics',
      'small-council': 'OneRHWB', 
      'coach-insights': 'Coach Insights',
      'user-guide': 'User Guide'
    };
    
    return menuMap[viewKey] || viewKey;
  }
}

export const navigationLogger = new NavigationLogger();