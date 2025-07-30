import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const RunnerClubHistory = ({ runner }) => {
  const [seasonHistory, setSeasonHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadClubHistory = async () => {
      if (!runner?.email_id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('runner_season_info')
          .select('*')
          .ilike('email_id', runner.email_id)
          .order('season', { ascending: false });
        
        if (!error && data) {
          setSeasonHistory(data);
        } else {
          setSeasonHistory([]);
        }
      } catch (error) {
        console.error('Error loading club history:', error);
        setSeasonHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadClubHistory();
  }, [runner?.email_id]);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading season history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (seasonHistory.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">No season history found</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {seasonHistory.map((season, index) => (
          <li key={`${season.season}-${index}`} className="flex justify-between items-center py-2">
            <span className="text-blue-600 font-medium">{season.season}</span>
            <span className="text-gray-500">{season.race_distance} • {season.coach}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RunnerClubHistory; 