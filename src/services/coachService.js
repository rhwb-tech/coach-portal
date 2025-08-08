import { supabase } from './supabaseClient';

// Helper function to get current season from database
const getCurrentSeason = async () => {
  try {
    const { data, error } = await supabase
      .from('rhwb_seasons')
      .select('id')
      .eq('current', true)
      .single();

    if (error) {
      console.error('Error fetching current season:', error);
      return 13; // fallback to season 13 since that's what exists in the data
    }

    return data?.id || 13;
  } catch (error) {
    console.error('Error in getCurrentSeason:', error);
    return 13; // fallback to season 13 since that's what exists in the data
  }
};

// Database service with Supabase
export const fetchCoachData = async (coachEmail, season = null, selectedDistance = 'All', selectedMeso = '') => {
  try {
    // Get current season if none provided
    const currentSeason = season || await getCurrentSeason();
    
    // Start building the query
    let query = supabase
      .from('rhwb_coach_input')
      .select(`
        meso,
        email_id,
        runner_name,
        coach,
        coach_email,
        season_phase,
        race_distance,
        planned_strength_trains,
        completed_strength_trains,
        planned_distance,
        completed_distance,
        st_score,
        mileage_score,
        meso_score,
        meso_score_override,
        meso_qual_score,
        season,
        planned_cross_trains,
        completed_cross_trains,
        planned_walks,
        completed_walks,
        planned_walk_distance,
        completed_walk_distance,
        planned_long_runs,
        completed_long_runs,
        planned_lr_distance,
        completed_lr_distance
      `)
      .eq('coach_email', coachEmail)
      .eq('season', `Season ${currentSeason}`);

    // Apply distance filter if not 'All'
    if (selectedDistance && selectedDistance !== 'All') {
      query = query.eq('race_distance', selectedDistance);
    }

    // Apply mesocycle filter if selected
    if (selectedMeso) {
      query = query.eq('meso', selectedMeso);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error('Failed to fetch coach data from database');
    }

    return data || [];
    
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error('Failed to fetch coach data from database');
  }
};

// Update athlete data in Supabase
export const updateAthleteData = async (emailId, updateData, selectedMeso) => {
  try {
    const { data, error } = await supabase
      .from('rhwb_coach_input')
      .update({
        meso_score_override: updateData.overrideScore || null,
        meso_qual_score: updateData.qualitativeScore || ''
      })
      .eq('email_id', emailId)
      .eq('meso', selectedMeso)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      throw new Error('Failed to update athlete data');
    }

    console.log(`Updated athlete data for ${emailId} in mesocycle ${selectedMeso}`);
    return data;
    
  } catch (error) {
    console.error('Update query error:', error);
    throw new Error('Failed to update athlete data');
  }
};

// Helper function to calculate completion rate
export const calculateCompletionRate = (planned, completed) => {
  if (planned === 0) return completed > 0 ? 100 : 0;
  return Math.round((completed / planned) * 100);
};

// Helper function to get avatar initials
export const getAvatarInitials = (name) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}; 