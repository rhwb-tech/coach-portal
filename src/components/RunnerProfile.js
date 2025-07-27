import React from 'react';
import { User } from 'lucide-react';
import { getAvatarInitials } from '../services/coachService';

const RunnerProfile = ({ runner }) => {
  return (
    <div className="flex items-center">
      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold mr-3">
        {getAvatarInitials(runner.runner_name || 'Unknown')}
      </div>
      <div>
        <div className="font-medium text-white">{runner.runner_name || 'Unknown Runner'}</div>
        <div className="text-sm text-white/80">{runner.email_id}</div>
      </div>
    </div>
  );
};

export default RunnerProfile;