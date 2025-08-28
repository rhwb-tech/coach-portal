import { useState, useEffect, useCallback } from 'react';
import insightsService from '../services/insightsService';

/**
 * Custom hook for managing Coach Insights data
 * Handles loading states, error handling, and data caching
 */
export const useInsightsData = (coachEmail, selectedSeason, seasonNumber = null, selectedCoach = null, availableCoaches = []) => {
  const [chartData, setChartData] = useState({});
  const [tableData, setTableData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState(null);
  
  // Fetch all insights data
  const fetchData = useCallback(async () => {
    if (!coachEmail || !selectedSeason) {
      setLoadingData(false);
      return;
    }

    try {
      setLoadingData(true);
      setErrorData(null);

      const data = await insightsService.fetchAllInsightsData(coachEmail, selectedSeason, seasonNumber, selectedCoach, availableCoaches);
      
      setChartData(data.charts || {});
      setTableData(data.table || []);

    } catch (error) {
      console.error('Error fetching insights data:', error);
      setErrorData(error.message || 'Failed to load insights data');
      
      // Set empty data on error
      setChartData({});
      setTableData([]);

    } finally {
      setLoadingData(false);
    }
  }, [coachEmail, selectedSeason, seasonNumber, selectedCoach, availableCoaches]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    // Clear cache for this coach/season
    if (coachEmail && selectedSeason) {
      insightsService.clearCache(coachEmail, selectedSeason);
    }
    await fetchData();
  }, [fetchData, coachEmail, selectedSeason, seasonNumber, selectedCoach, availableCoaches]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Provide individual chart data accessors
  const getChartData = useCallback((chartId) => {
    return chartData[chartId] || { data: null, error: null, config: null };
  }, [chartData]);

  // Check if any charts have errors
  const hasErrors = useCallback(() => {
    return Object.values(chartData).some(chart => chart.error);
  }, [chartData]);

  // Check if any charts are loading
  const isAnyLoading = useCallback(() => {
    return loadingData;
  }, [loadingData]);

  // Get summary stats
  const getSummaryStats = useCallback(() => {
    const totalCharts = Object.keys(chartData).length;
    const errorCharts = Object.values(chartData).filter(chart => chart.error).length;
    const successCharts = totalCharts - errorCharts;
    const totalRecords = Array.isArray(tableData) ? tableData.length : 0;

    return {
      totalCharts,
      successCharts,
      errorCharts,
      totalRecords,
      hasData: successCharts > 0 || totalRecords > 0
    };
  }, [chartData, tableData]);

  return {
    // Data
    chartData,
    tableData,
    
    // Loading states
    loadingData,
    errorData,
    
    // Actions
    refreshData,
    
    // Utilities
    getChartData,
    hasErrors,
    isAnyLoading,
    getSummaryStats
  };
};

/**
 * Hook for managing individual chart data
 */
export const useChartData = (chartId, coachEmail, selectedSeason) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchChartData = useCallback(async () => {
    if (!coachEmail || !selectedSeason || !chartId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const chartData = await insightsService.fetchChartData(chartId, coachEmail, selectedSeason);
      setData(chartData);

    } catch (err) {
      console.error(`Error fetching chart data for ${chartId}:`, err);
      setError(err.message || 'Failed to load chart data');
      setData(null);

    } finally {
      setLoading(false);
    }
  }, [chartId, coachEmail, selectedSeason]);

  const refreshChartData = useCallback(() => {
    fetchChartData();
  }, [fetchChartData]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return {
    data,
    loading,
    error,
    refresh: refreshChartData
  };
};

/**
 * Hook for chart configuration management
 */
export const useChartConfig = (chartId) => {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    import('../services/chartConfigs').then(({ getChartConfig }) => {
      const chartConfig = getChartConfig(chartId);
      setConfig(chartConfig);
    });
  }, [chartId]);

  return config;
};

export default useInsightsData;