import React, { useState, useEffect } from 'react';

// Import the refactored components
import Header from './components/Header';
import MetadataBar from './components/MetadataBar';
import CameraGrid from './components/CameraGrid';
import ExpandedCameraModal from './components/ExpandedCameraModal';

// Keep CSS needed globally or move to index.css/App.css
const flashingBorder = `
@keyframes flashBorder {
  0% { border-color: rgba(255, 0, 0, 1); box-shadow: 0 0 8px rgba(255, 0, 0, 0.8); }
  50% { border-color: rgba(255, 0, 0, 0.3); box-shadow: 0 0 0px rgba(255, 0, 0, 0.3); }
  100% { border-color: rgba(255, 0, 0, 1); box-shadow: 0 0 8px rgba(255, 0, 0, 0.8); }
}
.flashing-border { animation: flashBorder 1s infinite; border-width: 4px !important; }
.camera-container { width: 100% !important; height: 100% !important; }
.react-transform-component { width: 100% !important; height: 100% !important; }
`;

// Main App component - now much simpler
const App = () => {
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [selectedCameraState, setSelectedCameraState] = useState(null);
  const cameraIds = [1, 2, 3, 4, 5];

  // Metadata - could be moved to config
  const metadata = {
    customer: 'Ford',
    site: 'Livonia Transmission',
    line: 'Mod A',
    serialNo: '387090',
  };

  // Inject global styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = flashingBorder;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Callback for when a camera card is selected
  const handleCameraSelect = (id, cameraState) => {
    setSelectedCamera(id);
    setSelectedCameraState(cameraState);
  };

  // Callback to close the modal
  const handleCloseModal = () => {
    setSelectedCamera(null);
    setSelectedCameraState(null);
  };

  return (
    // Main layout structure
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      <MetadataBar metadata={metadata} />
      <CameraGrid cameraIds={cameraIds} onSelect={handleCameraSelect} />

      {/* Render modal conditionally */}
      {selectedCamera && (
        <ExpandedCameraModal
          cameraId={selectedCamera}
          initialState={selectedCameraState}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default App;
