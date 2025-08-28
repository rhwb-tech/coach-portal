import React, { useState, useEffect } from 'react';
import { getAllChartConfigs } from '../services/chartConfigs';
import BaseChart from './charts/BaseChart';
import { getScreenSize, debounce } from '../utils/chartHelpers';
import { AlertCircle, BarChart3 } from 'lucide-react';

const ChartsGrid = ({ chartData, loading, error }) => {
  const [screenSize, setScreenSize] = useState(getScreenSize());
  const [chartConfigs] = useState(getAllChartConfigs());

  // Handle window resize
  useEffect(() => {
    const handleResize = debounce(() => {
      setScreenSize(getScreenSize());
    }, 250);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get responsive grid classes based on screen size
  const getGridClasses = () => {
    const baseClasses = 'grid gap-6';
    
    switch (screenSize) {
      case 'xs':
      case 'sm':
        return `${baseClasses} grid-cols-1`;
      case 'md':
        return `${baseClasses} grid-cols-1 lg:grid-cols-2`;
      case 'lg':
      case 'xl':
      case '2xl':
      default:
        return `${baseClasses} grid-cols-1 md:grid-cols-2`;
    }
  };

  // Get responsive chart height based on screen size
  const getChartHeight = () => {
    switch (screenSize) {
      case 'xs':
      case 'sm':
        return 280;
      case 'md':
        return 320;
      case 'lg':
      case 'xl':
      case '2xl':
      default:
        return 350;
    }
  };

  // Show global loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <BarChart3 className="h-4 w-4 animate-pulse" />
            <span>Loading charts...</span>
          </div>
        </div>
        
        <div className={getGridClasses()}>
          {chartConfigs.map((config) => (
            <BaseChart
              key={config.id}
              config={config}
              data={null}
              loading={true}
              error={null}
              height={getChartHeight()}
            />
          ))}
        </div>
      </div>
    );
  }

  // Show global error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
          <div className="flex items-center space-x-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Error loading data</span>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 text-red-700 mb-2">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-medium">Failed to Load Dashboard</h3>
          </div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Count successful vs error charts
  const chartStats = chartConfigs.reduce((acc, config) => {
    const chart = chartData[config.id];
    if (chart?.error) {
      acc.errors++;
    } else if (chart?.data) {
      acc.success++;
    } else {
      acc.empty++;
    }
    acc.total++;
    return acc;
  }, { total: 0, success: 0, errors: 0, empty: 0 });

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Key performance metrics and trends
          </p>
        </div>
        
        {/* Status Summary */}
        <div className="flex items-center space-x-4 text-sm">
          {chartStats.success > 0 && (
            <div className="flex items-center space-x-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{chartStats.success} loaded</span>
            </div>
          )}
          {chartStats.errors > 0 && (
            <div className="flex items-center space-x-1 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>{chartStats.errors} errors</span>
            </div>
          )}
          {chartStats.empty > 0 && (
            <div className="flex items-center space-x-1 text-gray-500">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>{chartStats.empty} no data</span>
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className={getGridClasses()}>
        {chartConfigs.map((config) => {
          const chart = chartData[config.id] || {};
          
          return (
            <BaseChart
              key={config.id}
              config={config}
              data={chart.data || null}
              loading={false}
              error={chart.error || null}
              height={getChartHeight()}
              className="transition-all duration-200 hover:scale-[1.02]"
            />
          );
        })}
      </div>

      {/* Summary Stats */}
      {chartStats.total > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Total Charts:</span>
              <span className="font-medium text-gray-900">{chartStats.total}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Successfully Loaded:</span>
              <span className="font-medium text-green-600">{chartStats.success}</span>
            </div>
            {chartStats.errors > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Errors:</span>
                <span className="font-medium text-red-600">{chartStats.errors}</span>
              </div>
            )}
            {chartStats.empty > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">No Data:</span>
                <span className="font-medium text-gray-500">{chartStats.empty}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartsGrid;