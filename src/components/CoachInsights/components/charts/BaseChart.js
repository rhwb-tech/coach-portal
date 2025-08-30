import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { CHART_TYPES, DEFAULT_CHART_OPTIONS } from '../../utils/constants';
import { AlertCircle, BarChart3, TrendingUp } from 'lucide-react';
import BulletChart from './BulletChart';
import RunnerList from './RunnerList';
import CommentDonut from './CommentDonut';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  Filler
);

const BaseChart = ({ 
  config, 
  data, 
  loading, 
  error, 
  className = '',
  height = 300 
}) => {
  // Show loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
              {config.description && (
                <p className="text-sm text-gray-600 mt-1">{config.description}</p>
              )}
            </div>
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div 
            className="flex items-center justify-center bg-gray-50 rounded-lg animate-pulse"
            style={{ height: `${height}px` }}
          >
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-500 text-sm">Loading chart...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
              {config.description && (
                <p className="text-sm text-gray-600 mt-1">{config.description}</p>
              )}
            </div>
            <BarChart3 className="h-6 w-6 text-red-600" />
          </div>
          <div 
            className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200"
            style={{ height: `${height}px` }}
          >
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 text-sm font-medium">Error loading chart</p>
              <p className="text-red-500 text-xs mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
              {config.description && (
                <p className="text-sm text-gray-600 mt-1">{config.description}</p>
              )}
            </div>
            <BarChart3 className="h-6 w-6 text-gray-400" />
          </div>
          <div 
            className="flex items-center justify-center bg-gray-50 rounded-lg"
            style={{ height: `${height}px` }}
          >
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No data available</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Merge default options with config-specific options
  const chartOptions = {
    ...DEFAULT_CHART_OPTIONS,
    ...config.options,
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      ...DEFAULT_CHART_OPTIONS.plugins,
      ...config.options?.plugins,
      title: {
        display: false // We handle title in the component header
      }
    }
  };

  // Render the appropriate chart type
  const renderChart = () => {
    const commonProps = {
      data,
      options: chartOptions,
      height
    };

    switch (config.type) {
      case CHART_TYPES.BAR:
        return <Bar {...commonProps} />;
      case CHART_TYPES.LINE:
        return <Line {...commonProps} />;
      case CHART_TYPES.PIE:
        return <Pie {...commonProps} />;
      case CHART_TYPES.DOUGHNUT:
        return <Doughnut {...commonProps} />;
      case CHART_TYPES.BULLET_CHART:
        return <BulletChart data={data} height={height} />;
      case CHART_TYPES.RUNNER_LIST:
        return <RunnerList data={data} height={height} />;
      case CHART_TYPES.COMMENT_DONUT:
        return <CommentDonut data={data} height={height} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-yellow-600 text-sm">Unsupported chart type: {config.type}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="p-6">
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
            {config.description && (
              <p className="text-sm text-gray-600 mt-1">{config.description}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        {/* Chart Container */}
        <div className="relative" style={{ height: `${height}px` }}>
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default BaseChart;