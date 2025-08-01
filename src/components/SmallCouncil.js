import React, { useState, useEffect, useCallback } from 'react';
import { Users, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const SmallCouncil = ({ coachEmail }) => {
  const [transferRequests, setTransferRequests] = useState([]);
  const [deferralRequests, setDeferralRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runnerDetails, setRunnerDetails] = useState({});
  const [coachNames, setCoachNames] = useState({});
  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer' or 'deferral'
  const [showCompleted, setShowCompleted] = useState(false); // NEW: toggle for showing completed requests

  // Load action requests from database
  const loadActionRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch transfer requests
      let transferQuery = supabase
        .from('rhwb_action_requests')
        .select('*')
        .eq('action_type', 'Transfer Runner')
        .order('created_at', { ascending: false });

      // Apply status filter if not showing completed
      if (!showCompleted) {
        transferQuery = transferQuery.eq('status', 'pending');
      }

      const { data: transferData, error: transferError } = await transferQuery;
      
      console.log('Transfer data:', transferData);
      console.log('Show completed:', showCompleted);

      if (transferError) {
        console.error('Error fetching transfer requests:', transferError);
        throw transferError;
      }

      // Fetch deferral requests
      let deferralQuery = supabase
        .from('rhwb_action_requests')
        .select('*')
        .eq('action_type', 'Defer Runner')
        .order('created_at', { ascending: false });

      // Apply status filter if not showing completed
      if (!showCompleted) {
        deferralQuery = deferralQuery.eq('status', 'pending');
      }

      const { data: deferralData, error: deferralError } = await deferralQuery;
      
      console.log('Deferral data:', deferralData);

      if (deferralError) {
        console.error('Error fetching deferral requests:', deferralError);
        throw deferralError;
      }

      setTransferRequests(transferData || []);
      setDeferralRequests(deferralData || []);

      // Load runner and coach details for transfer requests
      if (transferData && transferData.length > 0) {
        const runnerEmails = [...new Set(transferData.map(r => r.runner_email_id))];
        const coachEmails = [...new Set(transferData.map(r => r.requestor_email_id))];
        
        // Load runner details
        const runnerDetailsMap = {};
        console.log('Loading runner details for emails:', runnerEmails);
        for (const email of runnerEmails) {
          const details = await getRunnerDetails(email);
          runnerDetailsMap[email] = details;
        }
        console.log('Runner details map:', runnerDetailsMap);
        setRunnerDetails(runnerDetailsMap);
        
        // Load coach names
        const coachNamesMap = {};
        for (const email of coachEmails) {
          const name = await getCoachName(email);
          coachNamesMap[email] = name;
        }
        setCoachNames(coachNamesMap);
      }

    } catch (error) {
      console.error('Failed to load action requests:', error);
      setError('Failed to load action requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showCompleted]);

  useEffect(() => {
    loadActionRequests();
  }, [coachEmail, showCompleted, loadActionRequests]);

  // Get runner details for display
  const getRunnerDetails = async (emailId) => {
    try {
      console.log('Fetching runner details for email:', emailId);
      
      // Try to get runner name from runners_profile table
      const { data, error } = await supabase
        .from('runners_profile')
        .select('runner_name')
        .eq('email_id', emailId)
        .single();

      if (error) {
        console.error('Error fetching runner details:', error);
        // If RLS is blocking access, try a different approach
        // For now, return the email as the name
        return { runner_name: emailId, race_distance: 'N/A', location: 'N/A' };
      }

      console.log('Runner details found:', data);
      return { 
        runner_name: data?.runner_name || emailId, 
        race_distance: 'N/A', 
        location: 'N/A' 
      };
    } catch (error) {
      console.error('Error fetching runner details:', error);
      return { runner_name: emailId, race_distance: 'N/A', location: 'N/A' };
    }
  };

  // Get coach name for display
  const getCoachName = async (emailId) => {
    try {
      const { data, error } = await supabase
        .from('rhwb_coaches')
        .select('coach')
        .eq('email_id', emailId)
        .single();

      if (error) {
        console.error('Error fetching coach name:', error);
        return emailId; // Fallback to email if coach name not found
      }

      return data?.coach || emailId;
    } catch (error) {
      console.error('Error fetching coach name:', error);
      return emailId;
    }
  };

  // Handle closing a transfer request
  const handleCloseTransfer = async (requestId) => {
    try {
      const { error } = await supabase
        .from('rhwb_action_requests')
        .update({ 
          status: 'closed',
          closed_date: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error closing transfer request:', error);
        alert('Failed to close transfer request. Please try again.');
        return;
      }

      // Refresh the data
      loadActionRequests();
      alert('Transfer request closed successfully!');
    } catch (error) {
      console.error('Error closing transfer request:', error);
      alert('Failed to close transfer request. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge component
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Closed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading action requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

    return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Small Council</h1>
        <p className="text-sm sm:text-base text-gray-600">Review and manage transfer and deferral requests</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200">
          <div className="flex flex-1">
            <button
              onClick={() => setActiveTab('transfer')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none ${
                activeTab === 'transfer'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Transfer Requests</span>
              <span className="sm:hidden">Transfer</span>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full">
                {transferRequests.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('deferral')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none ${
                activeTab === 'deferral'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Deferral Requests</span>
              <span className="sm:hidden">Deferral</span>
              <span className="bg-orange-100 text-orange-800 text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full">
                {deferralRequests.length}
              </span>
            </button>
          </div>
          <div className="flex items-center justify-center sm:justify-end space-x-2 px-4 sm:px-6 py-3 sm:py-4 border-t sm:border-t-0 border-gray-200">
            <input
              type="checkbox"
              id="showCompleted"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="showCompleted" className="text-xs sm:text-sm text-gray-700 font-medium">
              Show completed requests
            </label>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
        {activeTab === 'transfer' ? (
          /* Transfer Requests Content */
          <div>
            <div className="flex items-center mb-4 sm:mb-6">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2 sm:mr-3" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Transfer Requests</h2>
            </div>

            {transferRequests.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base text-gray-500">No transfer requests found.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {transferRequests.map((request, index) => {
                  const runnerDetail = runnerDetails[request.runner_email_id];
                  const coachName = coachNames[request.requestor_email_id];

                  return (
                    <div key={request.id || index} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                              {runnerDetail?.runner_name || request.runner_email_id}
                            </h3>
                            <span className="text-xs sm:text-sm text-gray-500">
                              ({request.runner_email_id})
                            </span>
                          </div>
                          
                          {/* Transfer Details - Responsive layout */}
                          <div className="mb-2">
                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                              <span className="font-medium">Transfer:</span> {request.current_program || 'Unknown'} → {request.new_program || 'Unknown'}
                              <span className="hidden sm:inline"> • </span>
                              <br className="sm:hidden" />
                              <span className="font-medium">Requested by:</span> {coachName || request.requestor_email_id}
                              <span className="hidden sm:inline"> • </span>
                              <br className="sm:hidden" />
                              {formatDate(request.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end space-x-2">
                          {getStatusBadge(request.status)}
                          {request.status !== 'closed' && (
                            <button
                              onClick={() => handleCloseTransfer(request.id)}
                              className="px-2 sm:px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {request.comments && (
                        <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs sm:text-sm text-gray-700">
                            <span className="font-medium">Comments:</span> {request.comments}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Deferral Requests Content */
          <div>
            <div className="flex items-center mb-4 sm:mb-6">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 mr-2 sm:mr-3" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Deferral Requests</h2>
            </div>

            {deferralRequests.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Clock className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base text-gray-500">No deferral requests found.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {deferralRequests.map((request, index) => (
                  <div key={request.id || index} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                      <div className="flex-1 mb-3 sm:mb-0">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1">
                          {request.runner_email_id}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2">
                          Requested by: {request.requestor_email_id}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {formatDate(request.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                    
                    {request.comments && (
                      <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-700">
                          <span className="font-medium">Comments:</span> {request.comments}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmallCouncil; 