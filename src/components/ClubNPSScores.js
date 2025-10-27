import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const ClubNPSScores = () => {
  const { user } = useAuth();
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [legendExpanded, setLegendExpanded] = useState(false);

  // Color functions (same as NPSScores)
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

  // Get unique values for dropdowns
  const seasons = [...new Set(allData.map(d => d.season))];
  const [selectedSeason, setSelectedSeason] = useState(seasons[0] || '');

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
          console.warn('v_nps_scores view not available:', error);
          setAllData([]);
        } else if (data && data.length > 0) {
          setAllData(data);
        } else {
          setAllData([]);
        }
        
      } catch (err) {
        console.error('Error loading NPS data:', err);
        setError('Failed to load NPS data');
        setAllData([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadNPSData();
  }, []);

  // Update selected season when seasons change
  useEffect(() => {
    if (seasons.length > 0 && !selectedSeason) {
      setSelectedSeason(seasons[0]);
    }
  }, [seasons, selectedSeason]);

  // Filter data by selected season
  const npsData = selectedSeason ? allData.filter(d => d.season === selectedSeason) : [];

  // Group data by program
  const groupedData = npsData.reduce((acc, item) => {
    const program = item.program || 'Unknown';
    if (!acc[program]) {
      acc[program] = [];
    }
    acc[program].push(item);
    return acc;
  }, {});

  const availablePrograms = Object.keys(groupedData);

  // Survey questions mapping
  const surveyQuestions = {
    'Feedback': 'Rate the quality and timeliness of your coach\'s feedback on Final Surge',
    'Communications': 'Rate the overall communication effectiveness of your coach with your cohort (WhatsApp, Zoom meetings, etc.)',
    'Relationship': 'Rate the relationship with your coach',
    'Recommendation': 'How likely are you to recommend your coach to a friend or colleague?',
    'RHWB Communication': 'Overall RHWB: Rate the effectiveness of group communications',
    'RHWB Knowledge': 'Overall RHWB: Rate the depth and clarity of running knowledge shared',
    'RHWB Overall NPS': 'Overall RHWB: How likely are you to recommend RHWB to a friend or colleague?'
  };

  // Tooltip component
  const Tooltip = ({ text, children }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    return (
      <div className="relative inline-block">
        <div
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {children}
        </div>
        {showTooltip && (
          <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap max-w-xs">
            {text}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    );
  };

  // MetricCard component
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
              <span className={descriptionColor}>RHWB Average:</span>
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

  // ProgramCard component
  const ProgramCard = ({ program, programData }) => {
    if (programData.length === 0) return null;

    const newRunner = programData.find(item => item.runner_status === 'New');
    const returnRunner = programData.find(item => item.runner_status === 'Return');
    const allRunner = programData.find(item => item.runner_status === 'All');

    const newResponses = programData
      .filter(item => item.runner_status === 'New')
      .reduce((sum, item) => sum + (item.total_responses || 0), 0);
    
    const returnResponses = programData
      .filter(item => item.runner_status === 'Return')
      .reduce((sum, item) => sum + (item.total_responses || 0), 0);
    
    const totalResponses = newResponses + returnResponses;

    const metrics = [
      {
        label: 'Feedback',
        newScore: newRunner?.feedback_nps || 0,
        returnScore: returnRunner?.feedback_nps || 0,
        allScore: allRunner?.feedback_nps,
        avgScore: allRunner?.avg_feedback_nps,
        borderColor: 'border-blue-500',
        question: surveyQuestions['Feedback']
      },
      {
        label: 'Communications',
        newScore: newRunner?.comms_nps || 0,
        returnScore: returnRunner?.comms_nps || 0,
        allScore: allRunner?.comms_nps,
        avgScore: allRunner?.avg_comms_nps,
        borderColor: 'border-green-500',
        question: surveyQuestions['Communications']
      },
      {
        label: 'Relationship',
        newScore: newRunner?.rel_nps || 0,
        returnScore: returnRunner?.rel_nps || 0,
        allScore: allRunner?.rel_nps,
        avgScore: allRunner?.avg_rel_nps,
        borderColor: 'border-purple-500',
        question: surveyQuestions['Relationship']
      },
      {
        label: 'Recommendation',
        newScore: newRunner?.reco_nps || 0,
        returnScore: returnRunner?.reco_nps || 0,
        allScore: allRunner?.reco_nps,
        avgScore: allRunner?.avg_reco_nps,
        borderColor: 'border-yellow-500',
        question: surveyQuestions['Recommendation']
      }
    ];

    const rhwbMetrics = [
      {
        label: 'RHWB Communication',
        newScore: newRunner?.rhwb_comms_nps || 0,
        returnScore: returnRunner?.rhwb_comms_nps || 0,
        allScore: allRunner?.rhwb_comms_nps,
        avgScore: allRunner?.avg_rhwb_comms_nps,
        borderColor: 'border-indigo-500',
        question: surveyQuestions['RHWB Communication']
      },
      {
        label: 'RHWB Knowledge',
        newScore: newRunner?.rhwb_knowledge_nps || 0,
        returnScore: returnRunner?.rhwb_knowledge_nps || 0,
        allScore: allRunner?.rhwb_knowledge_nps,
        avgScore: allRunner?.avg_rhwb_knowledge_nps,
        borderColor: 'border-pink-500',
        question: surveyQuestions['RHWB Knowledge']
      },
      {
        label: 'RHWB Overall NPS',
        newScore: newRunner?.rhwb_reco_nps || 0,
        returnScore: returnRunner?.rhwb_reco_nps || 0,
        allScore: allRunner?.rhwb_reco_nps,
        avgScore: allRunner?.avg_rhwb_reco_nps,
        borderColor: 'border-red-500',
        question: surveyQuestions['RHWB Overall NPS']
      }
    ];

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">{program}</h3>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
            {totalResponses} Responses (New {newResponses}/Return {returnResponses})
          </span>
        </div>

        {/* Coach Performance */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-700 mb-3">Coach Performance</h4>
          <div className="grid grid-cols-1 gap-4">
            {/* Recommendation - Full width */}
            <MetricCard {...metrics[3]} />
            
            {/* Feedback, Communications, Relationship - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard {...metrics[0]} />
              <MetricCard {...metrics[1]} />
              <MetricCard {...metrics[2]} />
            </div>
          </div>
        </div>

        {/* RHWB Club Performance */}
        <div>
          <h4 className="text-lg font-semibold text-gray-700 mb-3">RHWB Club Performance</h4>
          <div className="grid grid-cols-1 gap-4">
            {/* RHWB Overall NPS - Full width */}
            <MetricCard {...rhwbMetrics[2]} />
            
            {/* RHWB Communication, RHWB Knowledge - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard {...rhwbMetrics[0]} />
              <MetricCard {...rhwbMetrics[1]} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading club NPS scores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Club NPS Scores</h1>
        <p className="text-gray-600">Overall NPS scores for RHWB Club across all coaches</p>
      </div>

      {/* Season Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Season</label>
        <select
          value={selectedSeason || ''}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
      </div>

      {/* Programs */}
      {availablePrograms.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500">No NPS data available for the selected season</div>
        </div>
      ) : (
        <div className="space-y-6">
          {availablePrograms.map((program) => (
            <ProgramCard
              key={program}
              program={program}
              programData={groupedData[program]}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <button
          onClick={() => setLegendExpanded(!legendExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">Legend</h3>
          <svg
            className={`w-5 h-5 transform transition-transform ${legendExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {legendExpanded && (
          <div className="mt-4 space-y-4">
            <div className="text-sm text-gray-700">
              <p className="mb-3">
                <strong>Net Promoter Score (NPS)</strong> measures Runner satisfaction and loyalty based on survey ratings from 0-10:
              </p>
              <ul className="list-disc list-inside space-y-1 mb-4">
                <li><strong>Promoters (9-10):</strong> Highly satisfied respondents who would recommend</li>
                <li><strong>Passives (7-8):</strong> Satisfied but unenthusiastic respondents</li>
                <li><strong>Detractors (0-6):</strong> Dissatisfied respondents who may discourage others</li>
              </ul>
              <p className="mb-3">
                <strong>Formula:</strong> NPS = (% Promoters) - (% Detractors)
              </p>
              <p className="mb-4">
                NPS scores range from -100 to +100. A positive score indicates more promoters than detractors.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded bg-green-800 border border-green-900" />
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold">Score &gt; 90</div>
                    <div className="text-gray-500">Dark green card, white text</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded bg-green-200 border border-green-300" />
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold">50 ≤ Score ≤ 90</div>
                    <div className="text-gray-500">Light green card, dark text</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded bg-orange-200 border border-orange-300" />
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold">0 ≤ Score &lt; 50</div>
                    <div className="text-gray-500">Peach card, dark text</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded bg-pink-200 border border-pink-300" />
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold">-50 ≤ Score &lt; 0</div>
                    <div className="text-gray-500">Light pink card, dark text</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded bg-red-600 border border-red-700" />
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold">Score &lt; -50</div>
                    <div className="text-gray-500">Red card, white text</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubNPSScores;
