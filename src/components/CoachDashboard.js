import React, { useState, useEffect } from 'react';
import { Search, Info, Save, TrendingUp, Users, Calendar, ChevronDown } from 'lucide-react';
import { fetchCoachData, updateAthleteData, calculateCompletionRate, getAvatarInitials } from '../services/coachService';
import { useAuth } from '../contexts/AuthContext';

const CoachDashboard = () => {
  const { user, isLoading } = useAuth();
  
  // Get coach email from JWT token or URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const coachEmail = user?.email || urlParams.get('coach');
  const season = parseInt(urlParams.get('season')) || 13;

  const [selectedDistance, setSelectedDistance] = useState('All');
  const [selectedMeso, setSelectedMeso] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [editingCards, setEditingCards] = useState({});
  const [cardData, setCardData] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dropdown menu states
  const [distanceMenuOpen, setDistanceMenuOpen] = useState(false);
  const [mesoMenuOpen, setMesoMenuOpen] = useState(false);

  // Get unique filter options from data
  // Store all data and filter options
  const [allAthletes, setAllAthletes] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    distances: [],
    mesocycles: []
  });

  // Load all data and filter options on initial load only
  useEffect(() => {
    const loadAllData = async () => {
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
  }, [coachEmail, season]);

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 44 44">
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
          <span className={`text-lg font-bold ${getScoreColor(numScore)}`}>
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

  // Check if coach email is available
  if (!coachEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200 max-w-md mx-4">
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl mb-6">
              <TrendingUp className="h-12 w-12 text-white mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
            <p className="text-gray-600 mb-6">
              You need to authenticate to access the Coach Portal. Please log in through the official RHWB website.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700">
                Redirecting to <a href="https://www.rhwb.org/coach-portal" className="font-semibold underline">RHWB Coach Portal</a> in 3 seconds...
              </p>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while data is loading
  if (loading) {
    return <div className="text-center py-8">Loading athlete data...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (filteredRunners.length === 0) {
    return <div className="text-center py-8">No athletes found matching your criteria.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Coach Dashboard</h1>
                <p className="text-sm text-gray-600">Track your runners' progress</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{filteredRunners.length} Athletes</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Season {season}</span>
              </div>
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <span>Coach: {user?.name || user?.email || allAthletes[0]?.coach || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8 relative z-30">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col gap-4">
              {/* Filter Chips */}
              <div className="flex flex-wrap gap-4 items-center">
                {/* Race Distance Chip */}
                <div className="relative filter-dropdown z-40">
                  <button
                    onClick={() => setDistanceMenuOpen(!distanceMenuOpen)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium hover:bg-blue-100 transition-colors duration-200 border border-blue-200"
                  >
                    <span>{selectedDistance}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${distanceMenuOpen ? 'rotate-180' : ''}`} />
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
                    onClick={() => setMesoMenuOpen(!mesoMenuOpen)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium hover:bg-purple-100 transition-colors duration-200 border border-purple-200"
                  >
                    <span>{selectedMeso || 'Select Mesocycle'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mesoMenuOpen ? 'rotate-180' : ''}`} />
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
                <div className="relative">
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
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
          {filteredRunners.map((runner) => (
            <div key={runner.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 relative z-10">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                      {runner.avatar}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{runner.name}</h3>
                      <div className="flex items-center space-x-2 text-sm opacity-90">
                        <span>Completion Rate:</span>
                        <div className="flex items-center space-x-1">
                          <div className="w-16 h-2 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getCompletionColor(runner.completionRate)} transition-all duration-500`}
                              style={{ width: `${runner.completionRate}%` }}
                            />
                          </div>
                          <span className="font-medium">{runner.completionRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <MetricScoreRing score={runner.metricScore} />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                {/* Training Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <InfoTooltip tooltip="Number of strength training sessions planned">
                      <div className="text-sm text-blue-600 font-medium">Strength Planned</div>
                    </InfoTooltip>
                    <div className="text-2xl font-bold text-blue-700">{runner.strengthPlanned}</div>
                  </div>
                  
                  <div className="bg-green-50 rounded-xl p-4">
                    <InfoTooltip tooltip="Number of strength training sessions completed">
                      <div className="text-sm text-green-600 font-medium">Strength Completed</div>
                    </InfoTooltip>
                    <div className="text-2xl font-bold text-green-700">{runner.strengthCompleted}</div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-xl p-4">
                    <InfoTooltip tooltip="Total mileage planned for the period">
                      <div className="text-sm text-purple-600 font-medium">Mileage Planned</div>
                    </InfoTooltip>
                    <div className="text-2xl font-bold text-purple-700">{runner.mileagePlanned}</div>
                  </div>
                  
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <InfoTooltip tooltip="Total mileage completed for the period">
                      <div className="text-sm text-indigo-600 font-medium">Mileage Completed</div>
                    </InfoTooltip>
                    <div className="text-2xl font-bold text-indigo-700">{runner.mileageCompleted}</div>
                  </div>
                </div>

                {/* Override Score */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Optional override score"
                  />
                </div>

                {/* Qualitative Score */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coach Notes
                  </label>
                  <textarea
                    value={editingCards[runner.id] ? (cardData[runner.id]?.qualitativeScore || '') : runner.qualitativeScore}
                    onChange={(e) => updateCardData(runner.id, 'qualitativeScore', e.target.value)}
                    disabled={!editingCards[runner.id]}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter your coaching notes..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  {editingCards[runner.id] ? (
                    <>
                      <button
                        onClick={() => handleCancel(runner.id)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(runner.id)}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 font-medium"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save Changes</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEdit(runner.id)}
                      className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 font-medium"
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
    </div>
  );
};

export default CoachDashboard; 