import React from 'react';

const FeedbackRatioChart = () => {
  // Sample data - you can modify these values in the code
  const coachPercentage = 75;
  const averagePercentage = 68;
  const target = 80;

  const getColor = (val) => {
    if (val >= target) return '#10B981';
    if (val >= target * 0.8) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Coach Feedback Ratio</h1>
        
        {/* Bullet Chart */}
        <div className="p-8 bg-white rounded-lg shadow-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-medium">Feedback Ratio</span>
              <span className="text-3xl font-bold" style={{ color: getColor(coachPercentage) }}>
                {coachPercentage}%
              </span>
            </div>
            
            <div className="relative h-12 bg-gray-200 rounded">
              {/* Background zones */}
              <div className="absolute h-full bg-red-100 rounded" style={{ width: `${target * 0.6}%` }}></div>
              <div className="absolute h-full bg-yellow-100 rounded" style={{ width: `${target * 0.8}%` }}></div>
              <div className="absolute h-full bg-green-100 rounded" style={{ width: `${target}%` }}></div>
              
              {/* Main value bar */}
              <div 
                className="absolute h-full rounded transition-all duration-700 ease-out"
                style={{ 
                  width: `${coachPercentage}%`,
                  backgroundColor: getColor(coachPercentage)
                }}
              ></div>
              
              {/* Target marker */}
              <div 
                className="absolute h-full w-1 bg-green-700 shadow-sm"
                style={{ left: `${target}%` }}
              ></div>
              
              {/* Average marker */}
              <div 
                className="absolute h-full w-1 bg-gray-700 shadow-sm"
                style={{ left: `${averagePercentage}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-sm text-gray-500 mt-3">
              <span>0%</span>
              <span className="text-gray-700 font-medium" style={{ marginLeft: `${averagePercentage-2}%` }}>
                Avg: {averagePercentage}%
              </span>
              <span className="text-green-700 font-medium" style={{ marginLeft: `${target-averagePercentage-8}%` }}>
                Target: {target}%
              </span>
              <span>100%</span>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default FeedbackRatioChart;