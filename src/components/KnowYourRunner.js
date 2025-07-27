import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Users, Edit, User, Users as FamilyIcon, Clock, FileText, TrendingUp } from 'lucide-react';
import RunnerCoachNotes from './RunnerCoachNotes';
import RunnerBio from './RunnerBio';
import RunnerFamilyMembers from './RunnerFamilyMembers';

const KnowYourRunner = ({ 
  cohortData = [], 
  cohortLoading = false, 
  cohortError = null,
  selectedDistance = 'All',
  setSelectedDistance,
  searchTerm = '',
  setSearchTerm,
  filterOptions = { distances: [] },
  currentSeason = null
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [distanceMenuOpen, setDistanceMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedRunner, setSelectedRunner] = useState(null);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.filter-dropdown') && !event.target.closest('.search-container')) {
        setDistanceMenuOpen(false);
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter cohort data based on selected distance and search term
  const filteredRunners = cohortData.filter(runner => {
    const matchesDistance = selectedDistance === 'All' || runner.race_distance === selectedDistance;
    const matchesSearch = !searchTerm || 
      runner.runner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      runner.email_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesDistance && matchesSearch;
  });

  // Get runner names for autocomplete (filtered by current distance)
  const runnerNames = cohortData
    .filter(runner => selectedDistance === 'All' || runner.race_distance === selectedDistance)
    .map(runner => runner.runner_name || runner.email_id)
    .filter(Boolean);

  // Get autocomplete suggestions
  const autocompleteSuggestions = runnerNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  // Handle autocomplete selection
  const handleAutocompleteSelect = (name) => {
    setSearchTerm(name);
    setShowAutocomplete(false);
  };

  // Handle accordion section toggle
  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Handle runner selection
  const handleRunnerSelect = (runner) => {
    setSelectedRunner(runner);
    // Reset expanded sections when selecting a new runner
    setExpandedSections({});
  };

  const distanceOptions = filterOptions.distances;

  // Show loading state
  if (cohortLoading) {
    return <div className="text-center py-8">Loading runner data...</div>;
  }

  // Show error state
  if (cohortError) {
    return <div className="text-center py-8 text-red-600">{cohortError}</div>;
  }

  return (
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

              {/* Search Bar with Autocomplete */}
              <div className="relative search-container">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search runners..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowAutocomplete(true);
                  }}
                  onFocus={() => setShowAutocomplete(true)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
                
                {showAutocomplete && autocompleteSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {autocompleteSuggestions.map((name, index) => (
                      <button
                        key={index}
                        onClick={() => handleAutocompleteSelect(name)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
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

      {/* My Cohort Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center mb-6">
          <Users className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">My Cohort</h2>
        </div>
        
        {/* Results Summary */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-blue-700">
            Found <span className="font-semibold">{filteredRunners.length}</span> runners in your cohort
            {currentSeason && ` for ${currentSeason}`}
            {selectedDistance !== 'All' && ` in ${selectedDistance}`}
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>

        {/* Cohort List */}
        {filteredRunners.length > 0 ? (
          <div className="space-y-3">
            {filteredRunners.map((runner, index) => (
              <div key={runner.email_id || index} className="space-y-3">
                {/* Runner Card - Clickable Header */}
                <div 
                  className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                    selectedRunner?.email_id === runner.email_id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleRunnerSelect(runner)}
                >
                  <div className="flex items-center justify-between">
                    {/* Left side - Avatar and basic info */}
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {runner.runner_name ? runner.runner_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                        </span>
                      </div>
                      
                      {/* Runner info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900 text-lg">{runner.runner_name}</h3>
                          <span className="text-sm text-gray-500">{runner.gender_age || 'N/A'}</span>
                          {runner.phone_no && (
                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                              {runner.phone_no}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1">
                          {/* Race Distance Chip */}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            runner.race_distance === '5K' ? 'bg-green-100 text-green-700' :
                            runner.race_distance === '10K' ? 'bg-blue-100 text-blue-700' :
                            runner.race_distance === 'Half Marathon' ? 'bg-orange-100 text-orange-700' :
                            runner.race_distance === 'Full Marathon' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {runner.race_distance}
                          </span>
                          
                          {/* Location */}
                          {runner.location && (
                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              {runner.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side - Action icons */}
                    <div className="flex items-center space-x-2">
                      {/* Star icon (placeholder for favorite/status) */}
                      <button className="p-2 text-gray-400 hover:text-yellow-500 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                      
                      {/* More options */}
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      
                      {/* Chevron down */}
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        selectedRunner?.email_id === runner.email_id ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>
                </div>

                {/* Accordion Sections - Only show when runner is selected */}
                {selectedRunner?.email_id === runner.email_id && (
                  <div className="space-y-3 ml-4">
                    {/* Coach Notes */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('coachNotes')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Edit className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-gray-900">Coach Notes</span>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.coachNotes ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.coachNotes && (
                        <div className="px-4 pb-4">
                          <RunnerCoachNotes runner={runner} />
                        </div>
                      )}
                    </div>

                    {/* Bio & Background */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('bio')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <User className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-gray-900">Bio & Background</span>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.bio ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.bio && (
                        <div className="px-4 pb-4">
                          <RunnerBio runner={runner} />
                        </div>
                      )}
                    </div>

                    {/* Family Members */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('family')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <FamilyIcon className="h-5 w-5 text-purple-600" />
                          <span className="font-medium text-gray-900">Family Members</span>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.family ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.family && (
                        <div className="px-4 pb-4">
                          <RunnerFamilyMembers runner={runner} />
                        </div>
                      )}
                    </div>

                    {/* Club History */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('clubHistory')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <span className="font-medium text-gray-900">Club History</span>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.clubHistory ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.clubHistory && (
                        <div className="px-4 pb-4">
                          <div className="text-gray-600">Club history information will be displayed here.</div>
                        </div>
                      )}
                    </div>

                    {/* Onboarding Survey */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('onboarding')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-indigo-600" />
                          <span className="font-medium text-gray-900">Onboarding Survey</span>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.onboarding ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.onboarding && (
                        <div className="px-4 pb-4">
                          <div className="text-gray-600">Onboarding survey responses will be displayed here.</div>
                        </div>
                      )}
                    </div>

                    {/* Season Metrics & Performance */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('metrics')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <TrendingUp className="h-5 w-5 text-red-600" />
                          <span className="font-medium text-gray-900">Season Metrics & Performance</span>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.metrics ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.metrics && (
                        <div className="px-4 pb-4">
                          <div className="text-gray-600">Season metrics and performance data will be displayed here.</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              No runners found in your cohort matching the current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowYourRunner; 