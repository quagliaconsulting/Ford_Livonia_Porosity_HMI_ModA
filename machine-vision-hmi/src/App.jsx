import React, { useState, useEffect } from 'react';

// Import the refactored components
import Header from './components/Header';
import MetadataBar from './components/MetadataBar';
import CameraGrid from './components/CameraGrid';
import ExpandedCameraModal from './components/ExpandedCameraModal';
import { CameraService } from './api/cameraService'; // Import CameraService

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

// Main App component
const App = () => {
  const [selectedCamera, setSelectedCamera] = useState(null); // Stores serial_number
  const [selectedCameraState, setSelectedCameraState] = useState(null); // Stores { status, detections, imageUrl, latestImageId }
  const [cameras, setCameras] = useState([]); // Stores array of camera objects
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Static metadata for now, can be dynamic later
  const metadata = {
    customer: 'Ford',
    site: 'Livonia Transmission',
    line: 'Mod A',
    serialNo: '387090', // This seems like a part serial, not app/line serial. Clarify if needed.
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

  // Fetch cameras on component mount
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        setLoading(true);
        const camerasData = await CameraService.getAllCameras();
        setCameras(camerasData || []); // Ensure cameras is always an array
        setError(null);
      } catch (err) {
        console.error('Failed to fetch cameras:', err);
        setError(err.message || 'Failed to load cameras. Please try again later.');
        setCameras([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);
  
  // Callback for when a camera card is selected
  // `id` is camera.serial_number, `cameraFullState` is { status, detections, imageUrl, latestImageId }
  const handleCameraSelect = (id, cameraFullState) => {
    setSelectedCamera(id);
    setSelectedCameraState(cameraFullState);
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
      {loading ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-500">Loading cameras...</p>
        </div>
      ) : error ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-red-500 text-center px-4">{error}</p>
        </div>
      ) : (
        <CameraGrid 
          cameras={cameras} // Pass the array of camera objects
          onSelect={handleCameraSelect} 
        />
      )}

      {/* Render modal conditionally */}
      {selectedCamera && selectedCameraState && (
        <ExpandedCameraModal
          cameraId={selectedCamera} // This is serial_number
          initialState={selectedCameraState} // This is { status, detections, imageUrl, latestImageId }
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default App;
