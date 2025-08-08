import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Users, Edit, Users as FamilyIcon, Clock, FileText, TrendingUp, Plus, MessageCircle, Mail } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import RunnerCoachNotes from './RunnerCoachNotes';
import RunnerFamilyMembers from './RunnerFamilyMembers';
import RunnerClubHistory from './RunnerClubHistory';
import RunnerOnboardingSurvey from './RunnerOnboardingSurvey';

const KnowYourRunner = ({ 
  cohortData = [], 
  cohortLoading = false, 
  cohortError = null,
  selectedDistance = 'All',
  setSelectedDistance,
  searchTerm = '',
  setSearchTerm,
  filterOptions = { distances: [] },
  currentSeason = null,
  coachEmail = null
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [distanceMenuOpen, setDistanceMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [menuOpenFor, setMenuOpenFor] = useState(null); // Track which runner's menu is open
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [transferRunner, setTransferRunner] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [transferComment, setTransferComment] = useState('');
  const [pendingTransfers, setPendingTransfers] = useState(new Set());
  
  // Defer runner state
  const [showDeferModal, setShowDeferModal] = useState(false);
  const [showDeferConfirmationModal, setShowDeferConfirmationModal] = useState(false);
  const [deferRunner, setDeferRunner] = useState(null);
  const [deferComment, setDeferComment] = useState('');
  const [pendingDefers, setPendingDefers] = useState(new Set());
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesRunner, setNotesRunner] = useState(null);
  const [notesContent, setNotesContent] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.filter-dropdown') && !event.target.closest('.search-container')) {
        setDistanceMenuOpen(false);
        setShowAutocomplete(false);
      }
      if (!event.target.closest('.runner-menu')) {
        setMenuOpenFor(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for notes updates to refresh the star colors
  useEffect(() => {
    const handleNotesUpdated = (event) => {
      // Trigger a page refresh or data reload to update the star colors
      // For now, we'll just log the event - the parent component will handle the data refresh
      console.log('Notes updated:', event.detail);
    };

    window.addEventListener('notesUpdated', handleNotesUpdated);
    return () => window.removeEventListener('notesUpdated', handleNotesUpdated);
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
    // Toggle selection - if clicking the same runner, deselect it
    if (selectedRunner?.email_id === runner.email_id) {
      setSelectedRunner(null);
      setExpandedSections({});
    } else {
      setSelectedRunner(runner);
      // Reset expanded sections when selecting a new runner
      setExpandedSections({});
    }
  };

  // Handle menu toggle
  const toggleMenu = (runnerId, event) => {
    event.stopPropagation(); // Prevent triggering runner selection
    setMenuOpenFor(menuOpenFor === runnerId ? null : runnerId);
  };

  // Handle transfer runner
  const handleTransferRunner = (runner) => {
    setTransferRunner(runner);
    setShowTransferModal(true);
    setMenuOpenFor(null); // Close the menu
  };

  // Handle defer runner
  const handleDeferRunner = (runner) => {
    setDeferRunner(runner);
    setShowDeferModal(true);
    setMenuOpenFor(null); // Close the menu
  };

  // Handle star click (opens notes modal)
  const handleStarClick = async (runner, event) => {
    event.stopPropagation(); // Prevent triggering runner selection
    
    // Select the runner if not already selected
    if (selectedRunner?.email_id !== runner.email_id) {
      setSelectedRunner(runner);
      setExpandedSections({});
    }
    
    // Expand the coach notes section
    setExpandedSections(prev => ({
      ...prev,
      coachNotes: true
    }));
  };

  // Auto-save notes
  const saveNotes = async (content) => {
    if (!notesRunner || !coachEmail) return;
    try {
      setNotesLoading(true);
      // Check if notes already exist for this runner/coach combination
      const { data: existingNotes } = await supabase
        .from('profile_notes')
        .select('note_ts')
        .eq('email_id', notesRunner.email_id)
        .eq('comment_by', coachEmail)
        .order('note_ts', { ascending: false })
        .limit(1)
        .single();
      if (existingNotes) {
        // Update existing note (by timestamp)
        const { error } = await supabase
          .from('profile_notes')
          .update({
            note: content,
            note_ts: new Date().toISOString()
          })
          .eq('email_id', notesRunner.email_id)
          .eq('comment_by', coachEmail)
          .eq('note_ts', existingNotes.note_ts);
        if (error) throw error;
      } else {
        // Insert new note
        const { error } = await supabase
          .from('profile_notes')
          .insert([{
            email_id: notesRunner.email_id,
            note: content,
            note_ts: new Date().toISOString(),
            comment_by: coachEmail
          }]);
        if (error) throw error;
      }
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
      // Update notes_present in runners_profile
      if (notesRunner && notesRunner.email_id) {
        const { error: updateError } = await supabase
          .from('runners_profile')
          .update({ notes_present: true })
          .eq('email_id', notesRunner.email_id);
        if (updateError) {
          console.error('Failed to update notes_present in runners_profile:', updateError);
        }
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  // Handle notes content change with auto-save
  const handleNotesChange = (content) => {
    setNotesContent(content);
    // Auto-save after a short delay
    setTimeout(() => {
      saveNotes(content);
    }, 1000); // 1 second delay
  };

  // Handle program selection (updates selected program in transfer modal)
  const handleProgramSelection = (newProgram) => {
    setSelectedProgram(newProgram);
  };

  // Handle submit button click (shows confirmation modal)
  const handleTransferSubmit = () => {
    if (!selectedProgram) {
      alert('Please select a program first.');
      return;
    }
    setShowTransferModal(false);
    setShowConfirmationModal(true);
  };

  const handleDeferSubmit = () => {
    setShowDeferModal(false);
    setShowDeferConfirmationModal(true);
  };

  // Handle confirmed program transfer
  const handleConfirmedTransfer = async () => {
    try {
      // Check authentication
      await supabase.auth.getSession();
      
      const transferData = {
        action_type: 'Transfer Runner',
        runner_email_id: transferRunner.email_id,
        requestor_email_id: coachEmail || 'unknown@example.com',
        comments: transferComment.trim() || null,
        current_program: transferRunner.race_distance,
        new_program: selectedProgram
      };

      // First, let's test if we can read from the table
      const { error: testError } = await supabase
        .from('rhwb_action_requests')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.error('Failed to read from table:', testError);
        alert('Cannot connect to table. Check Supabase configuration.');
        return;
      }

      // Insert into rhwb_action_requests table
      const { error } = await supabase
        .from('rhwb_action_requests')
        .insert([transferData]);

      if (error) {
        console.error('Failed to insert transfer request:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        throw error;
      }
      
      // Mark this runner as having a pending transfer
      setPendingTransfers(prev => new Set([...prev, transferRunner.email_id]));
      
      // Close modals and reset state
      setShowConfirmationModal(false);
      setTransferRunner(null);
      setSelectedProgram(null);
      setTransferComment('');
      
    } catch (error) {
      console.error('Failed to submit transfer request:', error);
      alert('Failed to submit transfer request. Check console for details.');
    }
  };

  // Handle confirmed defer request
  const handleConfirmedDefer = async () => {
    try {
      // Check authentication
      await supabase.auth.getSession();
      
      const deferData = {
        action_type: 'Defer Runner',
        runner_email_id: deferRunner.email_id,
        requestor_email_id: coachEmail || 'unknown@example.com',
        comments: deferComment.trim() || null,
        status: 'pending'
      };

      // First, let's test if we can read from the table
      const { error: testError } = await supabase
        .from('rhwb_action_requests')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.error('Failed to read from table:', testError);
        alert('Cannot connect to table. Check Supabase configuration.');
        return;
      }

      // Insert into rhwb_action_requests table
      const { error } = await supabase
        .from('rhwb_action_requests')
        .insert([deferData]);

      if (error) {
        console.error('Failed to insert defer request:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        throw error;
      }


      
      // Mark this runner as having a pending defer
      setPendingDefers(prev => new Set([...prev, deferRunner.email_id]));
      
      // Close modals and reset state
      setShowDeferConfirmationModal(false);
      setDeferRunner(null);
      setDeferComment('');
      
    } catch (error) {
      console.error('Failed to submit defer request:', error);
      alert('Failed to submit defer request. Check console for details.');
    }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Filters */}
      <div className="mb-6 sm:mb-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
              {/* Race Distance Chip */}
              <div className="relative filter-dropdown z-40">
                <button
                  onClick={() => setDistanceMenuOpen(!distanceMenuOpen)}
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

              {/* Search Bar with Autocomplete */}
              <div className="relative search-container flex-1 sm:flex-none">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
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
                  className={`bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
                    selectedRunner?.email_id === runner.email_id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleRunnerSelect(runner)}
                >
                  <div className="flex items-center justify-between">
                    {/* Left side - Avatar and basic info */}
                    <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="bg-blue-100 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold text-xs sm:text-sm">
                          {runner.runner_name ? runner.runner_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                        </span>
                      </div>
                      
                      {/* Runner info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                          <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">{runner.runner_name}</h3>
                          {/* Desktop: Show age, phone, and location */}
                          <span className="hidden sm:inline text-xs sm:text-sm text-gray-500">{runner.gender_age || 'N/A'}</span>
                          {runner.phone_no && (
                            <div className="hidden sm:flex items-center text-xs sm:text-sm text-gray-500 space-x-2">
                              <div className="flex items-center">
                                <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                                <a 
                                  href={`tel:${runner.phone_no}`}
                                  className="hover:text-blue-600 hover:underline transition-colors"
                                  title="Click to call"
                                >
                                  {runner.phone_no}
                                </a>
                              </div>
                              <a 
                                href={`https://wa.me/${runner.phone_no.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 transition-colors"
                                title="Open WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                          {/* Email - Desktop only */}
                          {runner.email_id && (
                            <div className="hidden sm:flex items-center text-xs sm:text-sm text-gray-500">
                              <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <a 
                                href={`mailto:${runner.email_id}`}
                                className="hover:text-blue-600 hover:underline transition-colors"
                                title="Send email"
                              >
                                {runner.email_id}
                              </a>
                            </div>
                          )}
                          
                          {/* Race Distance Chip */}
                          <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                            runner.race_distance === '5K' ? 'bg-green-100 text-green-700' :
                            runner.race_distance === '10K' ? 'bg-blue-100 text-blue-700' :
                            runner.race_distance === 'Half Marathon' ? 'bg-orange-100 text-orange-700' :
                            runner.race_distance === 'Full Marathon' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {runner.race_distance}
                          </span>
                          
                          {/* Location - Desktop only */}
                          {runner.location && (
                            <div className="hidden sm:flex items-center text-xs sm:text-sm text-gray-500">
                              <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              {runner.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side - Action icons */}
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2">
                      {/* Star icon (opens notes) */}
                      <button 
                        className={`p-1.5 sm:p-2 transition-colors ${runner.notes_present ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-yellow-500'}`}
                        onClick={(e) => handleStarClick(runner, e)}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                      
                      {/* More options */}
                      <div className="relative runner-menu">
                        <button 
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={(e) => toggleMenu(runner.email_id, e)}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {menuOpenFor === runner.email_id && (
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[140px] sm:min-w-[160px]">
                            <button
                              onClick={() => handleTransferRunner(runner)}
                              disabled={pendingTransfers.has(runner.email_id)}
                              className={`w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors flex items-center space-x-2 ${
                                pendingTransfers.has(runner.email_id)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              <span>{pendingTransfers.has(runner.email_id) ? 'Transfer Pending' : 'Transfer Runner'}</span>
                            </button>
                            
                            <button
                              onClick={() => handleDeferRunner(runner)}
                              disabled={pendingDefers.has(runner.email_id)}
                              className={`w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm transition-colors flex items-center space-x-2 ${
                                pendingDefers.has(runner.email_id)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{pendingDefers.has(runner.email_id) ? 'Defer Pending' : 'Defer Runner'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Chevron down */}
                      <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200 ${
                        selectedRunner?.email_id === runner.email_id ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>
                </div>

                {/* Accordion Sections - Only show when runner is selected */}
                {selectedRunner?.email_id === runner.email_id && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6 mt-4">
                    <div className="space-y-2 sm:space-y-3">
                    {/* Coach Notes */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('coachNotes')}
                        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Edit className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                          <span className="font-medium text-gray-900 text-sm sm:text-base">Coach Notes</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.coachNotes ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.coachNotes && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                          {/* Informational Message */}
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">Internal Notes Only</p>
                                <p className="text-blue-700">Coach notes are for internal purposes only. The runner cannot see these notes.</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Add Note Button */}
                          <div className="mb-4">
                            <button
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  window.dispatchEvent(new CustomEvent('addNote', { 
                                    detail: { runnerEmail: runner.email_id } 
                                  }));
                                }
                              }}
                              className="flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Add Note</span>
                            </button>
                          </div>
                          
                          {/* Notes Content */}
                          <RunnerCoachNotes runner={runner} />
                        </div>
                      )}
                    </div>

                    {/* Bio - Mobile Only */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sm:hidden">
                      <button
                        onClick={() => toggleSection('bio')}
                        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium text-gray-900 text-sm sm:text-base">Bio</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.bio ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.bio && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                          {/* Contact Information */}
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 text-sm">Contact Information</h4>
                            <div className="space-y-2">
                              {/* Age/Gender */}
                              {runner.gender_age && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span>{runner.gender_age}</span>
                                </div>
                              )}
                              
                              {/* Phone Number */}
                              {runner.phone_no && (
                                <div className="flex items-center text-sm text-gray-600 space-x-2">
                                  <div className="flex items-center">
                                    <svg className="h-4 w-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                    </svg>
                                    <a 
                                      href={`tel:${runner.phone_no}`}
                                      className="hover:text-blue-600 hover:underline transition-colors"
                                      title="Click to call"
                                    >
                                      {runner.phone_no}
                                    </a>
                                  </div>
                                  <a 
                                    href={`https://wa.me/${runner.phone_no.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 hover:text-green-700 transition-colors"
                                    title="Open WhatsApp"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                </div>
                              )}
                              
                              {/* Email */}
                              {runner.email_id && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                  <a 
                                    href={`mailto:${runner.email_id}`}
                                    className="hover:text-blue-600 hover:underline transition-colors"
                                    title="Send email"
                                  >
                                    {runner.email_id}
                                  </a>
                                </div>
                              )}
                              
                              {/* Location */}
                              {runner.location && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <svg className="h-4 w-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  <span>{runner.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Family Members */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('family')}
                        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <FamilyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                          <span className="font-medium text-gray-900 text-sm sm:text-base">Family Members</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.family ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.family && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                          <RunnerFamilyMembers runner={runner} />
                        </div>
                      )}
                    </div>

                    {/* Club History */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('clubHistory')}
                        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                          <span className="font-medium text-gray-900 text-sm sm:text-base">Club History</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.clubHistory ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.clubHistory && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                          <RunnerClubHistory runner={runner} />
                        </div>
                      )}
                    </div>

                    {/* Onboarding Survey */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('onboarding')}
                        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                          <span className="font-medium text-gray-900 text-sm sm:text-base">Onboarding Survey</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.onboarding ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.onboarding && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                          <RunnerOnboardingSurvey runner={runner} />
                        </div>
                      )}
                    </div>

                    {/* Season Metrics & Performance */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('metrics')}
                        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                          <span className="font-medium text-gray-900 text-sm sm:text-base">Season Metrics & Performance</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-transform duration-200 ${
                          expandedSections.metrics ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedSections.metrics && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                          <div className="text-gray-600">Season metrics and performance data will be displayed here.</div>
                        </div>
                      )}
                    </div>
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

      {/* Transfer Program Modal */}
      {showTransferModal && transferRunner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">Transfer Program</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-2">
                Transfer <span className="font-semibold">{transferRunner.runner_name}</span>
              </p>
              <p className="text-gray-600 mb-4">
                Current program: <span className="text-blue-600 font-medium">{transferRunner.race_distance}</span>
              </p>
              <p className="text-gray-700 mb-4">Select a new program:</p>

              {/* Program Options */}
              <div className="space-y-2 mb-6">
                {['Lite', '5K', '10K', 'Half Marathon', 'Full Marathon'].map((program) => (
                  <button
                    key={program}
                    onClick={() => handleProgramSelection(program)}
                    className={`w-full flex items-center justify-between p-3 text-left border rounded-lg transition-colors ${
                      selectedProgram === program 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <span className="font-medium">{program}</span>
                    {selectedProgram === program ? (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Selected Program Display */}
              {selectedProgram && (
                <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 mb-1">Selected Program:</p>
                  <p className="font-medium text-blue-900">{selectedProgram}</p>
                </div>
              )}

              {/* Comment Section */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={transferComment}
                  onChange={(e) => setTransferComment(e.target.value)}
                  placeholder="Add any comments about this transfer request..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferRunner(null);
                  setSelectedProgram(null);
                  setTransferComment('');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferSubmit}
                disabled={!selectedProgram}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedProgram 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Transfer Modal */}
      {showConfirmationModal && transferRunner && selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Confirm Transfer</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to transfer <span className="font-semibold">{transferRunner.runner_name}</span>?
              </p>
              
              {/* Transfer Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium text-gray-900">{transferRunner.race_distance}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium text-blue-600">{selectedProgram}</span>
                </div>
                {transferComment.trim() && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-gray-600 block mb-1">Comments:</span>
                    <span className="text-gray-900 text-sm">{transferComment}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setTransferRunner(null);
                  setSelectedProgram(null);
                  setTransferComment('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedTransfer}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defer Runner Modal */}
      {showDeferModal && deferRunner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">Defer Runner</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-2">
                Defer <span className="font-semibold">{deferRunner.runner_name}</span>
              </p>
              <p className="text-gray-600 mb-4">
                Current program: <span className="text-blue-600 font-medium">{deferRunner.race_distance}</span>
              </p>
              <p className="text-gray-700 mb-4">
                This will request to defer the runner from the current program to the next season. The request will be reviewed by the admin team.
              </p>

              {/* Comment Section */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={deferComment}
                  onChange={(e) => setDeferComment(e.target.value)}
                  placeholder="Add any comments about this defer request..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeferModal(false);
                  setDeferRunner(null);
                  setDeferComment('');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeferSubmit}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Defer Modal */}
      {showDeferConfirmationModal && deferRunner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Confirm Defer Request</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to defer <span className="font-semibold">{deferRunner.runner_name}</span>?
              </p>
              
              {/* Defer Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Runner:</span>
                  <span className="font-medium text-gray-900">{deferRunner.runner_name}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Current Program:</span>
                  <span className="font-medium text-orange-600">{deferRunner.race_distance}</span>
                </div>
                {deferComment.trim() && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-gray-600 block mb-1">Comments:</span>
                    <span className="text-gray-900 text-sm">{deferComment}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeferConfirmationModal(false);
                  setDeferRunner(null);
                  setDeferComment('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedDefer}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Confirm Defer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && notesRunner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {notesRunner.runner_name ? notesRunner.runner_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Notes for {notesRunner.runner_name}</h2>
                  <p className="text-sm text-gray-500">{notesRunner.race_distance} • {notesRunner.location}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotesRunner(null);
                  setNotesContent('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-hidden">
              <div className="h-full flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coach Notes
                </label>
                <textarea
                  value={notesContent}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Enter your notes about this runner..."
                  className="flex-1 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={10}
                />
                {notesLoading && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Saving...
                  </div>
                )}
                {notesSaved && !notesLoading && (
                  <div className="mt-2 text-green-600 text-sm font-medium">Saved</div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotesRunner(null);
                  setNotesContent('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowYourRunner; 