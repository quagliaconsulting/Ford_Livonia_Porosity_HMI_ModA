import React from 'react';
import CameraCard from './CameraCard'; // Import the refactored card component

const CameraGrid = ({ cameraIds, onSelect }) => {
  return (
    // This container takes up the growing space
    <div className="flex-grow mx-auto p-1 w-full max-w-[98vw]">
      {/* Flexbox layout with centering and wrapping */}
      <div className="flex flex-wrap justify-center items-stretch gap-2 h-full">
        {cameraIds.map((id) => (
          // No need for fragments or placeholders with flex justify-center
          <CameraCard key={id} id={id} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
};

export default CameraGrid; 