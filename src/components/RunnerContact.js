import React from 'react';
import { Phone } from 'lucide-react';

const RunnerContact = ({ runner }) => {
  return (
    <div>
      {runner.phone_no ? (
        <div className="flex items-center text-gray-700">
          <Phone className="h-4 w-4 mr-1 text-gray-400" />
          {runner.phone_no}
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      )}
    </div>
  );
};

export default RunnerContact;