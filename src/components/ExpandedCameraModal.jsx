import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Maximize2, Lock, Unlock, X } from 'lucide-react'; // May need pruning
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// TODO: Consider moving utility functions to a separate file
const parseYoloDetections = (fileContent, imageWidth, imageHeight) => {
  if (!fileContent || fileContent.trim() === '') {
    return [];
  }
  return fileContent.trim().split('\n').map((line, index) => {
    const parts = line.trim().split(' ').map(Number);
    const classId = parts[0];
    const x_center_norm = parts[1];
    const y_center_norm = parts[2];
    const width_norm = parts[3];
    const height_norm = parts[4];
    const x_abs = (x_center_norm - width_norm/2) * imageWidth;
    const y_abs = (y_center_norm - height_norm/2) * imageHeight;
    const width_abs = width_norm * imageWidth;
    const height_abs = height_norm * imageHeight;
    return {
      id: `defect-${index}-${Date.now()}`,
      classId,
      normalized: { x_center: x_center_norm, y_center: y_center_norm, width: width_norm, height: height_norm },
      x: x_abs, y: y_abs, width: width_abs, height: height_abs,
      label: `Defect ${classId}`
    };
  });
};
const pixelsToMillimeters = (pixels, pixelDensity) => {
  return pixels * (7.9375 / 95);
};
const millimetersToPixels = (mm, pixelDensity) => {
  return mm * (95 / 7.9375);
};

// Renamed from ExpandedCamera
const ExpandedCameraModal = ({ cameraId, initialState, onClose }) => {
  // State for pixel density parameter - calibrated based on 95 pixels = 7.9375mm
  const [pixelDensity, setPixelDensity] = useState(12); // Default: ~12 pixels per mm (95px/7.9375mm)
  const [isPixelDensityLocked, setIsPixelDensityLocked] = useState(true);
  
  // Add state for sidebar collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // Start with collapsed sidebar
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  // RegionID management states
  const [currentRegionId, setCurrentRegionId] = useState('');
  const [newRegionId, setNewRegionId] = useState('');
  const [savedRegions, setSavedRegions] = useState({});
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Initialize from the passed state or use defaults
  const [imageType, setImageType] = useState(
    initialState?.status?.imageType || 'good'
  );
  const [detections, setDetections] = useState(
    initialState?.detections || []
  );
  
  // New state variables for density failure analysis
  const [sizeThreshold, setSizeThreshold] = useState(1.0); // Size threshold in mm (default 1.0mm)
  const [densityThreshold, setDensityThreshold] = useState(3); // Number of defects in cluster to trigger density failure
  const [proximityThreshold, setProximityThreshold] = useState(5.0); // Distance in mm to consider defects as clustered
  const [showOnlyFailures, setShowOnlyFailures] = useState(false); // Toggle to show only true failures
  const [failureAnalysisEnabled, setFailureAnalysisEnabled] = useState(false); // Toggle to enable/disable failure analysis
  
  // Existing state variables...
  const [imageWidth, setImageWidth] = useState(5120);
  const [imageHeight, setImageHeight] = useState(5120);
  const [zoomScale, setZoomScale] = useState(1); // Track the current zoom scale
  const [detectionDisplayMode, setDetectionDisplayMode] = useState(0);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 });
  const imageRef = React.useRef(null);
  const [inspectionHistory, setInspectionHistory] = useState([
    ...(initialState?.status ? [{
      id: Date.now(),
      timestamp: initialState.status.timestamp || new Date(),
      imageType: initialState.status.imageType || 'good',
      disposition: initialState.status.failed ? 'Scrap' : 'Part Okay',
    }] : []),
    ...Array(9)
      .fill(null)
      .map((_, i) => ({
        id: i,
        timestamp: new Date(Date.now() - (i + 1) * 3600000),
        imageType: Math.random() < 0.7 ? 'good' : 'bad',
        disposition: Math.random() < 0.7 ? 'Part Okay' : 'Scrap',
      })),
  ]);
  
  // Load saved regions from localStorage on component mount
  useEffect(() => {
    try {
      const savedRegionsData = localStorage.getItem(`camera${cameraId}_regions`);
      if (savedRegionsData) {
        setSavedRegions(JSON.parse(savedRegionsData));
      }
    } catch (error) {
      console.error("Error loading saved regions:", error);
    }
  }, [cameraId]);
  
  // Function to save current parameters to a region
  const saveRegionParameters = () => {
    if (!currentRegionId) return;
    const regionParams = {
      sizeThreshold,
      densityThreshold,
      proximityThreshold,
      lastUpdated: new Date().toISOString(),
      cameraId
    };
    const updatedRegions = { ...savedRegions, [currentRegionId]: regionParams };
    setSavedRegions(updatedRegions);
    try {
      localStorage.setItem(`camera${cameraId}_regions`, JSON.stringify(updatedRegions));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving region parameters:", error);
    }
  };
  
  // Function to load parameters from a saved region
  const loadRegionParameters = (regionId) => {
    if (!regionId || !savedRegions[regionId]) return;
    const params = savedRegions[regionId];
    setSizeThreshold(params.sizeThreshold);
    setDensityThreshold(params.densityThreshold);
    setProximityThreshold(params.proximityThreshold);
    setFailureAnalysisEnabled(true);
    setCurrentRegionId(regionId);
  };
  
  // Function to add a new region
  const addNewRegion = () => {
    if (!newRegionId.trim()) return;
    setCurrentRegionId(newRegionId);
    const regionParams = {
      sizeThreshold,
      densityThreshold,
      proximityThreshold,
      lastUpdated: new Date().toISOString(),
      cameraId
    };
    const updatedRegions = { ...savedRegions, [newRegionId]: regionParams };
    setSavedRegions(updatedRegions);
    try {
      localStorage.setItem(`camera${cameraId}_regions`, JSON.stringify(updatedRegions));
    } catch (error) {
      console.error("Error saving new region:", error);
    }
    setNewRegionId('');
    setShowRegionForm(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };
  
  // Function to delete a region
  const deleteRegion = (regionId) => {
    if (!regionId || !savedRegions[regionId]) return;
    const { [regionId]: removed, ...updatedRegions } = savedRegions;
    setSavedRegions(updatedRegions);
    if (currentRegionId === regionId) {
      setCurrentRegionId('');
    }
    try {
      localStorage.setItem(`camera${cameraId}_regions`, JSON.stringify(updatedRegions));
    } catch (error) {
      console.error("Error deleting region:", error);
    }
  };
  
  // Function to handle sidebar toggle with PIN verification
  const handleSidebarToggle = () => {
    if (!isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    } else {
      setShowPinModal(true);
      setPinInput('');
      setPinError(false);
    }
  };
  
  // Function to verify the entered PIN against current time
  const verifyPin = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimePin = `${currentHour.toString().padStart(2, '0')}${currentMinute.toString().padStart(2, '0')}`;
    if (pinInput === currentTimePin) {
      setIsSidebarCollapsed(false);
      setShowPinModal(false);
      setPinInput('');
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 2000);
    }
  };
  
  // Function to update image dimensions after render or resize
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
      setImageWidth(naturalWidth);
      setImageHeight(naturalHeight);
    }
  };

  // Observer to detect when image dimensions change
  useEffect(() => {
    let observer;
    let currentImageRef = imageRef.current;
    const initObserver = () => {
        if (currentImageRef) {
            observer = new ResizeObserver(updateImageDimensions);
            observer.observe(currentImageRef);
            updateImageDimensions();
            currentImageRef.addEventListener('load', handleImageLoad);
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
  }, [imageType]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateImageDimensions();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      updateImageDimensions();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadDetections = async () => {
      if (imageType === 'good') {
        setDetections([]);
        console.log(`Loading good image for camera ${cameraId} - no detections`);
      } else if (initialState?.detections?.length > 0 && imageType === initialState?.status?.imageType) { // Only use initial if type matches
        setDetections(initialState.detections);
        console.log(`Using existing detections for camera ${cameraId}`);
      } else {
        try {
          console.log(`Loading bad image for camera ${cameraId} - fetching detections`);
          const response = await fetch(`/images/camera${cameraId}_bad.txt`);
          if (response.ok) {
            const yoloContent = await response.text();
            // Use placeholder dimensions for parsing if image not loaded yet
            const imgWidth = imageRef.current?.naturalWidth || 5120;
            const imgHeight = imageRef.current?.naturalHeight || 5120;
            const parsedDetections = parseYoloDetections(yoloContent, imgWidth, imgHeight);
            setDetections(parsedDetections);
            console.log(`Loaded ${parsedDetections.length} detections for camera ${cameraId}`);
          } else {
            console.log(`No detection file found for camera ${cameraId}`);
            setDetections([]);
          }
        } catch (error) {
          console.error(`Error loading detections for camera ${cameraId}:`, error);
          setDetections([]);
        }
      }
    };
    loadDetections();
  }, [cameraId, imageType, initialState]); // Removed imageWidth, imageHeight dependency as it causes loops

  const handleDisposition = (disposition) => {
    const newImageType = disposition === 'Part Okay' ? 'good' : 'bad';
    setImageType(newImageType); // This will trigger the useEffect above to load/clear detections
    const newInspection = {
      id: Date.now(),
      timestamp: new Date(),
      imageType: newImageType,
      disposition: disposition,
    };
    setInspectionHistory((prev) => [newInspection, ...prev.slice(0, 9)]);
  };

  const calculateDistance = (defect1, defect2) => {
    const x1 = defect1.normalized.x_center * imageWidth;
    const y1 = defect1.normalized.y_center * imageHeight;
    const x2 = defect2.normalized.x_center * imageWidth;
    const y2 = defect2.normalized.y_center * imageHeight;
    const pixelDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    return pixelDistance * (7.9375 / 95);
  };

  const analyzeDefects = () => {
    if (!failureAnalysisEnabled || !detections || detections.length === 0) {
      return detections.map(d => ({ ...d, isTrueFail: false, failReason: null }));
    }
    const analyzedDefects = detections.map(defect => {
      const widthMm = defect.width * (7.9375 / 95);
      const heightMm = defect.height * (7.9375 / 95);
      const areaMm = widthMm * heightMm;
      const isSizeFail = Math.max(widthMm, heightMm) >= sizeThreshold;
      return {
        ...defect, widthMm, heightMm, areaMm,
        isTrueFail: isSizeFail, failReason: isSizeFail ? 'Size' : null,
        clusterMembers: []
      };
    });
    for (let i = 0; i < analyzedDefects.length; i++) {
      if (analyzedDefects[i].isTrueFail) continue;
      const nearbyDefects = [];
      for (let j = 0; j < analyzedDefects.length; j++) {
        if (i === j) continue;
        const distance = calculateDistance(analyzedDefects[i], analyzedDefects[j]);
        if (distance <= proximityThreshold) {
          nearbyDefects.push(j);
        }
      }
      if (nearbyDefects.length + 1 >= densityThreshold) {
        analyzedDefects[i].isTrueFail = true;
        analyzedDefects[i].failReason = 'Density';
        analyzedDefects[i].clusterMembers = nearbyDefects;
        nearbyDefects.forEach(idx => {
          analyzedDefects[idx].isTrueFail = true;
          analyzedDefects[idx].failReason = 'Density';
          analyzedDefects[idx].clusterMembers = [...(analyzedDefects[idx].clusterMembers || []), i];
        });
      }
    }
    return analyzedDefects;
  };
  
  const enhancedDetections = useMemo(analyzeDefects, 
    [detections, sizeThreshold, densityThreshold, proximityThreshold, failureAnalysisEnabled]);
  
  const visibleDetections = useMemo(() => {
    if (!showOnlyFailures || !failureAnalysisEnabled) return enhancedDetections;
    return enhancedDetections.filter(d => d.isTrueFail);
  }, [enhancedDetections, showOnlyFailures, failureAnalysisEnabled]);

  // JSX Structure remains largely the same as the original ExpandedCamera
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 overflow-auto p-4">
      <div className="bg-white rounded-lg p-4 w-full mx-4 relative max-h-[90vh] flex flex-col" style={{ maxWidth: "calc(1280px * 1.43)" }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl font-bold z-50 focus:outline-none"
          aria-label="Close"
        >
          &times;
        </button>
        
        {/* Camera Title and Status Indicator */}
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-bold">Camera {cameraId}</h2>
          <div className="ml-2">
            {imageType === 'good' ? (
              <CheckCircle className="text-green-500" size={24} />
            ) : (
              <X className="text-red-500" size={24} />
            )}
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 overflow-hidden h-full">
          {/* Left sidebar for all controls */}
          <div 
            className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-14' : ''} flex-shrink-0 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-100px)] relative bg-white rounded-lg border border-gray-200`}
            style={{
              width: isSidebarCollapsed ? '' : 'calc(18rem * 1.1)' // 18rem (w-72) increased by 10%
            }}
          >
            {/* Collapse/Expand toggle button */}
            <button
              onClick={handleSidebarToggle}
              className="absolute right-1 top-1 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
              title={isSidebarCollapsed ? "Expand controls" : "Collapse controls"}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
            
            <div className={`p-3 ${isSidebarCollapsed ? 'invisible opacity-0 absolute' : 'visible opacity-100'} transition-opacity duration-300`}>
            {/* Image Type Toggle */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Image Type</h3>
                <div className="flex gap-2">
              <button
                onClick={() => setImageType('good')}
                    className={`flex-1 px-3 py-2 rounded text-sm ${
                  imageType === 'good' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Good Image
              </button>
              <button
                onClick={() => setImageType('bad')}
                    className={`flex-1 px-3 py-2 rounded text-sm ${
                  imageType === 'bad' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Bad Image
              </button>
                </div>
            </div>
            
              {/* Detection Display Toggle */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Detection Display</h3>
                <button
                  onClick={() => setDetectionDisplayMode((prev) => (prev + 1) % 3)}
                  className="w-full px-3 py-2 rounded bg-blue-500 text-white text-sm"
                  title="Toggle detection display mode"
                >
                  {detectionDisplayMode === 0 ? 'Full Detections' : 
                   detectionDisplayMode === 1 ? 'Boxes Only' : 
                   'Hide Detections'}
                </button>
              </div>
              
              {/* Zoom controls */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Zoom Controls</h3>
                <div className="grid grid-cols-3 gap-2">
                    <button
                    onClick={() => document.getElementById('zoomIn' + cameraId)?.click()}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 text-sm"
                    >
                      Zoom In
                    </button>
                    <button
                    onClick={() => document.getElementById('zoomOut' + cameraId)?.click()}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 text-sm"
                    >
                      Zoom Out
                    </button>
                    <button
                    onClick={() => document.getElementById('resetZoom' + cameraId)?.click()}
                    className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-200 text-sm"
                    >
                      Reset
                    </button>
                  </div>
              </div>
              
              {/* Pixel Density Calibration */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Calibration</h3>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm">Density:</div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="0.1"
                      value={pixelDensity}
                      onChange={(e) => !isPixelDensityLocked && setPixelDensity(Number(e.target.value))}
                      className="flex-1"
                      disabled={isPixelDensityLocked}
                    />
                    <div className="w-14 text-center font-medium text-sm">{pixelDensity.toFixed(1)}</div>
                    <button
                      onClick={() => setIsPixelDensityLocked(!isPixelDensityLocked)}
                      className="p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                      title={isPixelDensityLocked ? "Unlock calibration" : "Lock calibration"}
                    >
                      {isPixelDensityLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                  <div className="text-xs text-gray-600">
                    Adjust for scale indicator calibration
                  </div>
                </div>
              </div>
              
              {/* Failure Analysis Controls */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Failure Analysis</h3>
                  <button 
                    onClick={() => setFailureAnalysisEnabled(!failureAnalysisEnabled)}
                    className={`px-2 py-1 rounded text-white text-xs ${failureAnalysisEnabled ? 'bg-green-500' : 'bg-gray-400'}`}
                  >
                    {failureAnalysisEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                
                {failureAnalysisEnabled && (
                  <>
                    <button 
                      onClick={() => setShowOnlyFailures(!showOnlyFailures)}
                      className={`w-full px-3 py-1 rounded text-white text-sm mb-3 ${showOnlyFailures ? 'bg-red-500' : 'bg-blue-500'}`}
                    >
                      {showOnlyFailures ? 'Showing Only Failures' : 'Showing All Defects'}
                    </button>
                    
                    {/* Region ID Management */}
                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-sm mb-2">Region Configuration</h4>
                      
                      {/* Current Region Display */}
                      {currentRegionId ? (
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Region: {currentRegionId}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={saveRegionParameters}
                              className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
                              title="Save current parameters to this region"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setCurrentRegionId('')}
                              className="bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-400"
                              title="Clear selected region"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-2 text-xs text-gray-500 italic">
                          No region selected
                        </div>
                      )}
                      
                      {/* Success message */}
                      {saveSuccess && (
                        <div className="mb-2 text-xs text-green-600 bg-green-50 p-1 rounded">
                          ✓ Parameters saved successfully
                        </div>
                      )}
                      
                      {/* Region Selection Dropdown */}
                      {Object.keys(savedRegions).length > 0 && (
                        <div className="mb-2">
                          <label className="block text-xs text-gray-600 mb-1">
                            Load Saved Region:
                          </label>
                          <div className="flex items-center gap-1 flex-wrap">
                            {Object.keys(savedRegions).map(regionId => (
                              <div key={regionId} className="flex items-center">
                                <button
                                  onClick={() => loadRegionParameters(regionId)}
                                  className={`text-xs px-2 py-1 rounded mr-1 ${
                                    currentRegionId === regionId 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {regionId}
                                </button>
                                <button
                                  onClick={() => deleteRegion(regionId)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                  title={`Delete region ${regionId}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Add New Region Form Toggle */}
                      {!showRegionForm ? (
                        <button
                          onClick={() => setShowRegionForm(true)}
                          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 w-full"
                        >
                          + Add New Region
                        </button>
                      ) : (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 mb-1">
                            <input
                              type="text"
                              value={newRegionId}
                              onChange={(e) => setNewRegionId(e.target.value)}
                              placeholder="Enter Region ID"
                              className="flex-1 px-2 py-1 text-xs border rounded"
                            />
                            <button
                              onClick={addNewRegion}
                              disabled={!newRegionId.trim()}
                              className={`px-2 py-1 rounded text-xs ${
                                newRegionId.trim() 
                                  ? 'bg-green-500 text-white hover:bg-green-600' 
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Save
                            </button>
                          </div>
                          <button
                            onClick={() => setShowRegionForm(false)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Size Threshold Control */}
                    <div className="mb-3">
                      <label className="text-sm font-medium block mb-1">Size Threshold: {sizeThreshold.toFixed(1)} mm</label>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="5.0" 
                        step="0.1" 
                        value={sizeThreshold}
                        onChange={(e) => setSizeThreshold(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Defects larger than this are failures
                      </p>
                    </div>
                    
                    {/* Density Threshold Control */}
                    <div className="mb-3">
                      <label className="text-sm font-medium block mb-1">Density Threshold: {densityThreshold} defects</label>
                      <input 
                        type="range" 
                        min="2" 
                        max="10" 
                        step="1" 
                        value={densityThreshold}
                        onChange={(e) => setDensityThreshold(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Number of defects for density failure
                      </p>
                    </div>
                    
                    {/* Proximity Threshold Control */}
                    <div className="mb-3">
                      <label className="text-sm font-medium block mb-1">Proximity: {proximityThreshold.toFixed(1)} mm</label>
                      <input 
                        type="range" 
                        min="1.0" 
                        max="20.0" 
                        step="0.5" 
                        value={proximityThreshold}
                        onChange={(e) => setProximityThreshold(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Max distance between clustered defects
                      </p>
                    </div>
                    
                    {/* Failure Analysis Legend */}
                    <div className="text-xs bg-gray-100 p-2 rounded">
                      <div className="mb-1 font-medium">Legend:</div>
                      <div className="grid grid-cols-1 gap-1">
                        <div className="flex items-center">
                          <div className="w-3 h-3 mr-1 border-2 border-red-500 bg-red-100"></div>
                          <span>Size Failure</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 mr-1 border-2 border-dashed border-red-400 bg-red-100"></div>
                          <span>Density Failure</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 mr-1 border border-red-400"></div>
                          <span>Non-Critical Defect</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* PIN Entry Modal */}
            {showPinModal && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold mb-4">Authentication Required</h3>
                  <p className="mb-4">Please enter the PIN to access controls.</p>
                  
                  <div className="mb-4">
                    <label htmlFor="pin-input" className="block text-sm font-medium text-gray-700 mb-1">PIN:</label>
                    <input
                      id="pin-input"
                      type="password"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="Enter PIN"
                      className={`w-full px-3 py-2 border ${pinError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      maxLength={4}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          verifyPin();
                        }
                      }}
                    />
                    {pinError && (
                      <p className="mt-1 text-red-500 text-sm">Incorrect PIN. Please try again.</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowPinModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={verifyPin}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Collapsed view with vertical icons */}
            <div className={`py-10 px-2 flex flex-col items-center space-y-6 ${isSidebarCollapsed ? 'visible opacity-100' : 'invisible opacity-0 absolute'} transition-opacity duration-300`}>
              <button 
                onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setImageType(prev => prev === 'good' ? 'bad' : 'good')} 
                title={isSidebarCollapsed ? "Authentication required to change settings" : `Switch to ${imageType === 'good' ? 'bad' : 'good'} image`}
                className={`p-1.5 rounded-full ${imageType === 'good' ? 'bg-green-100' : 'bg-red-100'} ${isSidebarCollapsed ? 'cursor-default opacity-80' : 'hover:bg-opacity-80 cursor-pointer'}`}
              >
                {imageType === 'good' ? 
                  <CheckCircle className="text-green-500 h-5 w-5" /> : 
                  <X className="text-red-500 h-5 w-5" />
                }
              </button>
              
              <button 
                onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setDetectionDisplayMode((prev) => (prev + 1) % 3)}
                className={`p-1.5 rounded-full bg-blue-100 ${isSidebarCollapsed ? 'cursor-default opacity-80' : 'hover:bg-opacity-80 cursor-pointer'}`}
                title={isSidebarCollapsed ? "Authentication required to change settings" : (detectionDisplayMode === 0 ? 'Full Detections' : 
                      detectionDisplayMode === 1 ? 'Boxes Only' : 
                      'Hide Detections')}
              >
                <div className="h-5 w-5 flex items-center justify-center text-blue-500 text-xs font-bold">
                  {detectionDisplayMode === 0 ? 'F' : detectionDisplayMode === 1 ? 'B' : 'H'}
                </div>
              </button>
              
              <button 
                onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setFailureAnalysisEnabled(!failureAnalysisEnabled)}
                className={`p-1.5 rounded-full ${failureAnalysisEnabled ? 'bg-green-100' : 'bg-gray-100'} ${isSidebarCollapsed ? 'cursor-default opacity-80' : 'hover:bg-opacity-80 cursor-pointer'}`}
                title={isSidebarCollapsed ? "Authentication required to change settings" : `${failureAnalysisEnabled ? 'Disable' : 'Enable'} failure analysis`}
              >
                <div className="h-5 w-5 flex items-center justify-center text-xs font-bold" 
                  style={{color: failureAnalysisEnabled ? '#10b981' : '#9ca3af'}}>
                  FA
                </div>
              </button>
              
              {failureAnalysisEnabled && (
                <button 
                  onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setShowOnlyFailures(!showOnlyFailures)}
                  className={`p-1.5 rounded-full ${showOnlyFailures ? 'bg-red-100' : 'bg-blue-100'} ${isSidebarCollapsed ? 'cursor-default opacity-80' : 'hover:bg-opacity-80 cursor-pointer'}`}
                  title={isSidebarCollapsed ? "Authentication required to change settings" : `${showOnlyFailures ? 'Show all defects' : 'Show only failures'}`}
                >
                  <div className="h-5 w-5 flex items-center justify-center text-xs font-bold"
                    style={{color: showOnlyFailures ? '#ef4444' : '#3b82f6'}}>
                    {showOnlyFailures ? 'F' : 'A'}
                  </div>
                </button>
              )}
              
              {/* Zoom controls in collapsed view */}
              <div className="flex flex-col items-center space-y-2">
                <button
                  onClick={() => isSidebarCollapsed ? handleSidebarToggle() : document.getElementById('zoomIn' + cameraId)?.click()}
                  className={`p-1.5 rounded-full bg-blue-100 ${isSidebarCollapsed ? 'cursor-default opacity-80' : 'hover:bg-opacity-80 cursor-pointer'}`}
                  title={isSidebarCollapsed ? "Authentication required to change settings" : "Zoom In"}
                >
                  <div className="h-5 w-5 flex items-center justify-center text-blue-500 font-bold">+</div>
                </button>
                <button
                  onClick={() => isSidebarCollapsed ? handleSidebarToggle() : document.getElementById('zoomOut' + cameraId)?.click()}
                  className={`p-1.5 rounded-full bg-blue-100 ${isSidebarCollapsed ? 'cursor-default opacity-80' : 'hover:bg-opacity-80 cursor-pointer'}`}
                  title={isSidebarCollapsed ? "Authentication required to change settings" : "Zoom Out"}
                >
                  <div className="h-5 w-5 flex items-center justify-center text-blue-500 font-bold">-</div>
                </button>
              </div>
            </div>
          </div>
          
          {/* Center - Image and drawing area */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Image container */}
            <div className="relative mb-4 border rounded-lg overflow-hidden flex-1" style={{ position: 'relative', height: '75vh', minHeight: '550px' }}>
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={20}
                wheel={{ step: 0.1 }}
                pinch={{ disabled: false }}
                doubleClick={{ disabled: true }}
                limitToBounds={true}
                centerZoomedOut={true}
                centerOnInit={true}
                onZoom={(ref) => setZoomScale(ref.state.scale)}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <button id={`zoomIn${cameraId}`} onClick={() => zoomIn()} className="hidden" />
                    <button id={`zoomOut${cameraId}`} onClick={() => zoomOut()} className="hidden" />
                    <button id={`resetZoom${cameraId}`} onClick={() => resetTransform()} className="hidden" />
                    
                    <TransformComponent 
                      wrapperClass="w-full h-full react-transform-component"
                      contentClass="w-full h-full"
                    >
                      <div className="camera-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img
                          ref={imageRef}
                          src={`/images/camera${cameraId}_${imageType}.jpg?t=${Date.now()}`} // Force reload on type change
                          alt={`Camera ${cameraId} ${imageType} feed`}
                          className="pointer-events-none w-full h-full object-contain"
                          style={{ maxHeight: '100%' }}
                          onLoad={updateImageDimensions} // Call update on load
                          onError={(e) => {
                              console.error("Failed to load image:", e);
                              e.target.onerror = null;
                              e.target.src = `/images/camera${cameraId}.jpg`;
                          }}
                        />
                      
                        {/* Detections rendered inside the transform component */}
                        {detectionDisplayMode < 2 && imageDimensions.width > 0 && visibleDetections.map((detection) => {
                          const widthMm = detection.widthMm || (detection.width * (7.9375 / 95));
                          const heightMm = detection.heightMm || (detection.height * (7.9375 / 95));
                          const borderStyle = failureAnalysisEnabled && detection.isTrueFail
                            ? detection.failReason === 'Size' ? '2px solid #ff0000' : '2px dashed #ff3333'
                            : '1px solid red';
                        return (
                          <div
                            key={detection.id}
                            style={{
                                position: 'absolute',
                                left: `${imageDimensions.offsetLeft + (detection.normalized.x_center * imageDimensions.width)}px`,
                                top: `${imageDimensions.offsetTop + (detection.normalized.y_center * imageDimensions.height)}px`,
                                width: `${detection.normalized.width * imageDimensions.width}px`,
                                height: `${detection.normalized.height * imageDimensions.height}px`,
                                transform: 'translate(-50%, -50%)',
                                border: borderStyle,
                                backgroundColor: failureAnalysisEnabled && detection.isTrueFail ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
                                pointerEvents: 'none',
                              }}
                            >
                              {detectionDisplayMode === 0 && (
                                <span 
                                  className={`absolute bg-${failureAnalysisEnabled && detection.isTrueFail ? 'red' : 'gray'}-500 text-white text-xs px-1 whitespace-nowrap`}
                                  style={{ fontSize: '10px', bottom: '-18px', left: '0', zIndex: 1000 }}
                                >
                                  {widthMm.toFixed(1)}×{heightMm.toFixed(1)} mm
                                  {failureAnalysisEnabled && detection.isTrueFail && ` (${detection.failReason} Fail)`}
                                </span>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>

            {/* Scale indicator */}
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 9999, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', pointerEvents: 'none' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>Scale Ref</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <div style={{ height: '3px', backgroundColor: 'white', width: `${(millimetersToPixels(10) / 10) * zoomScale}px` }}></div> {/* Simplified scale bar calc */}
                 <span style={{ fontSize: '10px', marginLeft: '3px' }}>10mm</span>
               </div>
               <div style={{ fontSize: '10px', marginTop: '2px' }}>
                 {(95/7.9375).toFixed(1)} px/mm @ {zoomScale.toFixed(1)}x
               </div>
             </div>
           </div>
        </div>
          
          {/* Right side - Failure Analysis and Inspection history */}
          <div className="w-full lg:w-96 flex flex-col min-h-0 max-h-[calc(90vh-100px)] overflow-y-auto">
            {/* Failure Analysis Summary Panel */}
            {imageType === 'bad' && (
              <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 shadow-sm">
                <h3 className="font-semibold text-lg mb-2 flex items-center justify-between">
                  <span>Failure Analysis</span>
                  {failureAnalysisEnabled ? (
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded">Enabled</span>
                  ) : (
                    <span className="text-sm bg-gray-100 text-gray-800 px-2 py-0.5 rounded">Disabled</span>
                  )}
                </h3>
                
                {detections.length > 0 ? (
                  <div className="text-sm">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
                      <div>Total Defects:</div><div className="text-right font-medium">{enhancedDetections.length}</div>
                      <div>Critical Defects:</div><div className="text-right font-medium">{enhancedDetections.filter(d => d.isTrueFail).length}</div>
                      <div>Size Failures:</div><div className="text-right font-medium">{enhancedDetections.filter(d => d.isTrueFail && d.failReason === 'Size').length}</div>
                      <div>Density Failures:</div><div className="text-right font-medium">{enhancedDetections.filter(d => d.isTrueFail && d.failReason === 'Density').length}</div>
                    </div>
                    
                    {enhancedDetections.filter(d => d.isTrueFail).length === 0 ? (
                      <div className="bg-green-50 text-green-700 p-2 rounded text-center font-medium">No Critical Defects</div>
                    ) : (
                      <div className="bg-red-50 text-red-700 p-2 rounded text-center font-medium">Critical Defects Detected</div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-center">No defects to analyze</div>
                )}
              </div>
            )}
            
            {/* Disposition buttons */}
            <div className="mb-4 bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <h3 className="font-semibold text-lg mb-3 text-center">Disposition</h3>
              <div className="flex gap-3">
                <button
                    className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 text-lg touch-manipulation font-medium shadow-sm"
                    onClick={() => handleDisposition('Part Okay')}
                >Part Okay</button>
                <button
                    className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 text-lg touch-manipulation font-medium shadow-sm"
                    onClick={() => handleDisposition('Scrap')}
                >Scrap</button>
              </div>
            </div>

            {/* Inspection History */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm flex-grow overflow-hidden">
              <h3 className="font-semibold text-lg mb-3">Inspection History</h3>
              <div className="space-y-2 overflow-y-auto max-h-[calc(100%-2rem)]">
              {inspectionHistory.map((inspection) => (
                <div key={inspection.id} className="p-3 bg-gray-50 rounded border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{inspection.timestamp.toLocaleString()}</span>
                    <span className={`px-2 py-1 rounded text-xs ${inspection.disposition === 'Part Okay' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{inspection.disposition}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Image Type: <span className={inspection.imageType === 'good' ? 'text-green-600' : 'text-red-600'}>{inspection.imageType === 'good' ? 'Good' : 'Bad'}</span></div>
                  {inspection.imageType === 'bad' && <div className="text-xs text-gray-500 mt-1">{Math.floor(Math.random() * 5) + 1} defects detected</div>}
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedCameraModal; 