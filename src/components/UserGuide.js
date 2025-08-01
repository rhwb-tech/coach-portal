import React from 'react';
import { X, Users, Search, TrendingUp, Clock, ArrowRight, MessageSquare, BookOpen } from 'lucide-react';

const UserGuide = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">RHWB Connect User Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-8">
            {/* Overview */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-600 mb-4">
                RHWB Connect is a comprehensive coaching platform designed to help coaches manage their runners, 
                track performance metrics, and facilitate communication within the running community.
              </p>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Quick Tip:</strong> Use the navigation tabs at the top to switch between different sections of the app.
                </p>
              </div>
            </section>

            {/* Navigation Tabs */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation Tabs</h3>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-gray-900">Know Your Runner</h4>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Comprehensive runner profiles with detailed information including family members, 
                    club history, onboarding surveys, and coach notes. Transfer runners between programs 
                    and manage your coaching cohort.
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>View detailed runner profiles and performance data</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Transfer runners between programs (Lite, 5K, 10K, Half Marathon, Full Marathon)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Add and manage coach notes for each runner</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Search className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-gray-900">OneRHWB</h4>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Search and view runner information across all seasons. Find runners by name or email 
                    and access their complete history and household information.
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Search runners by name or email address</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>View season history and performance data</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>See household members and family connections</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <h4 className="font-medium text-gray-900">Runner Metrics</h4>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Track and manage athlete performance metrics including strength training, mileage, 
                    cross-training, and qualitative assessments. Edit scores and add coach notes.
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>View planned vs completed training metrics</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Edit override scores and qualitative assessments</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Filter by distance and mesocycle</span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <h4 className="font-medium text-gray-900">Small Council</h4>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Review and manage transfer and deferral requests. Monitor the status of pending 
                    requests and track action items for your coaching team.
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>View all transfer requests with status</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Review deferral requests and comments</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Track request timestamps and requestors</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Key Features */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Runner Transfers</h4>
                  <p className="text-sm text-gray-600">
                    Transfer runners between programs with optional comments. 
                    All transfer requests are tracked in the Small Council.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Coach Notes</h4>
                  <p className="text-sm text-gray-600">
                    Add detailed notes for each runner. Notes are automatically 
                    saved and can be viewed in the runner profile.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Performance Tracking</h4>
                  <p className="text-sm text-gray-600">
                    Monitor strength training, mileage, cross-training, and 
                    other performance metrics with visual indicators.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Search & Filter</h4>
                  <p className="text-sm text-gray-600">
                    Search runners by name or email. Filter by distance, 
                    mesocycle, and other criteria to find specific athletes.
                  </p>
                </div>
              </div>
            </section>

            {/* Tips & Tricks */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips & Tricks</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                    <span className="text-blue-600 text-xs font-medium">1</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong>Use the star icon</strong> next to runner names to quickly access and edit coach notes.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                    <span className="text-blue-600 text-xs font-medium">2</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong>Filter by distance</strong> to focus on specific program groups (5K, 10K, etc.).
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                    <span className="text-blue-600 text-xs font-medium">3</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong>Click on runner cards</strong> to expand detailed sections including family members and club history.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                    <span className="text-blue-600 text-xs font-medium">4</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong>Use the help icon</strong> (?) next to your name to access this guide or submit feedback anytime.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Support */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-900">Submit Feedback</h4>
                </div>
                <p className="text-green-800 text-sm">
                  Found a bug, have a feature request, or need help? Use the Feedback option 
                  in the help menu to submit your request. We're here to help!
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserGuide; 