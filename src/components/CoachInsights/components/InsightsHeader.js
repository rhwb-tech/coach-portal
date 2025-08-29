import React from 'react';
import { ChevronDown, RefreshCw, Calendar, BarChart3, User, Target } from 'lucide-react';

const InsightsHeader = ({ 
  seasons, 
  selectedSeason, 
  onSeasonChange, 
  coachEmail,
  availableCoaches = [],
  selectedCoach,
  onCoachChange,
  availableMesos = [],
  selectedMeso,
  onMesoChange,
  isAdmin = typeof isAdmin === 'boolean' ? isAdmin : false,
  onRefresh 
}) => {
  const currentSeason = seasons.find(s => s.id === selectedSeason);
  const [refreshing, setRefreshing] = React.useState(false);
  

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 space-y-3 sm:space-y-0">
          {/* Title and Description */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Coach Insights
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Performance analytics and athlete insights
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            {/* Coach Info */}
            {coachEmail && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span className="truncate max-w-xs">
                  {coachEmail}
                </span>
              </div>
            )}

            {/* Season Selector */}
            <div className="relative">
              <label htmlFor="season-select" className="sr-only">
                Select Season
              </label>
              <div className="relative">
                <select
                  id="season-select"
                  value={selectedSeason || ''}
                  onChange={(e) => onSeasonChange(parseInt(e.target.value))}
                  className="appearance-none bg-white border border-gray-300 rounded-lg pl-10 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[160px]"
                >
                  <option value="" disabled>Select Season</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      Season {season.season}
                      {season.current && ' (Current)'}
                    </option>
                  ))}
                </select>
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Mesocycle Selector */}
            {availableMesos.length > 0 && (
              <div className="relative">
                <label htmlFor="meso-select" className="sr-only">
                  Select Mesocycle
                </label>
                <div className="relative">
                  <select
                    id="meso-select"
                    value={selectedMeso || ''}
                    onChange={(e) => onMesoChange(e.target.value || null)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg pl-10 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
                  >
                    <option value="">All Mesocycles</option>
                    {availableMesos.map((meso) => (
                      <option key={meso} value={meso}>
                        {meso}
                      </option>
                    ))}
                  </select>
                  <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            )}

            {/* Coach Selector - Admin Only */}
            {isAdmin && availableCoaches.length > 0 && (
              <div className="relative">
                <label htmlFor="coach-select" className="sr-only">
                  Select Coach
                </label>
                <div className="relative">
                  <select
                    id="coach-select"
                    value={selectedCoach || ''}
                    onChange={(e) => onCoachChange(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg pl-10 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                  >
                    <option value="" disabled>Select Coach</option>
                    {availableCoaches.map((coach) => (
                      <option key={coach.coach_email_id} value={coach.coach_email_id}>
                        {coach.coach} ({coach.coach_email_id})
                      </option>
                    ))}
                  </select>
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Season & Coach Info Banner */}
        {currentSeason && (
          <div className="pb-4 space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Viewing data for <strong>Season {currentSeason.season}</strong>
                {currentSeason.current && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Current
                  </span>
                )}
              </span>
            </div>
            
            {/* Coach Info Banner */}
            {coachEmail && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 flex items-center space-x-2">
                <User className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-800">
                  Coach: <strong>{coachEmail}</strong>
                  {isAdmin && selectedCoach && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Admin View
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsHeader;