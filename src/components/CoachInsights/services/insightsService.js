import { supabase } from '../../../services/supabaseClient';
import { getAllChartConfigs, getTableConfig } from './chartConfigs';
import { transformDataForChart } from '../utils/chartHelpers';

/**
 * Coach Insights Data Service
 * Handles all data fetching and processing for the Coach Insights dashboard
 */

class InsightsService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get cache key for a query
   */
  getCacheKey(coachEmail, seasonId, queryType) {
    return `${coachEmail}_${seasonId}_${queryType}`;
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(cacheEntry) {
    if (!cacheEntry) return false;
    return Date.now() - cacheEntry.timestamp < this.cacheDuration;
  }

  /**
   * Execute SQL query with parameters
   */
  async executeQuery(sql, params = []) {
    try {
      // Execute the actual database query using Supabase
      if (sql.includes('cumulative_score') && sql.includes('rhwb_meso_scores')) {
        const [seasonName, coachFilter] = params;
        
        try {
          // Use direct query on rhwb_meso_scores table
          const { data, error } = await supabase
            .from('rhwb_meso_scores')
            .select('coach, full_name, cumulative_score')
            .eq('season', seasonName)
            .eq('category', 'Personal')
            .ilike('coach', coachFilter)
            .order('cumulative_score', { ascending: false });

          if (error) {
            throw error;
          }

          // Transform the data to match expected structure (implement initcap)
          const transformedData = data?.map(item => ({
            coach: item.coach,
            runner_name: item.full_name.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' '), // Implement initcap functionality
            cumulative_score: item.cumulative_score
          })) || [];

          return transformedData;
        } catch (directError) {          
          // Fallback: try RPC function if it exists
          try {
            const { data, error } = await supabase.rpc('get_cumulative_scores_simple', {
              season_name: seasonName,
              coach_filter: coachFilter
            });

            if (error) throw error;
            return data || [];
          } catch (rpcError) {
            throw rpcError;
          }
        }
      }

      // Handle mesocycleProgress query - use dedicated RPC function
      if (sql.includes('rhwb_coach_input') && sql.includes('meso') && sql.includes('avg_score')) {
        const [coachEmail, seasonName] = params;
        
        console.log('🔍 MESOCYCLE_DEBUG - Using database RPC for mesocycle aggregation');
        console.log('🔍 MESOCYCLE_DEBUG - Coach Email:', coachEmail);
        console.log('🔍 MESOCYCLE_DEBUG - Season Name:', seasonName);
        
        try {
          // Use dedicated RPC function for mesocycle progress data
          const { data, error } = await supabase.rpc('get_mesocycle_progress', {
            coach_email_param: coachEmail,
            season_param: seasonName
          });

          if (error) {
            console.log('🔍 MESOCYCLE_DEBUG - RPC error:', error);
            throw error;
          }

          console.log('🔍 MESOCYCLE_DEBUG - Database result:', data);
          return data || [];

        } catch (rpcError) {
          console.log('🔍 MESOCYCLE_DEBUG - RPC function not available, using fallback');
          // If RPC doesn't exist, provide instructions to create it
          throw new Error(`Database RPC function 'get_mesocycle_progress' not found. Please create this function in your database.`);
        }
      }

      // For other queries, fall back to mock data for now
      return this.getMockData(sql, params);

    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  /**
   * Mock data provider (replace with actual Supabase queries in production)
   */
  getMockData(sql, params) {
    const [seasonName, coachFilter] = params || [];

    // Determine which query based on SQL content
    if (sql.includes('cumulative_score') && sql.includes('rhwb_meso_scores')) {
      return [
        { coach_email_id: 'coach@rhwb.org', runner_name: 'John Smith', cumulative_score: 85.5 },
        { coach_email_id: 'coach@rhwb.org', runner_name: 'Jane Doe', cumulative_score: 92.3 },
        { coach_email_id: 'coach@rhwb.org', runner_name: 'Mike Johnson', cumulative_score: 78.9 },
        { coach_email_id: 'coach@rhwb.org', runner_name: 'Sarah Wilson', cumulative_score: 96.1 },
        { coach_email_id: 'coach@rhwb.org', runner_name: 'Tom Brown', cumulative_score: 73.2 },
        { coach_email_id: 'coach@rhwb.org', runner_name: 'Lisa Davis', cumulative_score: 88.7 },
        { coach_email_id: 'coach@rhwb.org', runner_name: 'David Lee', cumulative_score: 82.4 },
        { coach_email_id: 'coach@rhwb.org', runner_name: 'Emily Chen', cumulative_score: 90.8 }
      ];
    }

    if (sql.includes('meso') && sql.includes('avg_score')) {
      return [
        { meso: 1, athlete_count: 25, avg_score: 3.8 },
        { meso: 2, athlete_count: 23, avg_score: 4.1 },
        { meso: 3, athlete_count: 22, avg_score: 3.9 },
        { meso: 4, athlete_count: 24, avg_score: 4.2 },
        { meso: 5, athlete_count: 21, avg_score: 3.7 },
        { meso: 6, athlete_count: 26, avg_score: 4.0 }
      ];
    }

    if (sql.includes('race_distance')) {
      return [
        { race_distance: '5K', athlete_count: 8 },
        { race_distance: '10K', athlete_count: 12 },
        { race_distance: 'Half Marathon', athlete_count: 18 },
        { race_distance: 'Marathon', athlete_count: 15 }
      ];
    }

    if (sql.includes('Strength Training')) {
      return [
        { category: 'Strength Training', completion_rate: 78.5 },
        { category: 'Mileage', completion_rate: 85.2 }
      ];
    }

    // Table data
    if (sql.includes('runner_name') && sql.includes('race_distance') && sql.includes('meso')) {
      return [
        {
          runner_name: 'John Smith',
          race_distance: 'Marathon',
          meso: 3,
          planned_strength_trains: 12,
          completed_strength_trains: 10,
          planned_distance: 45.0,
          completed_distance: 38.5,
          completion_rate: 85.5,
          final_score: 3.8,
          meso_qual_score: 'Strong endurance, needs strength work',
          season_phase: 'Build'
        },
        {
          runner_name: 'Jane Doe',
          race_distance: 'Half Marathon',
          meso: 4,
          planned_strength_trains: 8,
          completed_strength_trains: 8,
          planned_distance: 30.0,
          completed_distance: 28.2,
          completion_rate: 92.3,
          final_score: 4.1,
          meso_qual_score: 'Excellent progress across all areas',
          season_phase: 'Peak'
        },
        {
          runner_name: 'Mike Johnson',
          race_distance: '10K',
          meso: 2,
          planned_strength_trains: 6,
          completed_strength_trains: 5,
          planned_distance: 25.0,
          completed_distance: 19.8,
          completion_rate: 78.9,
          final_score: 3.5,
          meso_qual_score: 'Good speed work, missed some runs',
          season_phase: 'Base'
        }
      ];
    }

    return [];
  }

  /**
   * Fetch data for a specific chart
   */
  async fetchChartData(chartId, coachEmail, seasonId, seasonNumber = null, selectedCoach = null, availableCoaches = []) {
    try {
      const cacheKey = this.getCacheKey(coachEmail, seasonId, `chart_${chartId}`);
      const cachedData = this.cache.get(cacheKey);

      // Return cached data if valid
      if (this.isCacheValid(cachedData)) {
        return cachedData.data;
      }

      const configs = getAllChartConfigs();
      const config = configs.find(c => c.id === chartId);

      if (!config) {
        throw new Error(`Chart config not found for ID: ${chartId}`);
      }

      // For queries that need Season format, detect and handle appropriately
      let params;
      if (config.sql.includes('cumulative_score') && config.sql.includes('rhwb_meso_scores')) {
        // Use seasonNumber as-is since it comes from the database already formatted
        let seasonName = seasonNumber;
        
        // Extract coach name from selectedCoach or use coachEmail
        let coachFilter = '%'; // default wildcard
        if (selectedCoach && availableCoaches.length > 0) {
          // Find the coach name from availableCoaches using the selectedCoach email
          const selectedCoachData = availableCoaches.find(c => c.coach_email_id === selectedCoach);
          if (selectedCoachData && selectedCoachData.coach) {
            coachFilter = `%${selectedCoachData.coach}%`;
          } else {
            // Fallback: extract username from email
            coachFilter = `%${selectedCoach.split('@')[0]}%`;
          }
        } else if (coachEmail) {
          coachFilter = `%${coachEmail.split('@')[0]}%`; // Use current coach email
        }
        
        
        params = [seasonName, coachFilter];
      } else if (config.id === 'mesocycleProgress') {
        // Use seasonNumber as-is since it comes from the database already formatted
        let seasonName = seasonNumber;
        params = [coachEmail, seasonName];
      } else {
        // Legacy format for other queries
        params = [coachEmail, seasonId];
      }

      // Execute the SQL query
      const rawData = await this.executeQuery(config.sql, params);

      // Transform data using config's transform function
      const transformedData = transformDataForChart(rawData, config);

      // Cache the result
      this.cache.set(cacheKey, {
        data: transformedData,
        timestamp: Date.now()
      });

      return transformedData;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch data for all charts
   */
  async fetchAllChartsData(coachEmail, seasonId, seasonNumber = null, selectedCoach = null, availableCoaches = []) {
    try {
      const configs = getAllChartConfigs();
      const results = {};

      // Fetch data for each chart in parallel
      const promises = configs.map(async (config) => {
        try {
          const data = await this.fetchChartData(config.id, coachEmail, seasonId, seasonNumber, selectedCoach, availableCoaches);
          results[config.id] = {
            data,
            error: null,
            config
          };
        } catch (error) {
          results[config.id] = {
            data: null,
            error: error.message,
            config
          };
        }
      });

      await Promise.all(promises);
      return results;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch table data
   */
  async fetchTableData(coachEmail, seasonId) {
    try {
      const cacheKey = this.getCacheKey(coachEmail, seasonId, 'table');
      const cachedData = this.cache.get(cacheKey);

      // Return cached data if valid
      if (this.isCacheValid(cachedData)) {
        return cachedData.data;
      }

      const tableConfig = getTableConfig();
      
      // Execute the SQL query
      const rawData = await this.executeQuery(tableConfig.sql, [coachEmail, seasonId]);

      // Cache the result
      this.cache.set(cacheKey, {
        data: rawData,
        timestamp: Date.now()
      });

      return rawData;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch all insights data (charts + table)
   */
  async fetchAllInsightsData(coachEmail, seasonId, seasonNumber = null, selectedCoach = null, availableCoaches = []) {
    try {
      const [chartsData, tableData] = await Promise.all([
        this.fetchAllChartsData(coachEmail, seasonId, seasonNumber, selectedCoach, availableCoaches),
        this.fetchTableData(coachEmail, seasonId)
      ]);

      return {
        charts: chartsData,
        table: tableData
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Clear cache for specific coach/season
   */
  clearCache(coachEmail, seasonId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${coachEmail}_${seasonId}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cache.size;
    let valid = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (this.isCacheValid(entry)) {
        valid++;
      } else {
        expired++;
      }
    }

    return { total, valid, expired };
  }
}

// Create and export singleton instance
const insightsService = new InsightsService();
export default insightsService;