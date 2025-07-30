import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const SmallCouncil = ({ coachEmail }) => {
  const [transferRequests, setTransferRequests] = useState([]);
  const [deferralRequests, setDeferralRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load action requests from database
  useEffect(() => {
    const loadActionRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch transfer requests
        const { data: transferData, error: transferError } = await supabase
          .from('rhwb_action_requests')
          .select('*')
          .eq('action_type', 'Transfer Runner')
          .order('created_at', { ascending: false });

        if (transferError) {
          console.error('Error fetching transfer requests:', transferError);
          throw transferError;
        }

        // Fetch deferral requests
        const { data: deferralData, error: deferralError } = await supabase
          .from('rhwb_action_requests')
          .select('*')
          .eq('action_type', 'Defer Runner')
          .order('created_at', { ascending: false });

        if (deferralError) {
          console.error('Error fetching deferral requests:', deferralError);
          throw deferralError;
        }

        setTransferRequests(transferData || []);
        setDeferralRequests(deferralData || []);

      } catch (error) {
        console.error('Failed to load action requests:', error);
        setError('Failed to load action requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadActionRequests();
  }, [coachEmail]);

  // Get runner details for display
  const getRunnerDetails = async (emailId) => {
    try {
      const { data, error } = await supabase
        .from('runners_profile')
        .select('runner_name, race_distance, location')
        .eq('email_id', emailId)
        .single();

      if (error) {
        console.error('Error fetching runner details:', error);
        return { runner_name: 'Unknown Runner', race_distance: 'N/A', location: 'N/A' };
      }

      return data || { runner_name: 'Unknown Runner', race_distance: 'N/A', location: 'N/A' };
    } catch (error) {
      console.error('Error fetching runner details:', error);
      return { runner_name: 'Unknown Runner', race_distance: 'N/A', location: 'N/A' };
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Small Council</h1>
        <p className="text-gray-600">Review and manage transfer and deferral requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transfer Requests Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Transfer Requests</h2>
            <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {transferRequests.length}
            </span>
          </div>

          {transferRequests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No transfer requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transferRequests.map((request, index) => (
                <div key={request.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {request.runner_email_id}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Requested by: {request.requestor_email_id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  {request.comments && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Comments:</span> {request.comments}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deferral Requests Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Clock className="h-6 w-6 text-orange-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Deferral Requests</h2>
            <span className="ml-auto bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {deferralRequests.length}
            </span>
          </div>

          {deferralRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No deferral requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deferralRequests.map((request, index) => (
                <div key={request.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {request.runner_email_id}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Requested by: {request.requestor_email_id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  {request.comments && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Comments:</span> {request.comments}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmallCouncil; 