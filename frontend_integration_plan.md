# Frontend Integration Plan

This document outlines the changes required to integrate the React frontend with the new Python backend API.

## 1. API Service Layer

Create a new directory for API services:

```
machine-vision-hmi/src/api/
```

### 1.1 Base API Service

Create a file `api.js` that will handle common API functionality:

```javascript
// machine-vision-hmi/src/api/api.js

/**
 * Base API service for making HTTP requests
 */
const API_BASE_URL = '/api';

async function fetchWithError(url, options = {}) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.status}`);
  }
  
  return response.json();
}

export const ApiService = {
  get: (endpoint) => fetchWithError(`${API_BASE_URL}${endpoint}`),
  
  post: (endpoint, data) => fetchWithError(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }),
  
  put: (endpoint, data) => fetchWithError(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }),
  
  patch: (endpoint, data) => fetchWithError(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }),
  
  delete: (endpoint) => fetchWithError(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
  }),
};
```

### 1.2 Domain-Specific Services

Create individual service files for each domain:

```javascript
// machine-vision-hmi/src/api/cameraService.js
import { ApiService } from './api';

export const CameraService = {
  getAllCameras: () => ApiService.get('/cameras'),
  
  getCamera: (serialNumber) => ApiService.get(`/cameras/${serialNumber}`),
  
  getCameraLatest: (serialNumber) => ApiService.get(`/cameras/${serialNumber}/latest`),
};

// machine-vision-hmi/src/api/imageService.js
import { ApiService } from './api';

export const ImageService = {
  getLatestImages: () => ApiService.get('/images/latest'),
  
  getImage: (imageId) => ApiService.get(`/images/${imageId}`),
  
  getImageUrl: (imageId) => `/api/images/${imageId}/file`,
};

// machine-vision-hmi/src/api/defectService.js
import { ApiService } from './api';

export const DefectService = {
  getDefectsForImage: (imageId) => ApiService.get(`/defects/image/${imageId}`),
  
  getDefect: (defectId) => ApiService.get(`/defects/${defectId}`),
  
  updateDefectDisposition: (defectId, disposition, notes) => 
    ApiService.patch(`/defects/${defectId}`, { 
      disposition, 
      notes 
    }),
  
  getDefectStatistics: () => ApiService.get('/defects/statistics/summary'),
};

// machine-vision-hmi/src/api/regionService.js
import { ApiService } from './api';

export const RegionService = {
  getRegionsForCamera: (cameraId) => ApiService.get(`/regions/camera/${cameraId}`),
  
  getRegion: (regionId) => ApiService.get(`/regions/${regionId}`),
  
  createRegion: (regionData) => ApiService.post('/regions', regionData),
  
  updateRegion: (regionId, regionData) => ApiService.put(`/regions/${regionId}`, regionData),
  
  deleteRegion: (regionId) => ApiService.delete(`/regions/${regionId}`),
};
```

## 2. Component Updates

### 2.1 App.jsx Changes

Update `App.jsx` to fetch camera IDs from the API and metadata:

```javascript
// Changes to App.jsx
import React, { useState, useEffect } from 'react';
import { CameraService } from './api/cameraService';
// Other imports...

const App = () => {
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [selectedCameraState, setSelectedCameraState] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [metadata, setMetadata] = useState({
    customer: 'Ford',
    site: 'Livonia Transmission',
    line: 'Mod A',
    serialNo: '387090',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch cameras on component mount
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        setLoading(true);
        const camerasData = await CameraService.getAllCameras();
        setCameras(camerasData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch cameras:', err);
        setError('Failed to load cameras. Please try again later.');
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);

  // Rest of the component...

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      <MetadataBar metadata={metadata} />
      {loading ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-gray-500">Loading cameras...</p>
        </div>
      ) : error ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <CameraGrid 
          cameras={cameras} 
          onSelect={handleCameraSelect} 
        />
      )}

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
```

### 2.2 CameraGrid.jsx Changes

Update `CameraGrid.jsx` to work with camera data from the API:

```javascript
// Changes to CameraGrid.jsx
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
```

### 2.3 CameraCard.jsx Changes

Make significant updates to `CameraCard.jsx` to use the backend API:

```javascript
// Changes to CameraCard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { CameraService } from '../api/cameraService';
import { ImageService } from '../api/imageService';
import { DefectService } from '../api/defectService';

const CameraCard = ({ camera, onSelect }) => {
  const [status, setStatus] = useState({ failed: false, timestamp: new Date(), imageType: 'good' });
  const [detections, setDetections] = useState([]);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [latestImageId, setLatestImageId] = useState(null);
  const imageRef = useRef(null);
  const pollingInterval = useRef(null);

  const updateImageDimensions = () => {
    if (imageRef.current) {
      const img = imageRef.current; 
      const container = img.parentElement;
      if (!container) return;
      const containerWidth = container.clientWidth; 
      const containerHeight = container.clientHeight;
      const naturalWidth = img.naturalWidth; 
      const naturalHeight = img.naturalHeight;
      if (naturalWidth === 0 || naturalHeight === 0) return;
      
      let displayWidth, displayHeight;
      const containerAspect = containerWidth / containerHeight; 
      const imageAspect = naturalWidth / naturalHeight;
      
      if (imageAspect > containerAspect) { 
        displayWidth = containerWidth; 
        displayHeight = containerWidth / imageAspect; 
      } else { 
        displayHeight = containerHeight; 
        displayWidth = containerHeight * imageAspect; 
      }
      
      const offsetLeft = (containerWidth - displayWidth) / 2; 
      const offsetTop = (containerHeight - displayHeight) / 2;
      
      setImageDimensions({ width: displayWidth, height: displayHeight, offsetLeft, offsetTop });
    }
  };

  const fetchCameraStatus = async () => {
    try {
      setLoading(true);
      const cameraStatus = await CameraService.getCameraLatest(camera.serial_number);
      
      // If we have an image
      if (cameraStatus.latest_image_id) {
        setLatestImageId(cameraStatus.latest_image_id);
        setImageUrl(ImageService.getImageUrl(cameraStatus.latest_image_id));
        
        // Set status based on defects
        setStatus({
          failed: cameraStatus.has_defects,
          timestamp: cameraStatus.timestamp || new Date(),
          imageType: cameraStatus.has_defects ? 'bad' : 'good'
        });
        
        // If we have defects, fetch them
        if (cameraStatus.has_defects) {
          const defectsData = await DefectService.getDefectsForImage(cameraStatus.latest_image_id);
          setDetections(defectsData);
        } else {
          setDetections([]);
        }
      } else {
        // No image available
        setStatus({
          failed: false,
          timestamp: new Date(),
          imageType: 'good'
        });
        setImageUrl('');
        setDetections([]);
      }
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error(`Error fetching status for camera ${camera.serial_number}:`, err);
      setError(`Failed to load camera data: ${err.message}`);
      setLoading(false);
    }
  };

  // Initial fetch and setup
  useEffect(() => {
    fetchCameraStatus();
    
    // Set up polling for updates
    pollingInterval.current = setInterval(fetchCameraStatus, 30000); // 30 seconds
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [camera.serial_number]);

  // Handle image dimensions
  useEffect(() => {
    let observer; 
    let currentImageRef = imageRef.current;
    
    const initObserver = () => {
      if (currentImageRef) {
        observer = new ResizeObserver(updateImageDimensions);
        observer.observe(currentImageRef);
        updateImageDimensions();
        currentImageRef.addEventListener('load', updateImageDimensions);
      }
    }
    
    const handleImageLoad = () => updateImageDimensions();
    const timeoutId = setTimeout(initObserver, 50);
    
    return () => {
      clearTimeout(timeoutId);
      if (currentImageRef) {
        if (observer) { 
          observer.unobserve(currentImageRef); 
          observer.disconnect(); 
        }
        currentImageRef.removeEventListener('load', handleImageLoad);
      }
    };
  }, [imageUrl]);

  return (
    <div
      className={`border-2 rounded-lg bg-white shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col w-[32%] ${status.failed ? 'border-red-500 flashing-border' : 'border-gray-200'}`}
      onClick={() => onSelect(camera.serial_number, { status, detections })}
    >
      <div className="flex justify-between items-center p-2 flex-shrink-0">
        <h3 className="font-semibold">Camera {camera.serial_number}</h3>
        {loading ? (
          <span className="text-gray-400 text-xs">Loading...</span>
        ) : status.failed ? (
          <X className="text-red-500" />
        ) : (
          <CheckCircle className="text-green-500" />
        )}
      </div>
      <div className="relative flex-1 bg-gray-100 overflow-hidden min-h-0">
        <div className="w-full h-full flex items-center justify-center">
          {error ? (
            <p className="text-red-500 text-xs p-2 text-center">{error}</p>
          ) : loading ? (
            <p className="text-gray-400 text-xs">Loading image...</p>
          ) : (
            <div className="relative h-full w-full">
              {imageUrl ? (
                <img 
                  ref={imageRef} 
                  src={imageUrl} 
                  alt={`Camera ${camera.serial_number} feed`} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.warn(`Error loading image for camera ${camera.serial_number}`);
                    e.target.onerror = null;
                    e.target.src = `/images/camera${camera.serial_number}.jpg`; // Fallback
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-400 text-xs">No image available</p>
                </div>
              )}
              
              {/* Detection overlay - only show for failed status with detections */}
              {status.failed && detections.length > 0 && detections.map((detection) => (
                <div 
                  key={detection.id} 
                  style={{
                    position: 'absolute',
                    left: `${detection.normalized.x_center * 100}%`,
                    top: `${detection.normalized.y_center * 100}%`,
                    width: `${detection.normalized.width * 100}%`,
                    height: `${detection.normalized.height * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    border: '0.5px solid red',
                    backgroundColor: 'transparent',
                    pointerEvents: 'none'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="p-2 text-xs text-gray-600 flex-shrink-0">
        Last update: {status.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'N/A'}
      </div>
    </div>
  );
};

export default CameraCard;
```

### 2.4 ExpandedCameraModal.jsx Changes

Make significant updates to `ExpandedCameraModal.jsx`:

```javascript
// Significant changes to ExpandedCameraModal.jsx for database integration
// Only showing key changes here, as the full component is extensive

// Add imports for API services
import { ImageService } from '../api/imageService';
import { DefectService } from '../api/defectService';
import { RegionService } from '../api/regionService';

// Replace localStorage usage with API calls in these functions:

// 1. Replace region loading from localStorage
useEffect(() => {
  const loadRegions = async () => {
    try {
      const regions = await RegionService.getRegionsForCamera(cameraId);
      
      // Convert to the same format used in localStorage
      const regionsObj = {};
      regions.forEach(region => {
        regionsObj[region.region_id] = {
          sizeThreshold: region.size_threshold,
          densityThreshold: region.density_threshold,
          proximityThreshold: region.proximity_threshold,
          polygon: region.polygon,
          lastUpdated: region.updated_at,
          cameraId: region.camera_id,
          id: region.id  // Keep the backend ID for updates
        };
      });
      
      setSavedRegions(regionsObj);
    } catch (error) {
      console.error("Error loading regions:", error);
    }
  };
  
  loadRegions();
}, [cameraId]);

// 2. Replace region saving with API call
const saveRegionParameters = async () => {
  if (!currentRegionId) return;
  
  // Create the region data object
  const regionData = {
    sizeThreshold,
    densityThreshold,
    proximityThreshold,
    lastUpdated: new Date().toISOString()
  };
  
  // Update the local state first for immediate feedback
  const updatedRegions = { ...savedRegions, [currentRegionId]: regionData };
  setSavedRegions(updatedRegions);
  
  try {
    // Check if this region already exists in the backend
    const existingRegion = Object.values(savedRegions).find(r => 
      r.region_id === currentRegionId && r.id);
    
    if (existingRegion) {
      // Update existing region
      await RegionService.updateRegion(existingRegion.id, {
        size_threshold: sizeThreshold,
        density_threshold: densityThreshold,
        proximity_threshold: proximityThreshold
      });
    } else {
      // Create new region
      await RegionService.createRegion({
        camera_id: cameraId,
        region_id: currentRegionId,
        size_threshold: sizeThreshold,
        density_threshold: densityThreshold,
        proximity_threshold: proximityThreshold,
        polygon: currentPolygonPoints
      });
    }
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  } catch (error) {
    console.error("Error saving region:", error);
    // Revert the local state if save failed
    setSavedRegions(savedRegions);
  }
};

// 3. Replace addNewRegion with API call
const addNewRegion = async () => {
  if (!newRegionId.trim() || currentPolygonPoints.length < 3) return;
  
  try {
    // Create new region in the backend
    const newRegion = await RegionService.createRegion({
      camera_id: cameraId,
      region_id: newRegionId,
      size_threshold: sizeThreshold,
      density_threshold: densityThreshold,
      proximity_threshold: proximityThreshold,
      polygon: currentPolygonPoints,
      active: true
    });
    
    // Update the local state
    const updatedRegions = { 
      ...savedRegions, 
      [newRegionId]: {
        sizeThreshold, 
        densityThreshold, 
        proximityThreshold, 
        polygon: currentPolygonPoints,
        lastUpdated: new Date().toISOString(),
        cameraId,
        id: newRegion.id  // Store the backend ID for future updates
      }
    };
    
    setSavedRegions(updatedRegions);
    setCurrentRegionId(newRegionId);
    setNewRegionId('');
    setShowRegionForm(false);
    setCurrentPolygonPoints([]);
    setIsDrawingRegion(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  } catch (error) {
    console.error("Error creating region:", error);
  }
};

// 4. Replace deleteRegion with API call
const deleteRegion = async (regionId) => {
  // Find the backend ID for this region
  const regionToDelete = savedRegions[regionId];
  if (!regionToDelete || !regionToDelete.id) return;
  
  try {
    // Delete from backend
    await RegionService.deleteRegion(regionToDelete.id);
    
    // Update local state
    const { [regionId]: removed, ...updatedRegions } = savedRegions;
    setSavedRegions(updatedRegions);
    
    if (currentRegionId === regionId) {
      setCurrentRegionId('');
    }
  } catch (error) {
    console.error("Error deleting region:", error);
  }
};

// 5. Replace defect disposition with API call
const handleDisposition = async (disp) => {
  if (selectedDefectIndex < 0 || selectedDefectIndex >= visibleDetections.length) {
    console.warn("Disposition clicked with no valid defect selected.");
    return;
  }
  
  const selectedDefect = visibleDetections[selectedDefectIndex];
  console.log(`Disposition for Defect ${selectedDefect.id} (Index ${selectedDefectIndex}): ${disp}`);
  
  try {
    // Update the defect disposition in the backend
    await DefectService.updateDefectDisposition(
      selectedDefect.id, 
      disp, 
      `Dispositioned by operator at ${new Date().toISOString()}`
    );
    
    // Update local state to reflect the change
    const updatedDetections = [...visibleDetections];
    updatedDetections[selectedDefectIndex] = {
      ...updatedDetections[selectedDefectIndex],
      disposition: disp
    };
    
    setDetections(updatedDetections);
    
    // Optionally move to the next defect
    handleNextDefect();
  } catch (error) {
    console.error("Error updating defect disposition:", error);
  }
};

// 6. Replace static image loading with API image loading
useEffect(() => {
  const loadImageAndDefects = async () => {
    // Skip if we're already showing a valid image or just need to clear
    if (imageType === 'good') {
      setDetections([]);
      return;
    }
    
    try {
      // Use most recent image for this camera
      const cameraStatus = await CameraService.getCameraLatest(cameraId);
      
      if (cameraStatus.latest_image_id) {
        // Set the current image URL
        setImageUrl(ImageService.getImageUrl(cameraStatus.latest_image_id));
        
        // Get defects for this image
        const defectsData = await DefectService.getDefectsForImage(cameraStatus.latest_image_id);
        setDetections(defectsData);
      } else {
        // No image available
        setImageUrl('');
        setDetections([]);
      }
    } catch (error) {
      console.error("Error loading image and defects:", error);
      setDetections([]);
    }
  };
  
  loadImageAndDefects();
}, [cameraId, imageType]);
```

## 3. Implementation Approach

### 3.1 Development Workflow

1. Start by implementing the API services
2. Update the CameraCard component first
3. Test the basic camera grid view with real data
4. Implement the ExpandedCameraModal region management
5. Implement defect disposition functionality
6. Add loading states and error handling

### 3.2 Testing Strategy

1. Create a development proxy in Vite to forward API requests to the backend
2. Test with mock data first if the backend is not ready
3. Implement comprehensive error handling
4. Test edge cases like missing images, empty defect lists, etc.

### 3.3 Vite Proxy Configuration

Add a proxy configuration to the Vite config for local development:

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

## 4. Deployment Considerations

### 4.1 Build Configuration

Update the build configuration to accommodate the backend:

1. Set the backend as the API server in production
2. Configure CORS on the backend to allow frontend requests
3. Consider using a reverse proxy (Nginx) in production to serve both the frontend and backend

### 4.2 Environment Variables

Create environment-specific configurations:

```javascript
// .env.development
VITE_API_BASE_URL=http://localhost:8000/api

// .env.production
VITE_API_BASE_URL=/api
```

Then use these in the API service:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
```