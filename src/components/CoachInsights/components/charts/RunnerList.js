import React from 'react';
import { Users, AlertTriangle } from 'lucide-react';

const RunnerList = ({ data, height = 300 }) => {
  const { runners, count } = data || { runners: [], count: 0 };

  if (count === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Great Job!</h3>
          <p className="text-sm text-gray-600">All runners received adequate feedback</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header with count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span className="text-lg font-medium text-gray-900">
            {count} Runner{count !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Need{count === 1 ? 's' : ''} more feedback
        </div>
      </div>

      {/* Runner list */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {runners.map((runnerName, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-orange-700">
                    {runnerName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {runnerName}
                </span>
              </div>
              <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                Needs feedback
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer summary */}
      {count > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
          <div className="text-xs text-gray-600 text-center">
            Consider providing more detailed feedback to help these runners improve
          </div>
        </div>
      )}
    </div>
  );
};

export default RunnerList;