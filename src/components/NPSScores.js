import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Calendar, ChevronDown, User } from 'lucide-react';
import InsightsTable from './CoachInsights/components/InsightsTable';

export default function NPSScores() {
  const { user } = useAuth();
  
  const [userRole, setUserRole] = useState(null);
  const isAdmin = () => (userRole || '').toLowerCase() === 'admin';
  
  // Mock data for development - will be replaced with v_nps_scores data
  const mockData = [
    {
      season: "Season 13",
      season_phase: "Summer",
      program: "Pro",
      coach: "Anand Dasgupta",
      runner_status: "New",
      feedback_nps: 75,
      comms_nps: 75,
      rel_nps: 75,
      reco_nps: 75,
      rhwb_comms_nps: 50,
      rhwb_knowledge_nps: 75,
      rhwb_reco_nps: 75,
      total_responses: 4
    },
    {
      season: "Season 13",
      season_phase: "Summer",
      program: "Pro",
      coach: "Anand Dasgupta",
      runner_status: "Return",
      feedback_nps: 100,
      comms_nps: 100,
      rel_nps: 75,
      reco_nps: 100,
      rhwb_comms_nps: 75,
      rhwb_knowledge_nps: 50,
      rhwb_reco_nps: 100,
      total_responses: 4
    },
    {
      season: "Season 13",
      season_phase: "Summer",
      program: "Pro",
      coach: "Ajaykumar Jadhav",
      runner_status: "New",
      feedback_nps: 80,
      comms_nps: 80,
      rel_nps: 80,
      reco_nps: 80,
      rhwb_comms_nps: 100,
      rhwb_knowledge_nps: 100,
      rhwb_reco_nps: 100,
      total_responses: 5
    },
    {
      season: "Season 13",
      season_phase: "Summer",
      program: "Pro",
      coach: "Ajaykumar Jadhav",
      runner_status: "Return",
      feedback_nps: 87,
      comms_nps: 95.7,
      rel_nps: 95.7,
      reco_nps: 100,
      rhwb_comms_nps: 95.7,
      rhwb_knowledge_nps: 100,
      rhwb_reco_nps: 100,
      total_responses: 23
    },
    {
      season: "Season 12",
      season_phase: "Spring",
      program: "Masters",
      coach: "Anand Dasgupta",
      runner_status: "New",
      feedback_nps: 85,
      comms_nps: 90,
      rel_nps: 85,
      reco_nps: 90,
      rhwb_comms_nps: 80,
      rhwb_knowledge_nps: 85,
      rhwb_reco_nps: 90,
      total_responses: 8
    },
    {
      season: "Season 12",
      season_phase: "Spring",
      program: "Masters",
      coach: "Ajaykumar Jadhav",
      runner_status: "Return",
      feedback_nps: 92,
      comms_nps: 88,
      rel_nps: 90,
      reco_nps: 95,
      rhwb_comms_nps: 85,
      rhwb_knowledge_nps: 90,
      rhwb_reco_nps: 95,
      total_responses: 12
    }
  ];

  const [allData, setAllData] = useState(mockData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Runner Survey Results state
  const [surveyData, setSurveyData] = useState([]);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyError, setSurveyError] = useState(null);
  const [surveyFilters, setSurveyFilters] = useState({ seasonNumber: null, coachEmail: null, selectedSeason: null, selectedCoach: null });
  
  // Get unique values for dropdowns
  const seasons = [...new Set(allData.map(d => d.season))];
  const coaches = [...new Set(allData.map(d => d.coach))];
  const programs = ['Pro', 'Masters', 'Walk'];
  
  const [selectedSeason, setSelectedSeason] = useState(seasons[0] || '');
  const [selectedCoach, setSelectedCoach] = useState('');
  const [coachName, setCoachName] = useState('');
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [surveyRate, setSurveyRate] = useState(null);
  const [surveyRateLoading, setSurveyRateLoading] = useState(false);

  // Load data from v_nps_scores view
  useEffect(() => {
    const loadNPSData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to fetch from v_nps_scores view
        const { data, error } = await supabase
          .from('v_nps_scores')
          .select('*');
        
        if (error) {
          console.warn('v_nps_scores view not available, using mock data:', error);
          // Fallback to mock data if view doesn't exist
          setAllData(mockData);
        } else if (data && data.length > 0) {
          setAllData(data);
        } else {
          // No data in view, use mock data
          setAllData(mockData);
        }
        
      } catch (err) {
        console.error('Failed to load NPS data:', err);
        setError('Failed to load NPS data');
        // Fallback to mock data
        setAllData(mockData);
      } finally {
        setLoading(false);
      }
    };

    loadNPSData();
  }, []);

  // Load current coach's full name and role from v_rhwb_roles and lock coach filter to their own data if not admin
  useEffect(() => {
    const loadCoachName = async () => {
      try {
        if (!user?.email) return;
        const { data, error } = await supabase
          .from('v_rhwb_roles')
          .select('full_name, role')
          .eq('email_id', user.email.toLowerCase())
          .single();
        if (!error && data?.full_name) {
          setCoachName(data.full_name);
          if (data.role) setUserRole(data.role);
        }
      } catch (e) {
        // ignore
      }
    };
    loadCoachName();
  }, [user?.email]);

  // When not admin, force selectedCoach to user's own name (if available in options)
  useEffect(() => {
    if (!isAdmin() && coachName) {
      setSelectedCoach(coachName);
    }
  }, [coachName]);

  // Load Runner Survey Results filtered by selected season and coach
  useEffect(() => {
    const loadSurveyData = async () => {
      try {
        setSurveyLoading(true);
        setSurveyError(null);
        
        // Determine season label exactly as stored in v_survey_results (e.g., 'Season 13')
        let seasonLabel = selectedSeason || null;
        if (!seasonLabel) {
          const { data: seasonRow } = await supabase
            .from('rhwb_seasons')
            .select('season')
            .eq('current', true)
            .single();
          if (seasonRow?.season) {
            seasonLabel = `Season ${seasonRow.season}`;
          }
        }

        // Resolve coach email from selectedCoach (name) or use logged-in user's email
        // Use logged-in user's email by default; if a coach is selected in the dropdown, override
        let coachEmailFilter = user?.email?.toLowerCase() || null;
        if (selectedCoach) {
          if (selectedCoach.includes('@')) {
            coachEmailFilter = selectedCoach.toLowerCase();
          } else {
            const { data: coachRow } = await supabase
              .from('v_rhwb_roles')
              .select('email_id')
              .eq('full_name', selectedCoach)
              .single();
            coachEmailFilter = coachRow?.email_id?.toLowerCase() || coachEmailFilter;
          }
        }

        if (!seasonLabel || !coachEmailFilter) {
          setSurveyData([]);
          setSurveyLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('v_survey_results')
          .select('program, are_you_a_new_or_return_runner_to_rhwb, race_type, feedback_quality, communication, relationship, recommendation, comments, rhwb_effectiveness, rhwb_knowledge_depth, rhwb_recommendation, rhwb_comments')
          .eq('season', seasonLabel)
          .eq('coach_email', coachEmailFilter);
        
        if (error) {
          setSurveyError('Failed to load survey results');
          setSurveyData([]);
        } else {
          setSurveyData(data || []);
        }

        // Save filters used for debugging display
        setSurveyFilters({ season: seasonLabel, coachEmail: coachEmailFilter, selectedSeason, selectedCoach });
      } catch (e) {
        setSurveyError('Failed to load survey results');
        setSurveyData([]);
      } finally {
        setSurveyLoading(false);
      }
    };
    loadSurveyData();
  }, [selectedSeason, selectedCoach, user?.email]);

  // Load Survey Response Rate for selected season and coach
  useEffect(() => {
    const loadSurveyResponseRate = async () => {
      try {
        setSurveyRateLoading(true);
        setSurveyRate(null);

        const effectiveCoachLocal = isAdmin() ? (selectedCoach || coachName) : (coachName || selectedCoach);
        if (!selectedSeason || !effectiveCoachLocal) {
          setSurveyRateLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('v_survey_response_rate')
          .select('season, coach, runners_count, respondents, response_rate_percent, avg_response_rate_for_season')
          .eq('season', selectedSeason)
          .eq('coach', effectiveCoachLocal)
          .single();

        if (!error && data) {
          setSurveyRate(data);
        } else {
          setSurveyRate(null);
        }
      } catch (e) {
        setSurveyRate(null);
      } finally {
        setSurveyRateLoading(false);
      }
    };
    loadSurveyResponseRate();
  }, [selectedSeason, selectedCoach, coachName, userRole]);

  // Calculate overall averages across all coaches for the selected season and program
  const calculateOverallAverages = (program) => {
    const programData = allData.filter(d => 
      d.season === selectedSeason && 
      d.program === program
    );
    
    if (programData.length === 0) return null;
    
    return {
      feedback: Math.round(programData.reduce((sum, item) => sum + item.feedback_nps, 0) / programData.length),
      comms: Math.round(programData.reduce((sum, item) => sum + item.comms_nps, 0) / programData.length),
      rel: Math.round(programData.reduce((sum, item) => sum + item.rel_nps, 0) / programData.length),
      reco: Math.round(programData.reduce((sum, item) => sum + item.reco_nps, 0) / programData.length),
      rhwb_comms: Math.round(programData.reduce((sum, item) => sum + item.rhwb_comms_nps, 0) / programData.length),
      rhwb_knowledge: Math.round(programData.reduce((sum, item) => sum + item.rhwb_knowledge_nps, 0) / programData.length),
      rhwb_reco: Math.round(programData.reduce((sum, item) => sum + item.rhwb_reco_nps, 0) / programData.length)
    };
  };

  const ProgramCard = ({ program }) => {
    const programData = allData.filter(d => 
      d.coach === selectedCoach && 
      d.season === selectedSeason && 
      d.program === program
    );

    const overallAvg = calculateOverallAverages(program);

    if (programData.length === 0) {
      return null; // Hide the entire program section if no data
    }

    // Count only New/Return responses, exclude aggregated 'All'
    const totalResponses = programData
      .filter(item => item.runner_status === 'New' || item.runner_status === 'Return')
      .reduce((sum, item) => sum + (item.total_responses || 0), 0);
    
    // Get individual runner data
    const newRunner = programData.find(d => d.runner_status === 'New');
    const returnRunner = programData.find(d => d.runner_status === 'Return');
    const allRunner = programData.find(d => d.runner_status === 'All');
    
    // Coach Performance Metrics
    const avgFeedback = Math.round(programData.reduce((sum, item) => sum + item.feedback_nps, 0) / programData.length);
    const avgCoachComms = Math.round(programData.reduce((sum, item) => sum + item.comms_nps, 0) / programData.length);
    const avgCoachRel = Math.round(programData.reduce((sum, item) => sum + item.rel_nps, 0) / programData.length);
    const avgCoachReco = Math.round(programData.reduce((sum, item) => sum + item.reco_nps, 0) / programData.length);
    
    // RHWB Club Performance Metrics
    const avgRhwbComms = Math.round(programData.reduce((sum, item) => sum + item.rhwb_comms_nps, 0) / programData.length);
    const avgRhwbKnowledge = Math.round(programData.reduce((sum, item) => sum + item.rhwb_knowledge_nps, 0) / programData.length);
    const avgRhwbReco = Math.round(programData.reduce((sum, item) => sum + item.rhwb_reco_nps, 0) / programData.length);

    const getScoreColor = (score) => {
      if (score > 90) return 'text-white'; // White text only for dark green background
      if (score < -50) return 'text-white'; // White text only for dark red background
      return 'text-gray-700'; // Default color for other values
    };

    const getBgColor = (score) => {
      if (score > 90) return 'bg-green-800'; // Dark green background
      if (score >= 50 && score <= 90) return 'bg-green-200'; // Light mint green background
      if (score >= 0 && score < 50) return 'bg-orange-200'; // Light beige/peach background
      if (score >= -50 && score < 0) return 'bg-pink-200'; // Light pink background
      return 'bg-red-600'; // Bright red background
    };

    const getCardBgColor = (score) => {
      if (score > 90) return 'bg-green-800'; // Dark green background
      if (score >= 50 && score <= 90) return 'bg-green-100'; // Light mint green background
      if (score >= 0 && score < 50) return 'bg-orange-100'; // Light beige/peach background
      if (score >= -50 && score < 0) return 'bg-pink-100'; // Light pink background
      return 'bg-red-600'; // Bright red background
    };

    // Tooltip component for showing question text
    const Tooltip = ({ children, text }) => {
      const [show, setShow] = React.useState(false);
      return (
        <div 
          className="relative inline-block"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          {children}
          {show && text && (
            <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-pre-wrap max-w-xs">
              {text}
            </div>
          )}
        </div>
      );
    };

    const questions = {
      coach: {
        Feedback: "Rate the quality and timeliness of your coach's feedback on Final Surge",
        Communications: "Rate the overall communication effectiveness of your coach with your cohort (WhatsApp, Zoom meetings, etc.)",
        Relationship: "Rate the relationship with your coach",
        Recommendation: "How likely are you to recommend your coach to a friend or colleague?"
      },
      rhwb: {
        Communications: "Overall RHWB: Rate the effectiveness of group communications",
        Knowledge: "Overall RHWB: Rate the depth and clarity of running knowledge shared",
        Recommendation: "Overalll RHWB:  How likely are you to recommend RHWB to a friend or colleague?"
      }
    };

    const MetricCard = ({ label, newScore, returnScore, allScore, borderColor, avgScore, question }) => {
      const mainScore = typeof allScore === 'number' && !isNaN(allScore)
        ? Math.round(allScore)
        : Math.round((newScore + returnScore) / 2);
      const diff = typeof avgScore === 'number' ? mainScore - avgScore : 0;
      const isAboveAvg = diff > 0;
      
      // Determine if we should use white text for descriptions
      const useWhiteText = mainScore > 90 || mainScore < -50;
      const descriptionColor = useWhiteText ? 'text-white' : 'text-gray-700';
      
      return (
        <div className={`p-3 ${getCardBgColor(mainScore)} rounded-lg border-l-4 ${borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="flex flex-col">
                <Tooltip text={question}>
                  <div className={`text-xs ${descriptionColor} mb-1 font-medium cursor-help`}>{label}</div>
                </Tooltip>
                <Tooltip text={question}>
                  <div className={`text-3xl font-bold ${getScoreColor(mainScore)} cursor-help`}>{mainScore}</div>
                </Tooltip>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs ml-3">
              <div className="flex items-center gap-1">
                <span className={descriptionColor}>New:</span>
                <span className={`font-semibold ${getScoreColor(mainScore)}`}>{Math.round(newScore)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={descriptionColor}>Return:</span>
                <span className={`font-semibold ${getScoreColor(mainScore)}`}>{Math.round(returnScore)}</span>
              </div>
            </div>
          </div>
          
          {avgScore !== null && (
            <div className="mt-2 pt-2 border-t border-gray-300">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={descriptionColor}>vs Average:</span>
                <span className={`font-semibold ${isAboveAvg ? 'text-green-700' : 'text-red-700'}`}>
                  {isAboveAvg ? '+' : ''}{diff}
                </span>
              </div>
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`absolute h-full ${isAboveAvg ? 'bg-green-500' : 'bg-red-500'} transition-all`}
                  style={{ 
                    width: `${Math.min(Math.abs(diff) * 2, 100)}%`,
                    left: isAboveAvg ? '50%' : `${50 - Math.min(Math.abs(diff) * 2, 50)}%`
                  }}
                />
                <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-400" />
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">{program}</h3>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
            {totalResponses} responses
          </span>
        </div>

        {/* Coach Performance */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Coach Performance</h4>
          <div className="space-y-3">
            {/* Recommendation - Full width row */}
            <div className="grid grid-cols-1">
              <MetricCard 
                label="Recommendation" 
                newScore={newRunner?.reco_nps || 0}
                returnScore={returnRunner?.reco_nps || 0}
                allScore={allRunner?.reco_nps}
                borderColor="border-blue-500"
                avgScore={overallAvg?.reco}
                question={questions.coach.Recommendation}
              />
            </div>
            {/* Feedback, Communications, Relationship - 3 column row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricCard 
                label="Feedback" 
                newScore={newRunner?.feedback_nps || 0}
                returnScore={returnRunner?.feedback_nps || 0}
                allScore={allRunner?.feedback_nps}
                borderColor="border-blue-500"
                avgScore={overallAvg?.feedback}
                question={questions.coach.Feedback}
              />
              <MetricCard 
                label="Communications" 
                newScore={Math.round(newRunner?.comms_nps || 0)}
                returnScore={Math.round(returnRunner?.comms_nps || 0)}
                allScore={allRunner?.comms_nps}
                borderColor="border-blue-500"
                avgScore={overallAvg?.comms}
                question={questions.coach.Communications}
              />
              <MetricCard 
                label="Relationship" 
                newScore={Math.round(newRunner?.rel_nps || 0)}
                returnScore={Math.round(returnRunner?.rel_nps || 0)}
                allScore={allRunner?.rel_nps}
                borderColor="border-blue-500"
                avgScore={overallAvg?.rel}
                question={questions.coach.Relationship}
              />
            </div>
          </div>
        </div>

        {/* RHWB Club Performance */}
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">RHWB Club Performance</h4>
          <div className="space-y-3">
            {/* Recommendation - Full width row */}
            <div className="grid grid-cols-1">
              <MetricCard 
                label="Recommendation" 
                newScore={newRunner?.rhwb_reco_nps || 0}
                returnScore={returnRunner?.rhwb_reco_nps || 0}
                allScore={allRunner?.rhwb_reco_nps}
                borderColor="border-purple-500"
                avgScore={overallAvg?.rhwb_reco}
                question={questions.rhwb.Recommendation}
              />
            </div>
            {/* Communications and Knowledge - 2 column row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MetricCard 
                label="Communications" 
                newScore={Math.round(newRunner?.rhwb_comms_nps || 0)}
                returnScore={Math.round(returnRunner?.rhwb_comms_nps || 0)}
                allScore={allRunner?.rhwb_comms_nps}
                borderColor="border-purple-500"
                avgScore={overallAvg?.rhwb_comms}
                question={questions.rhwb.Communications}
              />
              <MetricCard 
                label="Knowledge" 
                newScore={newRunner?.rhwb_knowledge_nps || 0}
                returnScore={returnRunner?.rhwb_knowledge_nps || 0}
                allScore={allRunner?.rhwb_knowledge_nps}
                borderColor="border-purple-500"
                avgScore={overallAvg?.rhwb_knowledge}
                question={questions.rhwb.Knowledge}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const effectiveCoach = isAdmin() ? selectedCoach : (coachName || selectedCoach);
  const data = allData.filter(d => d.coach === effectiveCoach && d.season === selectedSeason);
  const seasonPhase = data.length > 0 ? data[0].season_phase : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading NPS data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading NPS data</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section styled like Coach Insights */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 space-y-3 sm:space-y-0">
              {/* Title */}
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">NPS Scores</h1>
                  <p className="text-sm text-gray-600 mt-1">Coach and club satisfaction metrics</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                {/* Season */}
                <div className="relative">
                  <label htmlFor="season-select" className="sr-only">Select Season</label>
                  <div className="relative">
                    <select
                      id="season-select"
                      value={selectedSeason || ''}
                      onChange={(e) => setSelectedSeason(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg pl-10 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[160px]"
                    >
                      {seasons.map(season => (
                        <option key={season} value={season}>{season}</option>
                      ))}
                    </select>
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Coach - Admin only */}
                {isAdmin() && (
                  <div className="relative">
                    <label htmlFor="coach-select" className="sr-only">Select Coach</label>
                    <div className="relative">
                      <select
                        id="coach-select"
                        value={selectedCoach || ''}
                        onChange={(e) => setSelectedCoach(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 rounded-lg pl-10 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                      >
                        {coaches.map(coach => (
                          <option key={coach} value={coach}>{coach}</option>
                        ))}
                      </select>
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Programs Side by Side */}
        <div className="mb-6">
          {(() => {
            const availablePrograms = programs.filter(program => {
              const programData = allData.filter(d => 
                d.coach === effectiveCoach && 
                d.season === selectedSeason && 
                d.program === program
              );
              return programData.length > 0;
            });

            if (availablePrograms.length === 0) {
              return (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No NPS Data Available</h3>
                  <p className="text-gray-600">No NPS data found for the selected season and coach combination.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-6">
                {availablePrograms.map(program => (
                  <ProgramCard key={program} program={program} />
                ))}
              </div>
            );
          })()}
        </div>
        {/* Legend - Collapsible Accordion */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-md">
            <button
              onClick={() => setLegendExpanded(!legendExpanded)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <h4 className="text-lg font-semibold text-gray-900">Legend</h4>
              <ChevronDown 
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  legendExpanded ? 'rotate-180' : ''
                }`} 
              />
            </button>
            {legendExpanded && (
              <div className="px-6 pb-6 border-t border-gray-200">
                <div className="mb-4 text-sm text-gray-700 space-y-2">
                  <p>
                    <span className="font-semibold">Net Promoter Score (NPS)</span> measures Runner satisfaction and loyalty based on survey ratings from 0-10:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <span className="font-medium">Promoters (9-10)</span>: Highly satisfied respondents who would recommend
                    </li>
                    <li>
                      <span className="font-medium">Passives (7-8)</span>: Satisfied but unenthusiastic respondents
                    </li>
                    <li>
                      <span className="font-medium">Detractors (0-6)</span>: Dissatisfied respondents who may discourage others
                    </li>
                  </ul>
                  <p>
                    <span className="font-medium">Formula:</span> NPS = (% Promoters) - (% Detractors)
                  </p>
                  <p>
                    NPS scores range from -100 to +100. A positive score indicates more promoters than detractors.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded bg-green-800 border border-green-900" />
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">Score ≥ 90</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded bg-green-200 border border-green-300" />
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">50 ≤ Score ≤ 90</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded bg-orange-200 border border-orange-300" />
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">0 ≤ Score &lt; 50</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded bg-pink-200 border border-pink-300" />
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">-50 ≤ Score &lt; 0</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded bg-red-600 border border-red-700" />
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">Score &lt; -50</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-2 rounded bg-green-500" />
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">vs Average Bar (Green)</div>
                      <div className="text-gray-500">Your performance is better than your peers.</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-2 rounded bg-red-500" />
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">vs Average Bar (Red)</div>
                      <div className="text-gray-500">Your performance falls short compared to your peers.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Survey Response Rate (moved below Legend) */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Survey Response Rate</h3>
            {surveyRateLoading ? (
              <div className="py-6 text-center text-gray-500 text-sm">Loading...</div>
            ) : surveyRate ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border" title="Percentage of your cohort responded to the survey">
                  <div className="text-xs text-gray-600 mb-1">Response Rate</div>
                  <div className="text-3xl font-bold text-gray-800">{Math.round(surveyRate.response_rate_percent)}%</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border" title="Average Response Rate across all coaches this season">
                  <div className="text-xs text-gray-600 mb-1">Season Average</div>
                  <div className="text-3xl font-bold text-gray-800">{Math.round(surveyRate.avg_response_rate_for_season)}%</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border" title="No of respondents compared to total no of runners in your cohort">
                  <div className="text-xs text-gray-600 mb-1">Respondents / Total Runners</div>
                  <div className="text-3xl font-bold text-gray-800">{surveyRate.respondents} / {surveyRate.runners_count}</div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500 text-sm">No response rate data available for the selected filters.</div>
            )}
          </div>
        </div>
        {/* Runner Survey Results moved from Coach Insights */}
        <div className="mt-8">
          {/* Debug filters removed per request */}
          <InsightsTable tableData={surveyData} loading={surveyLoading} error={surveyError} />
        </div>
      </div>
    </div>
  );
}
