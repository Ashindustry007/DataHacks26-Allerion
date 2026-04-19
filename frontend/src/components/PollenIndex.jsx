import React from 'react';

const PollenIndex = ({ index, severity }) => {
  const getColor = () => {
    if (index <= 1) return 'bg-green-500';
    if (index <= 2) return 'bg-yellow-500';
    if (index <= 3) return 'bg-orange-500';
    if (index <= 4) return 'bg-red-500';
    return 'bg-red-700';
  };

  return (
    <div className={`relative w-48 h-48 rounded-full flex items-center justify-center ${getColor()}`}>
      <div className="absolute text-white text-5xl font-bold">{index}</div>
      <div className="absolute bottom-4 text-white text-lg">{severity}</div>
    </div>
  );
};

export default PollenIndex;
