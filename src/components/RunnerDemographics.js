import React from 'react';

const RunnerDemographics = ({ runner }) => {
  return (
    <div className="flex space-x-6 text-sm text-white/90">
      <div>
        <span>Gender: {runner.gender || '-'}</span>
      </div>
      <div>
        <span>Age: {runner.age || '-'}</span>
      </div>
    </div>
  );
};

export default RunnerDemographics;