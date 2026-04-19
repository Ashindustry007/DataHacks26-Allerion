import React from 'react';

const AdvisoryPanel = ({ advisories }) => {
  if (!advisories || advisories.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4">
      <p className="font-bold">Health Advisory</p>
      {advisories.map((advisory, index) => (
        <p key={index}>{advisory}</p>
      ))}
    </div>
  );
};

export default AdvisoryPanel;
