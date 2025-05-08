import React from 'react';

const MetadataBar = ({ metadata }) => {
  return (
    <div className="bg-gray-100 border-b flex-shrink-0">
      <div className="max-w-7xl mx-auto p-2 flex flex-wrap justify-between gap-x-4 gap-y-1"> 
        <span className="font-bold text-base">Customer: {metadata.customer}</span>
        <span className="font-bold text-base">Site: {metadata.site}</span>
        <span className="font-bold text-base">Line: {metadata.line}</span>
        <span className="font-bold text-base">Serial: {metadata.serialNo}</span>
      </div>
    </div>
  );
};

export default MetadataBar; 