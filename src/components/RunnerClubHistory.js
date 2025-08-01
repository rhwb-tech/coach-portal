import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const RunnerClubHistory = ({ runner }) => {
  const [seasonHistory, setSeasonHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error] = useState(null);

  useEffect(() => {
    const loadClubHistory = async () => {
      if (!runner?.email_id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('runner_season_info')
          .select('*')
          .ilike('email_id', runner.email_id);
        
        if (!error && data) {
          console.log('Raw club history data:', data);
          
          // Sort by season in descending order (newest first)
          const sortedData = data.sort((a, b) => {
            // Extract numeric part from season (handle cases like "Season 14", "14", etc.)
            const getSeasonNumber = (seasonStr) => {
              if (!seasonStr) return 0;
              const match = seasonStr.toString().match(/\d+/);
              return match ? parseInt(match[0]) : 0;
            };
            
            const seasonA = getSeasonNumber(a.season);
            const seasonB = getSeasonNumber(b.season);
            
            console.log(`Comparing seasons: ${a.season}(${seasonA}) vs ${b.season}(${seasonB})`);
            
            return seasonB - seasonA; // Descending order (newest first)
          });
          
          console.log('Sorted club history data:', sortedData);
          setSeasonHistory(sortedData);
        } else {
          console.log('No data found or error:', error);
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
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-700">Season History (Newest First)</h3>
      </div>
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