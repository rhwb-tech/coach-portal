import React from 'react';
import { Users } from 'lucide-react';

const RunnerFamilyMembers = ({ runner }) => {
  // Placeholder component - you will provide logic later
  return (
    <div className="bg-purple-50 rounded-xl p-4">
      <div className="flex items-center mb-2">
        <Users className="h-4 w-4 text-purple-600 mr-2" />
        <span className="text-sm font-medium text-purple-700">Family Members</span>
      </div>
      <div className="text-sm text-purple-600">
        Family members functionality will be added here
      </div>
    </div>
  );
};

export default RunnerFamilyMembers;