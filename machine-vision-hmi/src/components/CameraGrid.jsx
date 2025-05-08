// CameraGrid.jsx
import React from 'react';
import CameraCard from './CameraCard';

const CameraGrid = ({ cameras, onSelect }) => {
  if (!cameras || cameras.length === 0) {
    return (
      <div className="flex-grow mx-auto p-0.5 w-full max-w-[98vw] overflow-auto">
        <div className="flex flex-wrap justify-center items-center h-full">
          <p className="text-gray-500">No cameras available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow mx-auto p-0.5 w-full max-w-[98vw] overflow-auto">
      <div className="flex flex-wrap justify-center items-start gap-0.5 h-full">
        {cameras.map((camera) => (
          <CameraCard
            key={camera.serial_number}
            camera={camera}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default CameraGrid; 