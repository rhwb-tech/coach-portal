import React, { useState } from 'react';

const BulletChart = ({ data, height = 300 }) => {
  const { coachPercentage, averagePercentage, target } = data;
  const [showAvgTooltip, setShowAvgTooltip] = useState(false);
  const [showTargetTooltip, setShowTargetTooltip] = useState(false);

  const getColor = (val) => {
    if (val >= target) return '#10B981';
    if (val >= target * 0.8) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-medium">Feedback Ratio</span>
            <span className="text-3xl font-bold" style={{ color: getColor(coachPercentage) }}>
              {coachPercentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="relative">
            {/* Main bullet chart */}
            <div className="relative h-12 bg-gray-200 rounded">
              {/* Background zones */}
              <div className="absolute h-full bg-red-100 rounded" style={{ width: `${target * 0.6}%` }}></div>
              <div className="absolute h-full bg-yellow-100 rounded" style={{ width: `${target * 0.8}%` }}></div>
              <div className="absolute h-full bg-green-100 rounded" style={{ width: `${target}%` }}></div>
              
              {/* Main value bar */}
              <div 
                className="absolute h-full rounded transition-all duration-700 ease-out"
                style={{ 
                  width: `${Math.min(coachPercentage, 100)}%`,
                  backgroundColor: getColor(coachPercentage)
                }}
              ></div>
              
              {/* Target marker */}
              <div 
                className="absolute h-full w-1 bg-green-700 shadow-sm"
                style={{ left: `${target}%` }}
                id="target-marker"
              ></div>
              
              {/* Average marker */}
              <div 
                className="absolute h-full w-1 bg-gray-700 shadow-sm"
                style={{ left: `${averagePercentage}%` }}
                id="average-marker"
              ></div>
            </div>

            {/* Connecting lines and labels */}
            <div className="relative mt-2">
              {/* Check if labels would overlap and adjust positioning */}
              {Math.abs(averagePercentage - target) > 12 ? (
                <>
                  {/* Average label with connecting line */}
                  <div 
                    className="absolute flex flex-col items-center"
                    style={{ left: `${averagePercentage}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* Connecting line */}
                    <div className="w-px h-3 bg-gray-700"></div>
                    {/* Label with custom tooltip */}
                    <div className="relative">
                      <div 
                        className="mt-1 px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs text-gray-700 font-medium whitespace-nowrap cursor-help"
                        onMouseEnter={() => setShowAvgTooltip(true)}
                        onMouseLeave={() => setShowAvgTooltip(false)}
                      >
                        Avg: {averagePercentage.toFixed(1)}%
                      </div>
                      {/* Custom tooltip */}
                      {showAvgTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-50">
                          Average of all Coaches this season
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Target label with connecting line */}
                  <div 
                    className="absolute flex flex-col items-center"
                    style={{ left: `${target}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* Connecting line */}
                    <div className="w-px h-3 bg-green-700"></div>
                    {/* Label with custom tooltip */}
                    <div className="relative">
                      <div 
                        className="mt-1 px-2 py-1 bg-green-50 border border-green-300 rounded text-xs text-green-700 font-medium whitespace-nowrap cursor-help"
                        onMouseEnter={() => setShowTargetTooltip(true)}
                        onMouseLeave={() => setShowTargetTooltip(false)}
                      >
                        Target: {target}%
                      </div>
                      {/* Custom tooltip */}
                      {showTargetTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-50">
                          Desired Target for RHWB Coaches
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Labels are close - stack them to avoid overlap */
                <>
                  {/* Target label positioned below with longer line */}
                  <div 
                    className="absolute flex flex-col items-center"
                    style={{ left: `${target}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="w-px h-6 bg-green-700"></div>
                    <div className="relative">
                      <div 
                        className="mt-1 px-2 py-1 bg-green-50 border border-green-300 rounded text-xs text-green-700 font-medium whitespace-nowrap cursor-help"
                        onMouseEnter={() => setShowTargetTooltip(true)}
                        onMouseLeave={() => setShowTargetTooltip(false)}
                      >
                        Target: {target}%
                      </div>
                      {/* Custom tooltip - show below for close spacing */}
                      {showTargetTooltip && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-50">
                          Desired Target for RHWB Coaches
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-black"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Average label positioned above target with proper z-index */}
                  <div 
                    className="absolute flex flex-col items-center z-10"
                    style={{ left: `${averagePercentage}%`, transform: 'translateX(-50%)', top: '-20px' }}
                  >
                    <div className="w-px h-2 bg-gray-700"></div>
                    <div className="relative">
                      <div 
                        className="mt-1 px-2 py-1 bg-white border-2 border-gray-400 rounded text-xs text-gray-700 font-medium whitespace-nowrap shadow-sm cursor-help"
                        onMouseEnter={() => setShowAvgTooltip(true)}
                        onMouseLeave={() => setShowAvgTooltip(false)}
                      >
                        Avg: {averagePercentage.toFixed(1)}%
                      </div>
                      {/* Custom tooltip */}
                      {showAvgTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-50">
                          Average of all Coaches this season
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default BulletChart;