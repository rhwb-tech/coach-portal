import React from 'react';
import { FileText } from 'lucide-react';

const RunnerCoachNotes = ({ runner }) => {
  // Placeholder component - you will provide logic later
  return (
    <div className="bg-yellow-50 rounded-xl p-4">
      <div className="flex items-center mb-2">
        <FileText className="h-4 w-4 text-yellow-600 mr-2" />
        <span className="text-sm font-medium text-yellow-700">Coach Notes</span>
      </div>
      <div className="text-sm text-yellow-600">
        Coach notes functionality will be added here
      </div>
    </div>
  );
};

export default RunnerCoachNotes;