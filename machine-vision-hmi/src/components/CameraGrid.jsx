// CameraGrid.jsx
import React from 'react';
import CameraCard from './CameraCard';

const CameraGrid = ({ cameraIds, onSelect }) => {
  return (
    <div className="flex-grow mx-auto p-0.5 w-full max-w-[98vw] overflow-auto">
      <div className="flex flex-wrap justify-center items-start gap-0.5 h-full">
        {cameraIds.map((id) => (
          <CameraCard key={id} id={id} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
};

export default CameraGrid; 