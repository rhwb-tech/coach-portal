import React, { useState, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { MessageCircle, X } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

const CommentDonut = ({ data, height = 300 }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const chartRef = useRef();

  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No comment data available</p>
        </div>
      </div>
    );
  }

  // Handle click on chart segments
  const handleChartClick = (event, elements) => {
    if (elements.length > 0) {
      const clickedIndex = elements[0].index;
      const category = data.labels[clickedIndex];
      setSelectedCategory(category);
      setShowComments(true);
    }
  };

  // Create chart options with click handler
  const chartOptions = {
    ...data.options,
    onClick: handleChartClick,
    plugins: {
      ...data.options?.plugins,
      tooltip: {
        ...data.options?.plugins?.tooltip,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    }
  };

  const selectedComments = selectedCategory && data.commentsData 
    ? data.commentsData[selectedCategory] || [] 
    : [];

  return (
    <div className="relative">
      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        <Doughnut 
          ref={chartRef}
          data={data} 
          options={chartOptions} 
        />
      </div>

      {/* Click instruction */}
      <div className="text-center mt-4 text-sm text-gray-600">
        <MessageCircle className="h-4 w-4 inline mr-1" />
        Click on a segment to view comments
      </div>

      {/* Comments Modal/Overlay */}
      {showComments && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ 
                    backgroundColor: data.datasets[0].backgroundColor[data.labels.indexOf(selectedCategory)] 
                  }}
                ></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedCategory}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedComments.length} comments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowComments(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Comments List */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedComments.length > 0 ? (
                <div className="space-y-4">
                  {selectedComments.map((comment, index) => (
                    <div 
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-start space-x-3">
                        <div 
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ 
                            backgroundColor: data.datasets[0].backgroundColor[data.labels.indexOf(selectedCategory)]
                          }}
                        ></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No comments found for this category</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Category: {selectedCategory}</span>
                <button
                  onClick={() => setShowComments(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentDonut;