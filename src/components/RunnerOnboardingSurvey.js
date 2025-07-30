import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const RunnerOnboardingSurvey = ({ runner }) => {
  const [surveyData, setSurveyData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load survey data when component mounts
  useEffect(() => {
    const loadSurveyData = async () => {
      if (!runner?.email_id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('v_fs_survey')
          .select('name, email_id, "Full Question", answer')
          .ilike('email_id', runner.email_id)
          .order('"Full Question"');
        
        if (!error && data) {
          setSurveyData(data);
        } else {
          setSurveyData([]);
        }
      } catch (error) {
        console.error('Error loading survey data:', error);
        setSurveyData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSurveyData();
  }, [runner?.email_id]);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading survey data...</p>
      </div>
    );
  }

  if (surveyData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No survey data available for this runner.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-indigo-100 rounded flex items-center justify-center">
              <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Onboarding Survey</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {surveyData.map((item, index) => {
          // Skip empty questions
          if (!item['Full Question'] || item['Full Question'].trim() === '') {
            return null;
          }

          // Format the question text (remove truncation indicators)
          let questionText = item['Full Question'];
          if (questionText.includes('...')) {
            questionText = questionText.split('...')[0];
          }

          // Format the answer
          let answerText = item.answer || '-';
          if (answerText === '-' || answerText === 'N/A' || answerText === '') {
            answerText = '-';
          }

          return (
            <div key={index} className="space-y-2">
              <div className="font-medium text-gray-900 text-sm">
                {questionText}
              </div>
              <div className="text-gray-700 text-sm">
                {answerText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RunnerOnboardingSurvey; 