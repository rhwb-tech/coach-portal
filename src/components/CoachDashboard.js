import React, { useState, useEffect } from 'react';
import { Search, Info, Save, TrendingUp, ChevronDown, Menu, X, MessageSquare, BookOpen, Users, BarChart3, Shield } from 'lucide-react';
import { fetchCoachData, updateAthleteData, calculateCompletionRate, getAvatarInitials } from '../services/coachService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import RHWBConnect from './RHWBConnect';
import KnowYourRunner from './KnowYourRunner';
import SmallCouncil from './SmallCouncil';
import UserGuide from './UserGuide';

const CoachDashboard = () => {
  const { user, isLoading, logout } = useAuth();
  
  // Get coach email from authenticated user or URL override
  const urlParams = new URLSearchParams(window.location.search);
  const overrideEmail = urlParams.get('email');
  const coachEmail = overrideEmail || user?.email;
  const season = parseInt(urlParams.get('season')) || 13;
  


  const [selectedDistance, setSelectedDistance] = useState('All');
  const [selectedMeso, setSelectedMeso] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [editingCards, setEditingCards] = useState({});
  const [cardData, setCardData] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coachName, setCoachName] = useState(null);
  
  // Cohort data state for Know Your Runner
  const [cohortData, setCohortData] = useState([]);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [cohortError, setCohortError] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [cohortFilterOptions, setCohortFilterOptions] = useState({
    distances: []
  });
  
  // Dropdown menu states
  const [distanceMenuOpen, setDistanceMenuOpen] = useState(false);
  const [mesoMenuOpen, setMesoMenuOpen] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  
  // Help menu states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackNote, setFeedbackNote] = useState('');
  
  // Navigation state
  const [currentView, setCurrentView] = useState('know-your-runner'); // 'dashboard', 'rhwb-connect', 'know-your-runner', or 'small-council'
  
  // Redirect to default view if user doesn't have access to current view
  useEffect(() => {
    if (currentView === 'small-council' && user?.role !== 'admin' && user?.role !== 'Admin') {
      setCurrentView('know-your-runner');
    }
  }, [currentView, user?.role]);

  // Get unique filter options from data
  // Store all data and filter options
  const [allAthletes, setAllAthletes] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    distances: [],
    mesocycles: []
  });

  // Load coach name on initial load (always needed for header display)
  useEffect(() => {
    const loadCoachName = async () => {
      if (!coachEmail) return;
      
      try {
        const { data: coachData, error: coachError } = await supabase
          .from('rhwb_coaches')
          .select('coach')
          .eq('email_id', coachEmail)
          .single();
        
        if (!coachError && coachData) {
          setCoachName(coachData.coach);
        }
      } catch (error) {
        console.error('Failed to fetch coach name:', error);
      }
    };

    loadCoachName();
  }, [coachEmail]);

  // Load cohort data when switching to Know Your Runner view
  useEffect(() => {
    const loadCohortData = async () => {
      if (currentView !== 'know-your-runner' || !coachEmail) {
        return;
      }
      
      try {
        setCohortLoading(true);
        setCohortError(null);
        
        // Query 1: Get current season from rhwb_seasons table
        const { data: seasonData, error: seasonError } = await supabase
          .from('rhwb_seasons')
          .select('season')
          .eq('current', true)
          .single();
        
        if (seasonError || !seasonData) {
          console.error('Failed to fetch current season:', seasonError);
          setCohortData([]);
          return;
        }
        
        const currentSeasonValue = seasonData.season;
        setCurrentSeason(currentSeasonValue);
        
        // Query 2: Get coach name from rhwb_coaches table
        const { data: coachData, error: coachError } = await supabase
          .from('rhwb_coaches')
          .select('coach')
          .eq('email_id', coachEmail)
          .single();
        
        if (coachError || !coachData) {
          console.error('Failed to fetch coach data:', coachError);
          setCohortData([]);
          return;
        }
        
        const coachNameValue = coachData.coach;
        
        // Query 3: Get the season info for the coach using current season
        const { data: runnerSeasonData, error: runnerSeasonError } = await supabase
          .from('runner_season_info')
          .select('email_id, race_distance, coach, season')
          .eq('season', currentSeasonValue)
          .eq('coach', coachNameValue);
        
        if (runnerSeasonError || !runnerSeasonData || runnerSeasonData.length === 0) {
          console.error('Failed to fetch runner season data:', runnerSeasonError);
          setCohortData([]);
          return;
        }
        
        // Get email IDs from season data
        const emailIds = runnerSeasonData.map(item => item.email_id);
        
        // Query 4: Fetch runner profiles for these email IDs
        const { data: profileData, error: profileError } = await supabase
          .from('runners_profile')
          .select('email_id, runner_name, gender, phone_no, dob, city, state, notes_present')
          .in('email_id', emailIds);
        
        // Combine the data
        const cohortResult = runnerSeasonData.map(seasonItem => {
          const profileItem = profileData?.find(profile => profile.email_id === seasonItem.email_id);
          return {
            ...seasonItem,
            runners_profile: profileItem
          };
        });
        
        if (!profileError) {
          // Transform the data to match the expected format
          const transformedCohort = cohortResult?.map(runner => {
            const age = runner.runners_profile?.dob ? new Date().getFullYear() - new Date(runner.runners_profile.dob).getFullYear() : null;
            const gender = runner.runners_profile?.gender;
            const genderAge = gender && age ? `${gender.substring(0, 1)}${age}` : age ? `${age}` : 'N/A';
            
            return {
              runner_name: runner.runners_profile?.runner_name,
              gender: runner.runners_profile?.gender,
              phone_no: runner.runners_profile?.phone_no,
              age: age,
              gender_age: genderAge,
              race_distance: runner.race_distance,
              location: [runner.runners_profile?.city, runner.runners_profile?.state].filter(Boolean).join(', '),
              email_id: runner.email_id,
              notes_present: runner.runners_profile?.notes_present || false
            };
          }) || [];
          
          setCohortData(transformedCohort);
          
          // Get unique race distances from cohort data
          const uniqueDistances = [...new Set(transformedCohort.map(r => r.race_distance).filter(Boolean))].sort();
          
          setCohortFilterOptions({
            distances: [
              { value: 'All', label: 'All Distances' },
              ...uniqueDistances.map(distance => ({ value: distance, label: distance }))
            ]
          });

          // Set the first race distance as default
          if (uniqueDistances.length > 0) {
            setSelectedDistance(uniqueDistances[0]);
          }
        }
        
      } catch (error) {
        console.error('Error loading cohort data:', error);
        setCohortError('Failed to load cohort data');
      } finally {
        setCohortLoading(false);
      }
    };

    loadCohortData();
  }, [currentView, coachEmail]);

  // Listen for notes updates to refresh cohort data
  useEffect(() => {
    const handleNotesUpdated = (event) => {
      // Refresh cohort data to update star colors
      if (currentView === 'know-your-runner') {
        // Trigger a reload of cohort data
        const loadCohortData = async () => {
          if (!coachEmail) return;
          
          try {
            setCohortLoading(true);
            setCohortError(null);
            
            // Query 1: Get current season from rhwb_seasons table
            const { data: seasonData, error: seasonError } = await supabase
              .from('rhwb_seasons')
              .select('season')
              .eq('current', true)
              .single();
            
            if (seasonError || !seasonData) {
              console.error('Failed to fetch current season:', seasonError);
              setCohortData([]);
              return;
            }
            
            const currentSeasonValue = seasonData.season;
            setCurrentSeason(currentSeasonValue);
            
            // Query 2: Get coach name from rhwb_coaches table
            const { data: coachData, error: coachError } = await supabase
              .from('rhwb_coaches')
              .select('coach')
              .eq('email_id', coachEmail)
              .single();
            
            if (coachError || !coachData) {
              setCohortData([]);
              return;
            }
            
            const coachNameValue = coachData.coach;
            
            // Query 3: Get the season info for the coach using current season
            const { data: runnerSeasonData, error: runnerSeasonError } = await supabase
              .from('runner_season_info')
              .select('email_id, race_distance, coach, season')
              .eq('season', currentSeasonValue)
              .eq('coach', coachNameValue);
            
            if (runnerSeasonError || !runnerSeasonData || runnerSeasonData.length === 0) {
              setCohortData([]);
              return;
            }
            
            // Get email IDs from season data
            const emailIds = runnerSeasonData.map(item => item.email_id);
            
            // Query 4: Fetch runner profiles for these email IDs
            const { data: profileData, error: profileError } = await supabase
              .from('runners_profile')
              .select('email_id, runner_name, gender, phone_no, dob, city, state, notes_present')
              .in('email_id', emailIds);
            
            // Combine the data
            const cohortResult = runnerSeasonData.map(seasonItem => {
              const profileItem = profileData?.find(profile => profile.email_id === seasonItem.email_id);
              return {
                ...seasonItem,
                runners_profile: profileItem
              };
            });
            
            if (!profileError) {
              // Transform the data to match the expected format
              const transformedCohort = cohortResult?.map(runner => {
                const age = runner.runners_profile?.dob ? new Date().getFullYear() - new Date(runner.runners_profile.dob).getFullYear() : null;
                const gender = runner.runners_profile?.gender;
                const genderAge = gender && age ? `${gender.substring(0, 1)}${age}` : age ? `${age}` : 'N/A';
                
                return {
                  runner_name: runner.runners_profile?.runner_name,
                  gender: runner.runners_profile?.gender,
                  phone_no: runner.runners_profile?.phone_no,
                  age: age,
                  gender_age: genderAge,
                  race_distance: runner.race_distance,
                  location: [runner.runners_profile?.city, runner.runners_profile?.state].filter(Boolean).join(', '),
                  email_id: runner.email_id,
                  notes_present: runner.runners_profile?.notes_present || false
                };
              }) || [];
              
              setCohortData(transformedCohort);
            }
            
          } catch (error) {
            console.error('Error refreshing cohort data:', error);
          } finally {
            setCohortLoading(false);
          }
        };
        
        loadCohortData();
      }
    };

    window.addEventListener('notesUpdated', handleNotesUpdated);
    return () => window.removeEventListener('notesUpdated', handleNotesUpdated);
  }, [currentView, coachEmail]);
  // Load all data and filter options on initial load only (only for Runner Metrics)
  useEffect(() => {
    const loadAllData = async () => {
      // Only load data if we're on the dashboard view (Runner Metrics)
      if (currentView !== 'dashboard') {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const data = await fetchCoachData(coachEmail, season, 'All', '');
        setAllAthletes(data);
        
        const uniqueDistances = [...new Set(data.map(a => a.race_distance).filter(Boolean))].sort();
        const uniqueMeso = [...new Set(data.map(a => a.meso).filter(Boolean))].sort().reverse();
        
        setFilterOptions({
          distances: [
            { value: 'All', label: 'All Distances' },
            ...uniqueDistances.map(distance => ({ value: distance, label: distance }))
          ],
          mesocycles: uniqueMeso.map(meso => ({ value: meso, label: meso }))
        });

        // Set the latest meso as default
        if (uniqueMeso.length > 0) {
          setSelectedMeso(uniqueMeso[0]);
        }

        // Set the first race distance as default (skip "All Distances")
        if (uniqueDistances.length > 0) {
          setSelectedDistance(uniqueDistances[0]);
        }
        
        setError(null);
      } catch (error) {
        setError('Failed to load data');
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [coachEmail, season, currentView]);

  // Handle redirect to Wix website when no authentication
  useEffect(() => {
    if (!isLoading && !coachEmail) {
      const redirectTimer = setTimeout(() => {
        window.location.href = 'https://www.rhwb.org/coach-portal';
      }, 3000); // 3 second delay

      return () => clearTimeout(redirectTimer);
    }
  }, [isLoading, coachEmail]);

  const distanceOptions = filterOptions.distances;
  
  // Filter mesocycle options based on selected race distance
  const filteredMesoOptions = selectedDistance === 'All' 
    ? filterOptions.mesocycles 
    : filterOptions.mesocycles.filter(meso => 
        allAthletes.some(athlete => 
          athlete.race_distance === selectedDistance && athlete.meso === meso.value
        )
      );

  // Reset mesocycle selection if current selection is not valid for selected distance
  useEffect(() => {
    const isValidMeso = filteredMesoOptions.some(meso => meso.value === selectedMeso);
    if (!isValidMeso && filteredMesoOptions.length > 0) {
      setSelectedMeso(filteredMesoOptions[0].value);
    } else if (!isValidMeso && filteredMesoOptions.length === 0) {
      setSelectedMeso('');
    }
  }, [selectedDistance, filteredMesoOptions, selectedMeso]);

  // Filter data on the client side for instant results
  const filteredAthletes = allAthletes.filter(athlete => {
    const distanceMatch = selectedDistance === 'All' || athlete.race_distance === selectedDistance;
    const mesoMatch = selectedMeso === '' || athlete.meso === selectedMeso;
    return distanceMatch && mesoMatch;
  });

  // Map database columns to component fields
  const runners = filteredAthletes.map(athlete => ({
    id: athlete.email_id,
    name: athlete.runner_name || 'Unknown Athlete',
    avatar: getAvatarInitials(athlete.runner_name || 'Unknown Athlete'),
    strengthPlanned: athlete.planned_strength_trains || 0,
    strengthCompleted: athlete.completed_strength_trains || 0,
    mileagePlanned: athlete.planned_distance || 0,
    mileageCompleted: athlete.completed_distance || 0,
    metricScore: parseFloat(athlete.meso_score_override) || parseFloat(athlete.meso_score) || 0,
    overrideScore: parseFloat(athlete.meso_score_override) || null,
    qualitativeScore: athlete.meso_qual_score || '',
    completionRate: calculateCompletionRate(
      (athlete.planned_strength_trains || 0) + (athlete.planned_distance || 0),
      (athlete.completed_strength_trains || 0) + (athlete.completed_distance || 0)
    ),
    // Additional fields from database
    raceDistance: athlete.race_distance || 'Unknown',
    meso: athlete.meso || 'Unknown',
    season: athlete.season || 'Unknown',
    coach: athlete.coach || 'Unknown',
    coachEmail: athlete.coach_email || '',
    seasonPhase: athlete.season_phase || 'Unknown',
    stScore: parseFloat(athlete.st_score) || 0,
    mileageScore: parseFloat(athlete.mileage_score) || 0,
    mesoScore: parseFloat(athlete.meso_score) || 0,
    // Cross training and walking data
    plannedCrossTrains: athlete.planned_cross_trains || 0,
    completedCrossTrains: athlete.completed_cross_trains || 0,
    plannedWalks: athlete.planned_walks || 0,
    completedWalks: athlete.completed_walks || 0,
    plannedWalkDistance: athlete.planned_walk_distance || 0,
    completedWalkDistance: athlete.completed_walk_distance || 0,
    plannedLongRuns: athlete.planned_long_runs || 0,
    completedLongRuns: athlete.completed_long_runs || 0,
    plannedLrDistance: athlete.planned_lr_distance || 0,
    completedLrDistance: athlete.completed_lr_distance || 0
  }));

  const getScoreColor = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 4.5) return 'text-emerald-600';
    if (numScore >= 3.5) return 'text-yellow-600';
    if (numScore >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreRingColor = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 4.5) return 'stroke-emerald-500';
    if (numScore >= 3.5) return 'stroke-yellow-500';
    if (numScore >= 2.5) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  const getCompletionColor = (rate) => {
    if (rate >= 90) return 'bg-emerald-500';
    if (rate >= 70) return 'bg-yellow-500';
    if (rate >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleEdit = (runnerId) => {
    setEditingCards(prev => ({ ...prev, [runnerId]: true }));
    const runner = runners.find(r => r.id === runnerId);
    setCardData(prev => ({
      ...prev,
      [runnerId]: {
        overrideScore: runner.overrideScore || '',
        qualitativeScore: runner.qualitativeScore || ''
      }
    }));
  };

  const handleSave = async (runnerId) => {
    try {
      setEditingCards(prev => ({ ...prev, [runnerId]: false }));
      const updatedData = cardData[runnerId];
      
      // Save to database
      await updateAthleteData(runnerId, updatedData, selectedMeso);
      
      // Update the local state with the new data (only for the specific mesocycle)
      setAllAthletes(prev => prev.map(athlete => 
        athlete.email_id === runnerId && athlete.meso === selectedMeso
          ? { 
              ...athlete, 
              meso_score_override: updatedData.overrideScore || null,
              meso_qual_score: updatedData.qualitativeScore || athlete.meso_qual_score
            }
          : athlete
      ));
      
      console.log('Successfully saved data for runner:', runnerId, updatedData);
    } catch (error) {
      console.error('Failed to save data:', error);
      // You might want to show an error message to the user here
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleCancel = (runnerId) => {
    setEditingCards(prev => ({ ...prev, [runnerId]: false }));
    setCardData(prev => {
      const { [runnerId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const updateCardData = (runnerId, field, value) => {
    setCardData(prev => ({
      ...prev,
      [runnerId]: {
        ...prev[runnerId],
        [field]: value
      }
    }));
  };

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.filter-dropdown')) {
        setDistanceMenuOpen(false);
        setMesoMenuOpen(false);
      }
      if (!event.target.closest('.hamburger-menu')) {
        setHamburgerMenuOpen(false);
      }
    };

    // Use click instead of mousedown to avoid race condition with button clicks
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Get unique runner names for autocomplete (filtered by current distance and meso selections)
  const filteredRunnerNames = allAthletes.filter(athlete => {
    const distanceMatch = selectedDistance === 'All' || athlete.race_distance === selectedDistance;
    const mesoMatch = selectedMeso === '' || athlete.meso === selectedMeso;
    return distanceMatch && mesoMatch;
  });
  
  const runnerNames = [...new Set(filteredRunnerNames.map(a => a.runner_name).filter(Boolean))].sort();
  
  // Filter names for autocomplete suggestions
  const autocompleteSuggestions = searchTerm 
    ? runnerNames.filter(name => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5) // Limit to 5 suggestions
    : [];

  // Only filter by search term on the client side since distance and meso are filtered at database level
  const filteredRunners = runners.filter(runner => 
    runner.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle autocomplete selection
  const handleAutocompleteSelect = (name) => {
    setSearchTerm(name);
    setShowAutocomplete(false);
  };

  // Help menu handlers


  const handleFeedbackClick = () => {
    setShowFeedbackModal(true);
  };

  const handleUserGuideClick = () => {
    setShowUserGuide(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackType || !feedbackNote.trim()) {
      alert('Please select a type and enter your feedback.');
      return;
    }

    try {
      // Submit feedback to rhwb_helpdesk_requests table
      const { data, error } = await supabase
        .from('rhwb_helpdesk_requests')
        .insert([{
          coach_email: coachEmail,
          created_at: new Date().toISOString(),
          feedback_type: feedbackType,
          request: feedbackNote.trim()
        }]);

      if (error) {
        console.error('Failed to submit feedback:', error);
        alert('Failed to submit feedback. Please try again.');
        return;
      }

      console.log('Feedback submitted successfully:', data);
      alert('Thank you for your feedback!');
      setShowFeedbackModal(false);
      setFeedbackType('');
      setFeedbackNote('');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const InfoTooltip = ({ children, tooltip }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <div className="relative inline-block">
        <div 
          className="flex items-center space-x-1 cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {children}
          <Info className="h-3 w-3 text-gray-400" />
        </div>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap z-10">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    );
  };

  const MetricScoreRing = ({ score }) => {
    const numScore = parseFloat(score) || 0;
    const circumference = 2 * Math.PI * 20;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (numScore / 5) * circumference;

    return (
      <div className="relative">
        <svg className="w-12 h-12 sm:w-16 sm:h-16 transform -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-200"
          />
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={getScoreRingColor(numScore)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm sm:text-lg font-bold ${getScoreColor(numScore)}`}>
            {numScore.toFixed(1)}
          </span>
        </div>
      </div>
    );
  };

  // Show loading state while auth is initializing
  if (isLoading) {
    return <div className="text-center py-8">Initializing...</div>;
  }

  // Show loading state while data is loading (only for dashboard view)
  if (currentView === 'dashboard' && loading) {
    return <div className="text-center py-8">Loading athlete data...</div>;
  }

  if (currentView === 'dashboard' && error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (currentView === 'dashboard' && filteredRunners.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Hamburger Menu Button - Always Visible */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHamburgerMenuOpen(!hamburgerMenuOpen);
                  }}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 hamburger-menu relative z-20 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  style={{ pointerEvents: 'auto' }}
                >
                  {hamburgerMenuOpen ? (
                    <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  ) : (
                    <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  )}
                </button>
                
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">RHWB Connect</h1>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Smarter Coaching. Stronger Community</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Coach name only */}
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <span className="hidden md:inline">Coach: {user?.name || coachName || 'Unknown'}</span>
                  <span className="md:hidden">{user?.name || coachName || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Permanent Sidebar Navigation */}
        <div className={`fixed top-14 sm:top-16 left-0 bg-white border-r border-gray-200 shadow-lg transition-transform duration-300 z-50 ${
          hamburgerMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`} style={{ width: '240px', height: 'auto', maxHeight: 'calc(100vh - 4rem)' }}>
          <div className="flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1.5 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">RHWB Connect</h2>
                  <p className="text-xs text-gray-600">Navigation</p>
                </div>
              </div>
            </div>
            
            {/* Navigation Items */}
            <nav className="p-4 space-y-2">
              <button
                onClick={() => {
                  setCurrentView('know-your-runner');
                  setHamburgerMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                  currentView === 'know-your-runner' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Know Your Runner</span>
              </button>
              
              <button
                onClick={() => {
                  setCurrentView('rhwb-connect');
                  setHamburgerMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                  currentView === 'rhwb-connect' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>OneRHWB</span>
              </button>
              
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  setHamburgerMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                  currentView === 'dashboard' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Runner Metrics</span>
              </button>
              
              {(user?.role === 'admin' || user?.role === 'Admin') && (
                <button
                  onClick={() => {
                    setCurrentView('small-council');
                    setHamburgerMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                    currentView === 'small-council' 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </button>
              )}
              
              {/* Divider */}
              <div className="border-t border-gray-200 my-2"></div>
              
              {/* Help Menu Items */}
              <button
                onClick={() => {
                  handleFeedbackClick();
                  setHamburgerMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Feedback</span>
              </button>
              <button
                onClick={() => {
                  handleUserGuideClick();
                  setHamburgerMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                <BookOpen className="h-4 w-4" />
                <span>User Guide</span>
              </button>
              <button
                onClick={() => {
                  logout();
                  setHamburgerMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm text-red-600 hover:bg-red-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </div>
        
        {/* Overlay for mobile */}
        {hamburgerMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setHamburgerMenuOpen(false)}
          />
        )}

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No athletes found</h3>
            <p className="text-gray-600">No athletes found matching your criteria.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Hamburger Menu Button - Always Visible */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHamburgerMenuOpen(!hamburgerMenuOpen);
                }}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 hamburger-menu relative z-20 min-w-[44px] min-h-[44px] flex items-center justify-center"
                style={{ pointerEvents: 'auto' }}
              >
                {hamburgerMenuOpen ? (
                  <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                ) : (
                  <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                )}
              </button>
              
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">RHWB Connect</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Smarter Coaching. Stronger Community</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Coach name only */}
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <span className="hidden md:inline">Coach: {user?.name || coachName || 'Unknown'}</span>
                <span className="md:hidden">{user?.name || coachName || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Permanent Sidebar Navigation */}
      <div className={`fixed top-14 sm:top-16 left-0 bg-white border-r border-gray-200 shadow-lg transition-transform duration-300 z-50 ${
        hamburgerMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ width: '240px', height: 'auto', maxHeight: 'calc(100vh - 4rem)' }}>
        <div className="flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1.5 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">RHWB Connect</h2>
                <p className="text-xs text-gray-600">Navigation</p>
              </div>
            </div>
          </div>
          
          {/* Navigation Items */}
          <nav className="p-4 space-y-2">
            <button
              onClick={() => {
                setCurrentView('know-your-runner');
                setHamburgerMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                currentView === 'know-your-runner' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Know Your Runner</span>
            </button>
            
            <button
              onClick={() => {
                setCurrentView('rhwb-connect');
                setHamburgerMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                currentView === 'rhwb-connect' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>OneRHWB</span>
            </button>
            
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setHamburgerMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                currentView === 'dashboard' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Runner Metrics</span>
            </button>
            
            {(user?.role === 'admin' || user?.role === 'Admin') && (
              <button
                onClick={() => {
                  setCurrentView('small-council');
                  setHamburgerMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                  currentView === 'small-council' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </button>
            )}
            
            {/* Divider */}
            <div className="border-t border-gray-200 my-2"></div>
            
            {/* Help Menu Items */}
            <button
              onClick={() => {
                handleFeedbackClick();
                setHamburgerMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Feedback</span>
            </button>
            <button
              onClick={() => {
                handleUserGuideClick();
                setHamburgerMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              <BookOpen className="h-4 w-4" />
              <span>User Guide</span>
            </button>
            <button
              onClick={() => {
                logout();
                setHamburgerMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 text-sm text-red-600 hover:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {hamburgerMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setHamburgerMenuOpen(false)}
        />
      )}

      {currentView === 'dashboard' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Filters */}
          <div className="mb-6 sm:mb-8 relative z-30">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Filter Chips */}
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                {/* Race Distance Chip */}
                <div className="relative filter-dropdown z-40">
                  <button
                    onClick={() => setDistanceMenuOpen((prev) => !prev)}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium hover:bg-blue-100 transition-colors duration-200 border border-blue-200 text-sm sm:text-base"
                  >
                    <span>{selectedDistance}</span>
                    <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 ${distanceMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {distanceMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 min-w-[120px]">
                      {distanceOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSelectedDistance(option.value);
                            setDistanceMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                            selectedDistance === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mesocycle Chip */}
                <div className="relative filter-dropdown z-40">
                  <button
                    onClick={() => setMesoMenuOpen((prev) => !prev)}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium hover:bg-purple-100 transition-colors duration-200 border border-purple-200 text-sm sm:text-base"
                  >
                    <span>{selectedMeso || 'Select Mesocycle'}</span>
                    <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 ${mesoMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {mesoMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 min-w-[120px]">
                      {filteredMesoOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSelectedMeso(option.value);
                            setMesoMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                            selectedMeso === option.value ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search Bar with Autocomplete */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search athletes..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowAutocomplete(true);
                    }}
                    onFocus={() => setShowAutocomplete(true)}
                    onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 text-sm sm:text-base"
                  />
                  
                  {/* Autocomplete Dropdown */}
                  {showAutocomplete && autocompleteSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 max-h-48 overflow-y-auto">
                      {autocompleteSuggestions.map((name, index) => (
                        <button
                          key={index}
                          onClick={() => handleAutocompleteSelect(name)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-gray-700 hover:text-blue-700"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Runner Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 relative z-10">
          {filteredRunners.map((runner) => (
            <div key={runner.id} className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 relative z-10">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                      {runner.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold truncate">{runner.name}</h3>
                      <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm opacity-90">
                        <span className="hidden sm:inline">Completion Rate:</span>
                        <span className="sm:hidden">Rate:</span>
                        <div className="flex items-center space-x-1">
                          <div className="w-12 sm:w-16 h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getCompletionColor(runner.completionRate)} transition-all duration-500`}
                              style={{ width: `${runner.completionRate}%` }}
                            />
                          </div>
                          <span className="font-medium text-xs sm:text-sm">{runner.completionRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <MetricScoreRing score={runner.metricScore} />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-6">
                {/* Training Metrics */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <InfoTooltip tooltip="Number of strength training sessions planned">
                      <div className="text-xs sm:text-sm text-blue-600 font-medium">Strength Planned</div>
                    </InfoTooltip>
                    <div className="text-xl sm:text-2xl font-bold text-blue-700">{runner.strengthPlanned}</div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <InfoTooltip tooltip="Number of strength training sessions completed">
                      <div className="text-xs sm:text-sm text-green-600 font-medium">Strength Completed</div>
                    </InfoTooltip>
                    <div className="text-xl sm:text-2xl font-bold text-green-700">{runner.strengthCompleted}</div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <InfoTooltip tooltip="Total mileage planned for the period">
                      <div className="text-xs sm:text-sm text-purple-600 font-medium">Mileage Planned</div>
                    </InfoTooltip>
                    <div className="text-xl sm:text-2xl font-bold text-purple-700">{runner.mileagePlanned}</div>
                  </div>
                  
                  <div className="bg-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <InfoTooltip tooltip="Total mileage completed for the period">
                      <div className="text-xs sm:text-sm text-indigo-600 font-medium">Mileage Completed</div>
                    </InfoTooltip>
                    <div className="text-xl sm:text-2xl font-bold text-indigo-700">{runner.mileageCompleted}</div>
                  </div>
                </div>

                {/* Override Score */}
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Override Score (0-5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={editingCards[runner.id] ? (cardData[runner.id]?.overrideScore || '') : (runner.overrideScore || '')}
                    onChange={(e) => updateCardData(runner.id, 'overrideScore', e.target.value)}
                    disabled={!editingCards[runner.id]}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 text-sm sm:text-base"
                    placeholder="Optional override score"
                  />
                </div>

                {/* Qualitative Score */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Coach Notes
                  </label>
                  <textarea
                    value={editingCards[runner.id] ? (cardData[runner.id]?.qualitativeScore || '') : runner.qualitativeScore}
                    onChange={(e) => updateCardData(runner.id, 'qualitativeScore', e.target.value)}
                    disabled={!editingCards[runner.id]}
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500 text-sm sm:text-base"
                    placeholder="Enter your coaching notes..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 sm:space-x-3">
                  {editingCards[runner.id] ? (
                    <>
                      <button
                        onClick={() => handleCancel(runner.id)}
                        className="px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(runner.id)}
                        className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-1 sm:space-x-2 font-medium text-sm sm:text-base"
                      >
                        <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Save Changes</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEdit(runner.id)}
                      className="px-4 sm:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center space-x-1 sm:space-x-2 font-medium text-sm sm:text-base"
                    >
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      ) : currentView === 'rhwb-connect' ? (
        <RHWBConnect />
      ) : currentView === 'small-council' ? (
        <SmallCouncil coachEmail={coachEmail} />
      ) : (
        <KnowYourRunner 
          cohortData={cohortData}
          cohortLoading={cohortLoading}
          cohortError={cohortError}
          selectedDistance={selectedDistance}
          setSelectedDistance={setSelectedDistance}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterOptions={cohortFilterOptions}
          currentSeason={currentSeason}
          coachEmail={coachEmail}
        />
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Feedback</h2>
              </div>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackType('');
                  setFeedbackNote('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Feedback Type Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Type *
                </label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a type</option>
                  <option value="bug">Bug</option>
                  <option value="data-issue">Data Issue</option>
                  <option value="feature-request">Feature Request</option>
                </select>
              </div>

              {/* Feedback Note */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Details *
                </label>
                <textarea
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="Please describe your feedback in detail..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackType('');
                  setFeedbackNote('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Guide Modal */}
      {showUserGuide && (
        <UserGuide onClose={() => setShowUserGuide(false)} />
      )}
    </div>
  );
};

export default CoachDashboard; 