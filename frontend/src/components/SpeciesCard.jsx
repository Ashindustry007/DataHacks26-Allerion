import React from 'react';

const SpeciesCard = ({ species }) => {
  return (
    <div className="border p-4 my-2">
      <h3 className="font-bold">{species.name}</h3>
      <p>Pollen Index: {species.pollen_index}</p>
      <p>Stage: {species.current_stage}</p>
      <p>Confidence: {species.confidence}</p>
    </div>
  );
};

export default SpeciesCard;
