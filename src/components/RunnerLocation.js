import React from 'react';
import { MapPin } from 'lucide-react';

const RunnerLocation = ({ runner }) => {
  return (
    <div>
      {runner.location ? (
        <div className="flex items-center text-gray-700">
          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
          {runner.location}
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      )}
    </div>
  );
};

export default RunnerLocation;