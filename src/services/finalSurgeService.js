import { supabase } from './supabaseClient';

const FINALSURGE_URL = 'https://log.finalsurge.com/CoachAthletes.cshtml';

export const finalSurgeService = {
  async getCurrentTeam(runnerEmail) {
    try {
      const { data, error } = await supabase
        .from('v_fs_teams')
        .select('fs_team')
        .eq('email_id', runnerEmail)
        .single();

      if (error) {
        console.error('Error fetching current team:', error);
        return null;
      }

      return data?.fs_team || null;
    } catch (error) {
      console.error('Error fetching current team:', error);
      return null;
    }
  },

  async getRunnerEditUrl(runnerEmail) {
    try {
      const { data, error } = await supabase
        .from('v_fs_teams')
        .select('editurl')
        .like('email_id', runnerEmail)
        .single();

      if (!error && data && data.editurl) {
        return {
          success: true,
          editUrl: data.editurl,
          method: 'database'
        };
      }

      return {
        success: true,
        editUrl: FINALSURGE_URL,
        method: 'general'
      };

    } catch (error) {
      return {
        success: true,
        editUrl: FINALSURGE_URL,
        method: 'fallback'
      };
    }
  },

  async navigateToRunner(runnerEmail, runnerName) {
    try {
      const urlResult = await this.getRunnerEditUrl(runnerEmail);
      
      window.open(urlResult.editUrl, '_blank');
      
      return {
        success: true,
        automated: false,
        message: `Opened edit page for ${runnerName}`,
        method: urlResult.method
      };
      
    } catch (error) {
      return this.manualProcess(runnerEmail, runnerName);
    }
  },

  async manualProcess(runnerEmail, runnerName) {
    const newWindow = window.open(FINALSURGE_URL, '_blank');
    
    if (!newWindow) {
      throw new Error('Pop-up blocked. Please allow pop-ups for this site and try again.');
    }
    
    return {
      success: true,
      automated: false,
      message: `Opened FinalSurge for ${runnerName}`
    };
  },

  async transferRunner(runnerEmail, runnerName, transferRequestId) {
    try {
      const navResult = await this.navigateToRunner(runnerEmail, runnerName);
      
      return {
        success: true,
        message: navResult.message
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  async markTransferCompleted(transferRequestId) {
    try {
      const { error } = await supabase
        .from('rhwb_action_requests')
        .update({ 
          status: 'closed',
          closed_date: new Date().toISOString()
        })
        .eq('id', transferRequestId);

      if (error) {
        console.error('Error marking transfer as completed:', error);
        throw new Error('Failed to mark internal transfer as completed');
      }
    } catch (error) {
      console.error('Error updating transfer status:', error);
      throw error;
    }
  }
};