import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Mail, Calendar, MapPin, Award, Loader, Phone, Map, Users, Gift, ChevronsRight, ChevronDown, ChevronRight, MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// Utility to calculate age from date string
function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Highlight matching text component
const HighlightMatch = ({ text, query }) => {
  if (!text || !query) {
    return <span>{text}</span>;
  }
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <strong key={i}>{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

// Detail item component
const DetailItem = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  
  // Check if this is a phone number and make it clickable
  const isPhoneNumber = label === 'Phone';
  
  return (
    <div className="flex items-center text-sm">
      <Icon className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-gray-600">{label}</p>
        {isPhoneNumber ? (
          <div className="flex items-center space-x-2">
            <a 
              href={`tel:${value}`}
              className="text-gray-900 hover:text-blue-600 hover:underline transition-colors"
              title="Click to call"
            >
              {value}
            </a>
            <a 
              href={`https://wa.me/${value.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700 transition-colors"
              title="Open WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <p className="text-gray-900">{value}</p>
        )}
      </div>
    </div>
  );
};

// Search Bar Component
const SearchBar = ({ onRunnerSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchRunners = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('runners_profile')
          .select('*')
          .or(`runner_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,email_id.ilike.%${query}%`)
          .limit(10);

        if (error) {
          console.error('Error searching runners:', error);
          setResults([]);
        } else {
          setResults(data || []);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Error searching runners:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchRunners, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleRunnerSelect = (runner) => {
    onRunnerSelect(runner);
    setQuery(runner.runner_name || `${runner.first_name} ${runner.last_name}` || runner.email_id);
    setShowResults(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={searchRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length > 1 && setShowResults(true)}
          placeholder="Search by name or email..."
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-full text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
        />
        {query && (
          <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div>
              {results.map((runner) => (
                <div
                  key={runner.email_id}
                  onClick={() => handleRunnerSelect(runner)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        <HighlightMatch text={runner.runner_name || `${runner.first_name} ${runner.last_name}`} query={query} />
                      </div>
                      <div className="text-sm text-gray-500">
                        <HighlightMatch text={runner.email_id} query={query} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No runners found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Runner Details Component
const RunnerDetails = ({ runner, seasonHistory, isLoading, onRunnerSelect }) => {
  const [household, setHousehold] = useState([]);
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(false);
  const [showSeasonHistory, setShowSeasonHistory] = useState(false);

  useEffect(() => {
    const fetchHousehold = async () => {
      if (!runner || !runner.city || !runner.state || !runner.country) {
        setHousehold([]);
        return;
      }
      setIsLoadingHousehold(true);
      // First, get the full_address for the selected runner
      const { data: runnerAddressData, error: addressError } = await supabase
        .from('runners_household')
        .select('full_address')
        .eq('email_id', runner.email_id)
        .single();
      
      if (addressError || !runnerAddressData) {
        setHousehold([]);
        setIsLoadingHousehold(false);
        return;
      }
      
      const runnerFullAddress = runnerAddressData.full_address;
      
      // Now get all household members with the same address, excluding the selected runner
      const { data, error } = await supabase
        .from('runners_household')
        .select('*')
        .eq('full_address', runnerFullAddress)
        .neq('email_id', runner.email_id);
      
      if (error || !data) {
        setHousehold([]);
        setIsLoadingHousehold(false);
        return;
      }
      // Fetch gender for each household member from runners_profile
      const emailIds = data.map((member) => member.email_id);
      
      let genderMap = {};
      if (emailIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('runners_profile')
          .select('email_id, gender')
          .in('email_id', emailIds);
        
        if (!profileError && profiles) {
          genderMap = profiles.reduce((acc, profile) => {
            acc[profile.email_id] = profile.gender;
            return acc;
          }, {});
        }
      }
      // Merge gender into household data
      const merged = data.map((member) => ({ ...member, gender: genderMap[member.email_id] || null }));
      setHousehold(merged);
      setIsLoadingHousehold(false);
    };
    fetchHousehold();
  }, [runner]);

  if (!runner) {
    return (
      <div className="text-center text-gray-500 mt-8">
        <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Select a runner to view their details</p>
      </div>
    );
  }

  const location = [runner.city, runner.state, runner.country].filter(Boolean).join(', ');

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="bg-white bg-opacity-20 rounded-full p-3 mr-4 w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <User className="h-8 w-8" />
            </div>
            <div className="mt-4 sm:mt-0">
              <h1 className="text-xl sm:text-2xl font-bold">{runner.runner_name}</h1>
              <p className="text-blue-100 flex items-center mt-1 text-sm break-all">
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <a 
                  href={`mailto:${runner.email_id}`}
                  className="hover:text-white hover:underline transition-colors"
                  title="Send email"
                >
                  {runner.email_id}
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailItem icon={User} label="Gender" value={runner.gender} />
            <DetailItem icon={Gift} label="Age" value={(() => { const age = calculateAge(runner.dob); return age !== null ? age.toString() : undefined; })()} />
            <DetailItem icon={Phone} label="Phone" value={runner.phone_no} />
            <DetailItem icon={Map} label="Location" value={location} />
            <DetailItem icon={Calendar} label="Member Since" value={runner.member_since} />
            <DetailItem icon={Users} label="Referred By" value={runner.referred_by} />
            <DetailItem icon={ChevronsRight} label="Most Recent Season" value={runner.most_recent_season} />
          </div>
          

        </div>

        {/* Runner's Family */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Runner's Family</h2>
          {isLoadingHousehold ? (
            <p className="text-gray-700">Loading family information...</p>
          ) : household.filter((member) => member.email_id !== runner.email_id).length > 0 ? (
            <ul className="space-y-2">
              {household
                .filter((member) => member.email_id !== runner.email_id)
                .map((member) => {
                  const age = calculateAge(member.dob);
                  const gender = member.gender || '';
                  const ageGender = age !== null ? `${age}${gender ? ' ' + gender.charAt(0).toUpperCase() : ''}` : '';
                  return (
                    <li key={member.email_id} className="flex items-center justify-between">
                      <button
                        className="font-medium text-blue-700 hover:underline focus:outline-none"
                        onClick={() => onRunnerSelect && onRunnerSelect(member.email_id)}
                        type="button"
                      >
                        {member.runner_name}
                      </button>
                      <span className="text-gray-600 text-sm">{ageGender}</span>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p className="text-gray-700">No family members found for this address.</p>
          )}
        </div>

        {/* Season History */}
        <div className="p-4 sm:p-6">
          <button
            className="flex items-center text-lg sm:text-xl font-bold text-gray-900 mb-4 focus:outline-none"
            onClick={() => setShowSeasonHistory((prev) => !prev)}
            aria-expanded={showSeasonHistory}
            aria-controls="season-history-content"
            type="button"
          >
            {showSeasonHistory ? (
              <ChevronDown className="h-5 w-5 mr-2" />
            ) : (
              <ChevronRight className="h-5 w-5 mr-2" />
            )}
            Season History
          </button>
          {showSeasonHistory && (
            isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-8 w-8 animate-spin text-blue-500" />
                <p className="ml-4 text-gray-600">Loading history...</p>
              </div>
            ) : seasonHistory.length > 0 ? (
              <div className="space-y-4" id="season-history-content">
                {seasonHistory.map((season) => (
                  <div key={season.season_no} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center mb-3">
                      <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                      <h3 className="font-semibold text-gray-900">{season.season || `Season ${season.season_no}`}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <DetailItem icon={MapPin} label="Race Distance" value={season.race_distance} />
                      <DetailItem icon={Award} label="Coach" value={season.coach} />
                      <DetailItem icon={ChevronsRight} label="Segment" value={season.segment} />
                      <DetailItem icon={ChevronsRight} label="Season Phase" value={season.season_phase} />
                      <DetailItem icon={ChevronsRight} label="Activity" value={season.activity} />
                      <DetailItem icon={ChevronsRight} label="Level" value={season.level} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500" id="season-history-content">No season history found for this runner.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// Main RHWBConnect Component
const RHWBConnect = () => {
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [seasonHistory, setSeasonHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchSeasonHistory = async () => {
      if (!selectedRunner) {
        setSeasonHistory([]);
        return;
      }
      setIsLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('runner_season_info')
          .select('*')
          .eq('email_id', selectedRunner.email_id)
          .order('season_no', { ascending: false });
        if (error) {
          console.error('Error fetching season history:', error);
          setSeasonHistory([]);
        } else {
          setSeasonHistory(data || []);
        }
      } catch (error) {
        console.error('Error fetching season history:', error);
        setSeasonHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchSeasonHistory();
  }, [selectedRunner]);

  // Handler for selecting a runner by email_id (for family member links)
  const handleRunnerSelectByEmail = async (email_id) => {
    const { data, error } = await supabase
      .from('runners_profile')
      .select('*')
      .eq('email_id', email_id)
      .single();
    if (!error && data) {
      setSelectedRunner(data);
    }
  };

  const handleRunnerSelect = (runner) => {
    setSelectedRunner(runner);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              OneRHWB
            </h2>
            <p className="text-gray-600">
              All Seasons History. Search by Name or Email address.
            </p>
          </div>
          <SearchBar onRunnerSelect={handleRunnerSelect} />
        </div>
        <RunnerDetails
          runner={selectedRunner}
          seasonHistory={seasonHistory}
          isLoading={isLoadingHistory}
          onRunnerSelect={handleRunnerSelectByEmail}
        />
      </main>
    </div>
  );
};

export default RHWBConnect; 