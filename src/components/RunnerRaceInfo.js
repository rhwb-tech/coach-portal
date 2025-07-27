import React from 'react';

const RunnerRaceInfo = ({ runner }) => {
  return (
    <div>
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
        {runner.race_distance}
      </span>
    </div>
  );
};

export default RunnerRaceInfo;