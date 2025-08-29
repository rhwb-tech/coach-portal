import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import InsightsHeader from './components/InsightsHeader';
import ChartsGrid from './components/ChartsGrid';
import InsightsTable from './components/InsightsTable';
import { useInsightsData } from './hooks/useInsightsData';

const CoachInsights = () => {
  const { user } = useAuth();
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedMeso, setSelectedMeso] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [availableCoaches, setAvailableCoaches] = useState([]);
  const [availableMesos, setAvailableMesos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get coach email from authenticated user or URL override
  const urlParams = new URLSearchParams(window.location.search);
  const overrideEmail = urlParams.get('email');
  const defaultCoachEmail = overrideEmail || user?.email;
  
  // Determine final coach email (admin can override, regular users use their own)
  // More robust admin role check
const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'administrator';
  const coachEmail = isAdmin && selectedCoach ? selectedCoach : defaultCoachEmail;
  

  // Get season number from seasons data
  const currentSeasonData = seasons.find(s => s.id === selectedSeason);
  const seasonNumber = currentSeasonData?.season;
  
  // Custom hook for data management
  const { 
    chartData, 
    tableData, 
    loadingData, 
    errorData,
    refreshData 
  } = useInsightsData(coachEmail, selectedSeason, seasonNumber, selectedCoach, availableCoaches, selectedMeso);

  // Load available seasons
  useEffect(() => {
    const loadSeasons = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('rhwb_seasons')
          .select('id, season, current')
          .order('season', { ascending: false });

        if (error) {
          console.error('Error loading seasons:', error);
          setError('Failed to load seasons');
          return;
        }

        setSeasons(data || []);
        
        // Set current season as default
        const currentSeason = data?.find(s => s.current);
        if (currentSeason && !selectedSeason) {
          setSelectedSeason(currentSeason.id);
        }

      } catch (err) {
        console.error('Error loading seasons:', err);
        setError('Failed to load seasons');
      } finally {
        setLoading(false);
      }
    };

    loadSeasons();
  }, [selectedSeason]);

  // Load available coaches (admin only)
  useEffect(() => {
    if (!isAdmin) {
      setAvailableCoaches([]);
      setSelectedCoach(null);
      return;
    }

    const loadCoaches = async () => {
      try {
        // Get active coaches from rhwb_coaches table
        const { data, error } = await supabase
          .from('rhwb_coaches')
          .select('coach, email_id')
          .eq('status', 'Active')
          .order('coach');
        
        if (error) {
          console.error('Error loading coaches:', error);
          setAvailableCoaches([]);
          return;
        }
        
        if (!data || data.length === 0) {
          setAvailableCoaches([]);
          return;
        }
        
        // Transform data to match expected format
        const coachesData = data.map(coach => ({
          season: selectedSeason ? `Season ${seasons.find(s => s.id === selectedSeason)?.season || ''}` : '',
          coach: coach.coach,
          coach_email_id: coach.email_id
        }));
        
        setAvailableCoaches(coachesData);
        
        const currentUserInList = coachesData.find(c => c.coach_email_id === defaultCoachEmail);
        if (currentUserInList) {
          setSelectedCoach(currentUserInList.coach_email_id);
        } else if (coachesData.length > 0) {
          setSelectedCoach(coachesData[0].coach_email_id);
        }

      } catch (error) {
        console.error('Error in loadCoaches:', error);
        setAvailableCoaches([]);
      }
    };

    loadCoaches();
  }, [isAdmin, selectedSeason, seasons]);

  // Load available mesocycles based on selected season
  useEffect(() => {
    if (!seasonNumber || !coachEmail) {
      setAvailableMesos([]);
      setSelectedMeso(null);
      return;
    }

    const loadMesos = async () => {
      try {
        
        // Use the table name from other charts: rhwb_coach_input
        const { data, error } = await supabase
          .from('rhwb_coach_input')
          .select('meso')
          .eq('season', seasonNumber)
          .eq('coach_email', coachEmail) // Filter by coach email like other queries
          .not('meso', 'is', null)
          .order('meso');


        if (error) {
          console.error('Error loading mesos:', error);
          setAvailableMesos([]);
          return;
        }

        // Get distinct meso values
        const distinctMesos = [...new Set(data?.map(item => item.meso) || [])];
        
        setAvailableMesos(distinctMesos);
        
        // Auto-select first meso if available
        if (distinctMesos.length > 0 && !selectedMeso) {
          setSelectedMeso(distinctMesos[0]);
        }

      } catch (error) {
        console.error('Error in loadMesos:', error);
        setAvailableMesos([]);
      }
    };

    loadMesos();
  }, [seasonNumber, coachEmail]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-lg text-gray-600">Loading Coach Insights...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="flex items-center space-x-2 text-red-700 mb-2">
              <BarChart3 className="h-5 w-5" />
              <h3 className="font-medium">Error Loading Insights</h3>
            </div>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                refreshData();
              }}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with season selector */}
      <InsightsHeader
        seasons={seasons}
        selectedSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
        coachEmail={coachEmail}
        availableCoaches={availableCoaches}
        selectedCoach={selectedCoach}
        onCoachChange={setSelectedCoach}
        availableMesos={availableMesos}
        selectedMeso={selectedMeso}
        onMesoChange={setSelectedMeso}
        isAdmin={isAdmin}
        onRefresh={refreshData}
      />

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Charts Grid */}
        <ChartsGrid
          chartData={chartData}
          loading={loadingData}
          error={errorData}
        />

        {/* Detailed Table */}
        <InsightsTable
          tableData={tableData}
          loading={loadingData}
          error={errorData}
        />
      </div>
    </div>
  );
};

export default CoachInsights;