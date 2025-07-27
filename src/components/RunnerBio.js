import React from 'react';
import { User } from 'lucide-react';

const RunnerBio = ({ runner }) => {
  // Placeholder component - you will provide logic later
  return (
    <div className="bg-green-50 rounded-xl p-4">
      <div className="flex items-center mb-2">
        <User className="h-4 w-4 text-green-600 mr-2" />
        <span className="text-sm font-medium text-green-700">Runner Bio</span>
      </div>
      <div className="text-sm text-green-600">
        Runner biography functionality will be added here
      </div>
    </div>
  );
};

export default RunnerBio;