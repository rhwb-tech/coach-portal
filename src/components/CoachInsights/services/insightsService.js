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
    this.cacheDuration = 2 * 60 * 1000; // Reduced to 2 minutes cache
    this.pendingRequests = new Map(); // Track pending requests for cancellation
    this.debounceTimers = new Map(); // Track debounce timers
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
      if (sql.includes('cumulative_score') && sql.includes('v_rhwb_meso_scores')) {
        const [seasonName, coachEmailId, selectedMeso] = params;
        
        
        try {
          // Use direct query on v_rhwb_meso_scores table 
          // The view should already contain coach information
          let query = supabase
            .from('v_rhwb_meso_scores')
            .select('coach, full_name, cumulative_score')
            .eq('season', seasonName)
            .eq('category', 'Personal')
            .eq('coach_email', coachEmailId); // Assuming v_rhwb_meso_scores has coach_email column
          
          // Add meso filter only if selectedMeso is provided
          if (selectedMeso) {
            query = query.eq('meso', selectedMeso);
          }
          
          const { data, error } = await query.order('cumulative_score', { ascending: false });


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
          // If coach_email column doesn't exist, try filtering by coach name instead
          try {
            let query = supabase
              .from('v_rhwb_meso_scores')
              .select('coach, full_name, cumulative_score')
              .eq('season', seasonName)
              .eq('category', 'Personal')
              .ilike('coach', `%${coachEmailId.split('@')[0]}%`); // Use email username to match coach
            
            // Add meso filter only if selectedMeso is provided
            if (selectedMeso) {
              query = query.eq('meso', selectedMeso);
            }
            
            const { data, error } = await query.order('cumulative_score', { ascending: false });

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
            
          } catch (nameFilterError) {
            throw nameFilterError;
          }
        }
      }

      // Handle mesocycleProgress query - use dedicated RPC function
      if (sql.includes('rhwb_coach_input') && sql.includes('meso') && sql.includes('avg_score')) {
        const [coachEmail, seasonName] = params; // Don't use meso filter for progress chart
        
        
        try {
          // Use dedicated RPC function for mesocycle progress data - no meso filtering
          const { data, error } = await supabase.rpc('get_mesocycle_progress', {
            coach_email_param: coachEmail,
            season_param: seasonName
          });

          if (error) {
            throw error;
          }

          return data || [];

        } catch (rpcError) {
          // If RPC doesn't exist, provide instructions to create it
          throw new Error(`Database RPC function 'get_mesocycle_progress' not found. Please create this function in your database.`);
        }
      }

      // Handle coach_metrics queries (feedback ratio)
      if (sql.includes('coach_metrics')) {
        
        try {
          let query = supabase.from('coach_metrics');
          
          // Determine if this is the main query or average query based on SQL
          if (sql.includes('email_id AS coach_email')) {
            // Main coach feedback ratio query: season, coach_email, meso
            const [seasonParam, coachEmailParam, mesoParam] = params;
            
            query = query.select('season, coach, email_id, meso, runs_with_comments, runs_with_no_comments')
              .eq('season', seasonParam)
              .eq('email_id', coachEmailParam);
              
            if (mesoParam) {
              query = query.eq('meso', mesoParam);
            }
          } else {
            // Average query: season, meso
            const [seasonParam, mesoParam] = params;
            
            query = query.select('runs_with_comments, runs_with_no_comments')
              .eq('season', seasonParam);
              
            if (mesoParam) {
              query = query.eq('meso', mesoParam);
            }
          }
          
          const { data, error } = await query;
          
          if (error) {
            throw error;
          }
          
          
          // Transform data based on query type
          if (sql.includes('email_id AS coach_email')) {
            // Main query - calculate feedback ratio for each row
            return data.map(row => ({
              ...row,
              coach_email: row.email_id,
              feedback_ratio: (row.runs_with_comments / Math.max(row.runs_with_comments + row.runs_with_no_comments, 1)) * 100
            }));
          } else {
            // Average query - calculate overall average
            const totalWithComments = data.reduce((sum, row) => sum + (row.runs_with_comments || 0), 0);
            const totalWithoutComments = data.reduce((sum, row) => sum + (row.runs_with_no_comments || 0), 0);
            const totalRuns = totalWithComments + totalWithoutComments;
            const avgRatio = totalRuns > 0 ? (totalWithComments / totalRuns) * 100 : 0;
            
            return [{
              total_avg_feedback_ratio: avgRatio,
              target_ratio: 80
            }];
          }
          
        } catch (queryError) {
          throw queryError;
        }
      }

      // Handle coach_rlb queries (runners left behind)
      if (sql.includes('coach_rlb')) {
        
        try {
          const [seasonParam, coachEmailParam, mesoParam] = params;
          
          let query = supabase.from('coach_rlb')
            .select('runner_name')
            .eq('season', seasonParam)
            .eq('coach_email', coachEmailParam);
            
          if (mesoParam) {
            query = query.eq('meso', mesoParam);
          }
          
          const { data, error } = await query;
          
          if (error) {
            throw error;
          }
          
          return data || [];
          
        } catch (queryError) {
          throw queryError;
        }
      }

      // Handle comment categories queries from v_comment_categories view
      if (sql.includes('v_comment_categories')) {
        
        try {
          const [seasonParam, coachEmailParam, mesoParam] = params;
          
          // Query comment categories view with all filters
          let query = supabase
            .from('v_comment_categories')
            .select('category, comment_text')
            .eq('season', seasonParam)
            .eq('coach_email', coachEmailParam)
            .not('category', 'is', null);
            
          // Add meso filter if provided
          if (mesoParam) {
            query = query.eq('meso', mesoParam);
          }
          
          const { data, error } = await query;
          
          if (error) {
            throw error;
          }
          
          // Group comments by category and count them
          const categoryData = {};
          data.forEach(row => {
            if (!categoryData[row.category]) {
              categoryData[row.category] = {
                category: row.category,
                count: 0,
                comments: []
              };
            }
            categoryData[row.category].count += 1;
            categoryData[row.category].comments.push(row.comment_text);
          });
          
          // Convert to array format expected by chart
          const result = Object.values(categoryData).map(item => ({
            category: item.category,
            count: item.count,
            comments: item.comments
          }));
          
          
          return result;
          
        } catch (queryError) {
          throw queryError;
        }
      }

      // Handle pulse interactions queries
      if (sql.includes('v_pulse_interactions')) {
        
        try {
          // Check if this is the average query or main query
          if (sql.includes('AVG(interaction_count)')) {
            // Average query: only season parameter
            const [seasonParam] = params;
            
            const { data, error } = await supabase
              .from('v_pulse_interactions')
              .select('interaction_count')
              .eq('season', seasonParam)
              .eq('interaction', 'Accessed');
            
            if (error) {
              throw error;
            }
            
            // Calculate average manually
            const counts = data.map(row => parseInt(row.interaction_count) || 0);
            const average = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
            
            return [{ avg_accessed: average }];
            
          } else {
            // Main query: season and coach email parameters
            const [seasonParam, coachEmailParam] = params;
            
            const { data, error } = await supabase
              .from('v_pulse_interactions')
              .select('season, coach, coach_email, interaction, interaction_count')
              .eq('season', seasonParam)
              .eq('coach_email', coachEmailParam)
              .eq('interaction', 'Accessed');
            
            if (error) {
              throw error;
            }
            
            return data || [];
          }
          
        } catch (queryError) {
          throw queryError;
        }
      }

      // Handle other queries that support meso filtering
      if (sql.includes('rhwb_coach_input') && params.length >= 3) {
        const [coachEmail, seasonParam, selectedMeso] = params;
        
        
        try {
          // Build the base query conditions
          let query = supabase.from('rhwb_coach_input').select('*');
          
          // Add coach email filter
          query = query.eq('coach_email', coachEmail);
          
          // Add season filter - determine if it's season ID or season name
          if (typeof seasonParam === 'string' && seasonParam.startsWith('Season')) {
            query = query.eq('season', seasonParam);
          } else {
            query = query.eq('season_id', seasonParam);
          }
          
          // Add meso filter if provided
          if (selectedMeso) {
            query = query.eq('meso', selectedMeso);
          }
          
          const { data, error } = await query;
          
          if (error) {
            throw error;
          }
          
          return data || [];
          
        } catch (queryError) {
          // Fall back to mock data if query fails
          return this.getMockData(sql, params);
        }
      }

      // Handle v_survey_results queries
      if (sql.includes('v_survey_results')) {
        
        try {
          const [seasonParam, coachEmailParam] = params;
          
          let query = supabase.from('v_survey_results')
            .select('program, are_you_a_new_or_return_runner_to_rhwb, race_type, feedback_quality, communication, relationship, recommendation, comments, rhwb_effectiveness, rhwb_knowledge_depth, rhwb_recommendation, rhwb_comments')
            .eq('season', seasonParam)
            .eq('coach_email', coachEmailParam);
          
          const { data, error } = await query;
          
          
          if (error) {
            console.error('Debug: Supabase query error:', error);
            throw error;
          }
          
          return data || [];
          
        } catch (queryError) {
          console.error('Debug: v_survey_results query exception:', queryError);
          throw queryError;
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
    const [seasonName] = params || [];

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

    if (sql.includes('coach_rlb')) {
      return [
        { runner_name: 'John Smith' },
        { runner_name: 'Sarah Johnson' },
        { runner_name: 'Mike Davis' }
      ];
    }

    if (sql.includes('v_survey_results')) {
      return [
        {
          program: 'Marathon Training',
          are_you_a_new_or_return_runner_to_rhwb: 'Return Runner',
          race_type: 'Marathon',
          feedback_quality: 'Excellent',
          communication: 'Very Good',
          relationship: 'Excellent',
          recommendation: 'Definitely',
          comments: 'Great coaching, very helpful feedback on my runs.',
          rhwb_effectiveness: 'Very Effective',
          rhwb_knowledge_depth: 'Excellent',
          rhwb_recommendation: 'Highly Recommend',
          rhwb_comments: 'RHWB has been instrumental in my running journey.'
        },
        {
          program: 'Half Marathon Training',
          are_you_a_new_or_return_runner_to_rhwb: 'New Runner',
          race_type: 'Half Marathon',
          feedback_quality: 'Excellent',
          communication: 'Excellent',
          relationship: 'Very Good',
          recommendation: 'Definitely',
          comments: 'Love the detailed training plans and quick responses.',
          rhwb_effectiveness: 'Excellent',
          rhwb_knowledge_depth: 'Very Good',
          rhwb_recommendation: 'Highly Recommend',
          rhwb_comments: 'Great program for beginners like me.'
        },
        {
          program: '10K Training',
          are_you_a_new_or_return_runner_to_rhwb: 'Return Runner',
          race_type: '10K',
          feedback_quality: 'Good',
          communication: 'Good',
          relationship: 'Good',
          recommendation: 'Maybe',
          comments: 'Good coaching but would like more frequent check-ins.',
          rhwb_effectiveness: 'Good',
          rhwb_knowledge_depth: 'Good',
          rhwb_recommendation: 'Recommend',
          rhwb_comments: 'Good program overall, room for improvement in communication.'
        },
        {
          program: 'Marathon Training',
          are_you_a_new_or_return_runner_to_rhwb: 'Return Runner',
          race_type: 'Marathon',
          feedback_quality: 'Excellent',
          communication: 'Excellent',
          relationship: 'Excellent',
          recommendation: 'Definitely',
          comments: 'Excellent support throughout my training cycle.',
          rhwb_effectiveness: 'Excellent',
          rhwb_knowledge_depth: 'Excellent',
          rhwb_recommendation: 'Highly Recommend',
          rhwb_comments: 'Outstanding program with knowledgeable coaches.'
        }
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
   * Debounced query execution to prevent excessive API calls
   */
  async executeQueryWithDebounce(sql, params = [], debounceMs = 500) {
    const queryKey = `${sql}_${JSON.stringify(params)}`;
    
    // Clear existing timer
    if (this.debounceTimers.has(queryKey)) {
      clearTimeout(this.debounceTimers.get(queryKey));
    }
    
    // Cancel pending request if exists
    if (this.pendingRequests.has(queryKey)) {
      this.pendingRequests.get(queryKey).abort();
      this.pendingRequests.delete(queryKey);
    }
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        try {
          const abortController = new AbortController();
          this.pendingRequests.set(queryKey, abortController);
          
          const result = await this.executeQuery(sql, params);
          this.pendingRequests.delete(queryKey);
          resolve(result);
        } catch (error) {
          this.pendingRequests.delete(queryKey);
          reject(error);
        }
      }, debounceMs);
      
      this.debounceTimers.set(queryKey, timer);
    });
  }

  /**
   * Fetch data for a specific chart
   */
  async fetchChartData(chartId, coachEmail, seasonId, seasonNumber = null, selectedCoach = null, availableCoaches = [], selectedMeso = null) {
    try {
      const cacheKey = this.getCacheKey(coachEmail, seasonId, `chart_${chartId}_meso_${selectedMeso || 'all'}`);
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
        
        // Use coach email ID directly since SQL expects b.email_id = $2
        let coachEmailId = coachEmail; // default to current coach email
        if (selectedCoach && availableCoaches.length > 0) {
          // selectedCoach is the coach_email_id from the dropdown
          coachEmailId = selectedCoach;
        }
        
        // Include meso parameter for athleteCompletion chart
        params = [seasonName, coachEmailId, selectedMeso];
        
      } else if (config.id === 'mesocycleProgress') {
        // Use seasonNumber as-is since it comes from the database already formatted
        let seasonName = seasonNumber;
        params = [coachEmail, seasonName];
      } else if (config.id === 'feedbackRatio') {
        // Feedback ratio needs season number, coach email, and meso
        let seasonName = seasonNumber || seasonId;
        params = [seasonName, coachEmail, selectedMeso];
      } else if (config.id === 'runnersLeftBehind') {
        // Runners left behind needs season number, coach email, and meso
        let seasonName = seasonNumber || seasonId;
        params = [seasonName, coachEmail, selectedMeso];
      } else if (config.id === 'commentCategories') {
        // Comment categories needs season, coach email, and meso
        let seasonName = seasonNumber || seasonId;
        params = [seasonName, coachEmail, selectedMeso];
      } else if (config.id === 'pulseInteractions') {
        // Pulse interactions needs season and coach email
        let seasonName = seasonNumber || seasonId;
        params = [seasonName, coachEmail];
      } else {
        // Legacy format for other queries  
        params = [coachEmail, seasonId];
      }

      // Add meso filtering for queries that support it (but exclude mesocycleProgress, athleteCompletion, feedbackRatio, and runnersLeftBehind)
      if (selectedMeso && (config.sql.includes('rhwb_coach_input') || config.sql.includes('coach_metrics')) && config.id !== 'mesocycleProgress' && config.id !== 'athleteCompletion' && config.id !== 'feedbackRatio' && config.id !== 'runnersLeftBehind') {
        // We need to modify the query to include meso filtering
        // This will be handled in the executeQuery method
        params.push(selectedMeso);
      }

      // Execute the SQL query (handle special cases with dual queries)
      let rawData, avgData = null;
      
      if (config.id === 'feedbackRatio' && config.avgSql) {
        // Feedback ratio needs both main query and average query
        rawData = await this.executeQueryWithDebounce(config.sql, params);
        // For average query, only use season and meso (remove coach email)
        // params structure: [seasonName, coachEmail, selectedMeso]
        const avgParams = [params[0], params[2]]; // season, meso
        avgData = await this.executeQueryWithDebounce(config.avgSql, avgParams);
      } else if (config.id === 'pulseInteractions' && config.avgSql) {
        // Pulse interactions needs both main query and average query
        rawData = await this.executeQueryWithDebounce(config.sql, params);
        // For average query, only use season (remove coach email)
        // params structure: [seasonName, coachEmail]
        const avgParams = [params[0]]; // season only
        avgData = await this.executeQueryWithDebounce(config.avgSql, avgParams);
      } else {
        rawData = await this.executeQueryWithDebounce(config.sql, params);
      }

      // Transform data using config's transform function
      const transformedData = transformDataForChart(rawData, config, avgData);

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
  async fetchAllChartsData(coachEmail, seasonId, seasonNumber = null, selectedCoach = null, availableCoaches = [], selectedMeso = null) {
    try {
      const configs = getAllChartConfigs();
      const results = {};

      // Fetch data for each chart in parallel
      const promises = configs.map(async (config) => {
        try {
          const data = await this.fetchChartData(config.id, coachEmail, seasonId, seasonNumber, selectedCoach, availableCoaches, selectedMeso);
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
  async fetchTableData(coachEmail, seasonId, seasonNumber = null) {
    try {
      const cacheKey = this.getCacheKey(coachEmail, seasonId, 'table');
      const cachedData = this.cache.get(cacheKey);

      // Return cached data if valid
      if (this.isCacheValid(cachedData)) {
        return cachedData.data;
      }

      const tableConfig = getTableConfig();
      
      // Use seasonNumber if available, otherwise use seasonId
      const seasonParam = seasonNumber || seasonId;
      
      // Execute the SQL query with corrected parameter order for v_survey_results
      // SQL expects: season = $1 and coach_email = $2
      const rawData = await this.executeQueryWithDebounce(tableConfig.sql, [seasonParam, coachEmail]);

      // Cache the result
      this.cache.set(cacheKey, {
        data: rawData,
        timestamp: Date.now()
      });

      return rawData;

    } catch (error) {
      console.error('Debug: Table data fetch error:', error);
      throw error;
    }
  }

  /**
   * Fetch all insights data (charts + table)
   */
  async fetchAllInsightsData(coachEmail, seasonId, seasonNumber = null, selectedCoach = null, availableCoaches = [], selectedMeso = null) {
    try {
      const [chartsData, tableData] = await Promise.all([
        this.fetchAllChartsData(coachEmail, seasonId, seasonNumber, selectedCoach, availableCoaches, selectedMeso),
        this.fetchTableData(coachEmail, seasonId, seasonNumber)
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
   * Cancel all pending requests and clear timers
   */
  cancelAllRequests() {
    // Cancel all pending requests
    for (const [key, controller] of this.pendingRequests) {
      controller.abort();
    }
    this.pendingRequests.clear();
    
    // Clear all debounce timers
    for (const [key, timer] of this.debounceTimers) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
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