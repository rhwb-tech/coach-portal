import React, { useState, useEffect, useCallback } from 'react';
import { Users, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchActionComments } from '../services/cloudSqlService';
import { useAuth } from '../contexts/AuthContext';
import { finalSurgeService } from '../services/finalSurgeService';

const SmallCouncil = ({ coachEmail, currentSeason }) => {
  const { user, isAuthenticated } = useAuth();
  

  const [transferRequests, setTransferRequests] = useState([]);
  const [deferralRequests, setDeferralRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runnerDetails, setRunnerDetails] = useState({});
  const [coachNames, setCoachNames] = useState({});
  // Persist state in localStorage to survive tab switches
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('rhwb-smallcouncil-active-tab');
    return savedTab || 'transfer';
  });
  const [showCompleted, setShowCompleted] = useState(() => {
    const savedShowCompleted = localStorage.getItem('rhwb-smallcouncil-show-completed');
    return savedShowCompleted === 'true';
  });
  const [showTransferConfirmation, setShowTransferConfirmation] = useState(false);
  const [pendingTransferId, setPendingTransferId] = useState(null);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);
  const [pendingRejectId, setPendingRejectId] = useState(null);
  const [removingTransferId, setRemovingTransferId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [fsTransferLoading, setFsTransferLoading] = useState(null);

  // Helper functions to update state and persist to localStorage
  const updateActiveTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('rhwb-smallcouncil-active-tab', tab);
  };

  const updateShowCompleted = (show) => {
    setShowCompleted(show);
    localStorage.setItem('rhwb-smallcouncil-show-completed', show.toString());
  };

  // Load action requests from database
  const loadActionRequests = useCallback(async () => {
    try {
      // Don't show loading if we already have data and the page is not visible
      if (transferRequests.length > 0 && document.hidden) {
        return;
      }
      
      setLoading(true);
      setError(null);

      // Fetch transfer requests
      let transferQuery = supabase
        .from('rhwb_action_requests')
        .select('*')
        .eq('action_type', 'Transfer Runner')
        .order('created_at', { ascending: false });

      // Apply season filter if currentSeason is available
      if (currentSeason) {
        transferQuery = transferQuery.eq('season', currentSeason);
      }

      // Apply status filter if not showing completed
      if (!showCompleted) {
        transferQuery = transferQuery.eq('status', 'pending');
      }

      const { data: transferData, error: transferError } = await transferQuery;

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

      // Apply season filter if currentSeason is available
      if (currentSeason) {
        deferralQuery = deferralQuery.eq('season', currentSeason);
      }

      // Apply status filter if not showing completed
      if (!showCompleted) {
        deferralQuery = deferralQuery.eq('status', 'pending');
      }

      const { data: deferralData, error: deferralError } = await deferralQuery;

      if (deferralError) {
        console.error('Error fetching deferral requests:', deferralError);
        throw deferralError;
      }

      // Fetch comments from Cloud SQL and merge into request objects
      const allRequests = [...(transferData || []), ...(deferralData || [])];
      const allRequestIds = allRequests.map(r => r.id).filter(Boolean);

      let commentsMap = {};
      if (allRequestIds.length > 0) {
        try {
          const comments = await fetchActionComments(allRequestIds);
          for (const c of comments) {
            commentsMap[c.action_request_id] = c.comment;
          }
        } catch (commentError) {
          console.error('Failed to fetch comments from Cloud SQL:', commentError);
          // Fall back to Supabase comments field if Cloud SQL fails
        }
      }

      // Merge Cloud SQL comments into requests (Cloud SQL takes priority over Supabase)
      const mergeComments = (requests) =>
        (requests || []).map(r => ({
          ...r,
          comments: commentsMap[r.id] || r.comments || null,
        }));

      setTransferRequests(mergeComments(transferData));
      setDeferralRequests(mergeComments(deferralData));

      // Load runner and coach details for transfer requests
      if (transferData && transferData.length > 0) {
        const runnerEmails = [...new Set(transferData.map(r => r.runner_email_id))];
        const coachEmails = [...new Set(transferData.map(r => r.requestor_email_id))];
        
        // Load runner details
        const runnerDetailsMap = {};
        for (const email of runnerEmails) {
          const details = await getRunnerDetails(email);
          runnerDetailsMap[email] = details;
        }

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
  }, [showCompleted, transferRequests.length, currentSeason]);

  useEffect(() => {
    // Only load data if we have a valid coachEmail and user is authenticated
    // AND the page is visible (not in background tab)
    if (coachEmail && user && !document.hidden) {
      // Add a small delay to prevent rapid re-loading during tab switches
      const timer = setTimeout(() => {
        loadActionRequests();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [coachEmail, showCompleted, loadActionRequests, user]);

  // Handle page visibility changes to maintain state during tab switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      // When tab becomes visible and we have valid data, don't reload unnecessarily
      if (!document.hidden && coachEmail && user && transferRequests.length > 0) {
        // Maintain state without reloading
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [coachEmail, user, transferRequests.length]);

  // Cleanup localStorage on unmount if user is not authenticated
  useEffect(() => {
    return () => {
      if (!user) {
        localStorage.removeItem('rhwb-smallcouncil-active-tab');
        localStorage.removeItem('rhwb-smallcouncil-show-completed');
      }
    };
  }, [user]);

  // Get runner details for display
  const getRunnerDetails = async (emailId) => {
    try {
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
        .from('v_rhwb_roles')
        .select('full_name')
        .eq('email_id', emailId.toLowerCase())
        .single();

      if (error) {
        console.error('Error fetching coach name:', error);
        return emailId; // Fallback to email if coach name not found
      }

      return data?.full_name || emailId;
    } catch (error) {
      console.error('Error fetching coach name:', error);
      return emailId;
    }
  };

  // Handle closing a transfer request
  const handleCloseTransfer = async (requestId) => {
    try {
      // Check authentication first to satisfy RLS policies
      if (!isAuthenticated || !user) {
        console.error('User not authenticated');
        alert('Authentication required. Please log in again.');
        return;
      }

      // Get current session to ensure it's valid
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        console.error('Session error:', authError);
        alert('Session expired. Please log in again.');
        return;
      }



      // First, get the transfer request details to know what program was selected
      const { data: transferRequest, error: fetchError } = await supabase
        .from('rhwb_action_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('Error fetching transfer request:', fetchError);
        alert('Failed to fetch transfer request details. Please try again.');
        return;
      }

      // Update the action request status
      const { error: updateError } = await supabase
        .from('rhwb_action_requests')
        .update({ 
          status: 'closed',
          closed_date: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error closing transfer request:', updateError);
        alert('Failed to close transfer request. Please try again.');
        return;
      }

      // Update runner_season_info table based on request type
      if (transferRequest.action_type === 'Transfer Runner') {
        // Transfer requests: update program/team
        if (!transferRequest.new_race_distance || !transferRequest.runner_email_id || !currentSeason) {
          console.error('Missing required data for runner update:', {
            new_race_distance: transferRequest.new_race_distance,
            runner_email_id: transferRequest.runner_email_id,
            currentSeason: currentSeason
          });
          alert('Missing required data for runner update. Please check the transfer request details.');
          return;
        }

        // Proceed with updating runner_season_info
        // Always update these fields if present on the request
        const baseUpdateData = {
          race_distance: null,
          activity: transferRequest.new_activity ?? null,
          level: transferRequest.new_program_level ?? null,
          segment: transferRequest.new_segment ?? null
        };
        
        let updateData = {};
        
        if (transferRequest.new_race_distance === 'Lite') {
          // Lite uses coach assignment, and clears race_distance/level
          updateData = { ...baseUpdateData, coach: 'Lite', race_distance: null, level: null };
        } else if (transferRequest.new_segment === 'Lite') {
          // Lite segment: set coach to self-coached
          updateData = { ...baseUpdateData, coach: 'Z. Self', race_distance: transferRequest.new_race_distance };
        } else {
          // For race distances (5K, 10K, Half Marathon, Full Marathon)
          updateData = { ...baseUpdateData, race_distance: transferRequest.new_race_distance };
        }

        // Update record in runner_season_info (season is used only to filter, not to update)
        const { error: runnerUpdateError } = await supabase
          .from('runner_season_info')
          .update(updateData)
          .eq('season', currentSeason)
          .eq('email_id', transferRequest.runner_email_id);

        if (runnerUpdateError) {
          console.error('Error updating runner season info:', runnerUpdateError);
          console.error('Error details:', {
            message: runnerUpdateError.message,
            code: runnerUpdateError.code,
            details: runnerUpdateError.details,
            hint: runnerUpdateError.hint
          });
          
          if (runnerUpdateError.message?.includes('row-level security policy')) {
            alert(`RLS Policy Error: ${runnerUpdateError.message}. Please ensure you have proper permissions.`);
          } else {
            alert(`Database Error: ${runnerUpdateError.message}`);
          }
          return; // Fail the operation if we can't update runner info
        }
      } else if (transferRequest.action_type === 'Defer Runner') {
        // Deferral requests: set coach to 'ZZ. Exit'
        if (!transferRequest.runner_email_id || !currentSeason) {
          console.error('Missing required data for deferral update:', {
            runner_email_id: transferRequest.runner_email_id,
            currentSeason: currentSeason
          });
          alert('Missing required data for deferral update. Please try again.');
          return;
        }

        // Update record in runner_season_info (season is used only to filter, not to update)
        const { error: deferralUpdateError } = await supabase
          .from('runner_season_info')
          .update({ coach: 'ZZ. Exit' })
          .eq('season', currentSeason)
          .eq('email_id', transferRequest.runner_email_id);

        if (deferralUpdateError) {
          console.error('Error updating runner season info for deferral:', deferralUpdateError);
          console.error('Error details:', {
            message: deferralUpdateError.message,
            code: deferralUpdateError.code,
            details: deferralUpdateError.details,
            hint: deferralUpdateError.hint
          });
          
          if (deferralUpdateError.message?.includes('row-level security policy')) {
            alert(`RLS Policy Error: ${deferralUpdateError.message}. Please ensure you have proper permissions.`);
          } else {
            alert(`Database Error: ${deferralUpdateError.message}`);
          }
          return; // Fail the operation if we can't update runner info
        }
      }

            // Show success message
      let message = 'Transfer completed successfully!';
      if (transferRequest.new_race_distance) {
        if (transferRequest.new_race_distance === 'Lite') {
          message += ` Runner assigned to Lite program.`;
        } else {
          message += ` Runner assigned to ${transferRequest.new_race_distance} program.`;
        }
      }
      setSuccessMessage(message);
      
      // Start the removal animation
      setRemovingTransferId(requestId);
      
      // Wait for animation to complete, then refresh data
      setTimeout(() => {
        setRemovingTransferId(null);
        setSuccessMessage('');
        loadActionRequests();
      }, 500); // 500ms for the slide animation
    } catch (error) {
      console.error('Error closing transfer request:', error);
      alert('Failed to close transfer request. Please try again.');
    }
  };

  const handleRejectTransfer = async (requestId) => {
    try {
      // Check authentication first to satisfy RLS policies
      if (!isAuthenticated || !user) {
        console.error('User not authenticated');
        alert('Authentication required. Please log in again.');
        return;
      }

      // Get current session to ensure it's valid
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        console.error('Session error:', authError);
        alert('Session expired. Please log in again.');
        return;
      }

      const { error: updateError } = await supabase
        .from('rhwb_action_requests')
        .update({
          status: 'rejected',
          closed_date: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error rejecting transfer request:', updateError);
        alert('Failed to reject transfer request. Please try again.');
        return;
      }

      setSuccessMessage('Transfer request rejected.');

      // Start the removal animation
      setRemovingTransferId(requestId);

      // Wait for animation to complete, then refresh data
      setTimeout(() => {
        setRemovingTransferId(null);
        setSuccessMessage('');
        loadActionRequests();
      }, 500);
    } catch (error) {
      console.error('Error rejecting transfer request:', error);
      alert('Failed to reject transfer request. Please try again.');
    }
  };

  // Handle FinalSurge transfer
  const handleFinalSurgeTransfer = async (request) => {
    try {
      setFsTransferLoading(request.id);
      
      const result = await finalSurgeService.transferRunner(
        request.runner_email_id,
        runnerDetails[request.runner_email_id]?.runner_name || request.runner_email_id,
        request.id
      );

      if (result.success) {
        setSuccessMessage(result.message);
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        alert(`Transfer failed: ${result.message}`);
      }
    } catch (error) {
      console.error('FinalSurge transfer error:', error);
      alert(`Transfer failed: ${error.message}`);
    } finally {
      setFsTransferLoading(null);
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
                              onClick={() => updateActiveTab('transfer')}
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
                              onClick={() => updateActiveTab('deferral')}
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
                              onChange={(e) => updateShowCompleted(e.target.checked)}
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

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 animate-pulse">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800 font-medium">{successMessage}</span>
              </div>
            )}

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
                    <div 
                      key={request.id || index} 
                      className={`border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all duration-500 ease-in-out ${
                        removingTransferId === request.id 
                          ? 'transform -translate-x-full opacity-0 max-h-0 overflow-hidden' 
                          : 'transform translate-x-0 opacity-100 max-h-96'
                      }`}
                    >
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
                              <span className="font-medium">From:</span>{' '}
                              <span className="text-gray-900">
                                {request.current_segment || 'N/A'}
                              </span>
                              <span className="text-gray-400">{' • '}</span>
                              <span className="text-gray-900">
                                {request.current_race_distance || 'N/A'}
                              </span>
                              {request.current_program_level && (
                                <span className="text-gray-500"> ({request.current_program_level})</span>
                              )}
                              {request.current_activity && (
                                <>
                                  <span className="text-gray-400">{' • '}</span>
                                  <span className="text-gray-900">{request.current_activity}</span>
                                </>
                              )}
                              <br />
                              <span className="font-medium">To:</span>{' '}
                              <span className="text-blue-700 font-medium">
                                {request.new_segment || 'N/A'}
                              </span>
                              <span className="text-gray-400">{' • '}</span>
                              <span className="text-blue-700 font-medium">
                                {request.new_race_distance || 'N/A'}
                              </span>
                              {request.new_program_level && (
                                <span className="text-gray-500"> ({request.new_program_level})</span>
                              )}
                              {request.new_activity && (
                                <>
                                  <span className="text-gray-400">{' • '}</span>
                                  <span className="text-blue-700 font-medium">{request.new_activity}</span>
                                </>
                              )}
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
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleFinalSurgeTransfer(request)}
                                disabled={fsTransferLoading === request.id}
                                className="px-2 sm:px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center space-x-1"
                              >
                                {fsTransferLoading === request.id ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Transferring...</span>
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Transfer in FS</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setPendingTransferId(request.id);
                                  setShowTransferConfirmation(true);
                                }}
                                className="px-2 sm:px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Mark Completed
                              </button>
                              <button
                                onClick={() => {
                                  setPendingRejectId(request.id);
                                  setShowRejectConfirmation(true);
                                }}
                                className="px-2 sm:px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
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
                      <div className="flex items-center justify-between sm:justify-end space-x-2">
                        {getStatusBadge(request.status)}
                        {request.status !== 'closed' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleFinalSurgeTransfer(request)}
                              disabled={fsTransferLoading === request.id}
                              className="px-2 sm:px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 flex items-center space-x-1"
                            >
                              {fsTransferLoading === request.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Removing...</span>
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Remove in FS</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setPendingTransferId(request.id);
                                setShowTransferConfirmation(true);
                              }}
                              className="px-2 sm:px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Mark Completed
                            </button>
                          </div>
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transfer Confirmation Modal */}
      {showTransferConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">Confirm Completion</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure this action is complete? This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTransferConfirmation(false);
                  setPendingTransferId(null);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingTransferId) {
                    handleCloseTransfer(pendingTransferId);
                  }
                  setShowTransferConfirmation(false);
                  setPendingTransferId(null);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">Reject Transfer Request</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to reject this request? This will mark the request as <span className="font-semibold">rejected</span>.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowRejectConfirmation(false);
                  setPendingRejectId(null);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingRejectId) {
                    handleRejectTransfer(pendingRejectId);
                  }
                  setShowRejectConfirmation(false);
                  setPendingRejectId(null);
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmallCouncil; 