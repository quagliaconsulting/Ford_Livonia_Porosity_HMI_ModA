// ExpandedCameraModal.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Lock, Unlock, X } from 'lucide-react';
import Panzoom from '@panzoom/panzoom';

// Import API services
import { ImageService } from '../api/imageService';
import { DefectService } from '../api/defectService';
import { RegionService } from '../api/regionService';
import { CameraService } from '../api/cameraService'; // Added CameraService

// TODO: Move utils if this function is used elsewhere or becomes complex
const millimetersToPixels = (mm, pixelDensity) => mm * pixelDensity;

const ExpandedCameraModal = ({ cameraId, initialState, onClose }) => {
  // Configuration & Static State (Consider moving to a config file or context if shared)
  const [pixelDensity] = useState(95 / 7.9375); // Example: 95px per 7.9375mm

  // UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [failureAnalysisEnabled, setFailureAnalysisEnabled] = useState(false);
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);
  const [detectionDisplayMode, setDetectionDisplayMode] = useState(0); // 0: Full, 1: Box, 2: Hide

  // Image & Defect State
  const [imageType, setImageType] = useState(initialState?.status?.imageType || 'good');
  const [imageUrl, setImageUrl] = useState(initialState?.imageUrl || '');
  const [currentImageId, setCurrentImageId] = useState(initialState?.latestImageId || null);
  const [detections, setDetections] = useState(initialState?.detections || []);
  const [imageWidth, setImageWidth] = useState(5120); // Default/fallback
  const [imageHeight, setImageHeight] = useState(5120); // Default/fallback
  const [selectedDefectIndex, setSelectedDefectIndex] = useState(-1);
  const [loadingImage, setLoadingImage] = useState(false); // Will now primarily indicate loading of defects for 'bad' type
  const [imageError, setImageError] = useState(null);
  const [currentPartType, setCurrentPartType] = useState(null); // State for the current part type

  // Region State
  const [currentRegionId, setCurrentRegionId] = useState(''); // User-defined ID of the currently selected/edited region
  const [newRegionId, setNewRegionId] = useState(''); // User-defined ID for a new region being created
  const [savedRegions, setSavedRegions] = useState({}); // Stores regions fetched from backend { user_defined_id: { ...region_data_from_backend, id: backend_db_id } }
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [sizeThreshold, setSizeThreshold] = useState(1.0);
  const [densityThreshold, setDensityThreshold] = useState(3);
  const [proximityThreshold, setProximityThreshold] = useState(5.0);
  const [isDrawingRegion, setIsDrawingRegion] = useState(false);
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [regionError, setRegionError] = useState(null);

  // Panzoom State
  const [zoomScale, setZoomScale] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 }); // For display scaling

  // Refs
  const imageRef = useRef(null);
  const panzoomInstanceRef = useRef(null);
  const imageContainerRef = useRef(null);
  const panzoomTargetRef = useRef(null);
  const wheelHandlerRef = useRef(null);
  const zoomHandlerRef = useRef(null);
  
  // Mock inspection history (can be replaced with API call if backend supports it)
  const [inspectionHistory, setInspectionHistory] = useState([
    ...(initialState?.status ? [{ id: Date.now(), timestamp: initialState.status.timestamp || new Date(), imageType: initialState.status.imageType || 'good', disposition: initialState.status.failed ? 'Scrap' : 'Part Okay' }] : []),
    ...Array(9).fill(null).map((_, i) => ({ id: i, timestamp: new Date(Date.now() - (i + 1) * 3600000), imageType: Math.random() < 0.7 ? 'good' : 'bad', disposition: Math.random() < 0.7 ? 'Part Okay' : 'Scrap' }))
  ]);

  // --- Image Loading and Initial Setup ---
  useEffect(() => {
    // Set initial values from props
    setImageType(initialState?.status?.imageType || 'good');
    setImageUrl(initialState?.imageUrl || '');
    setCurrentImageId(initialState?.latestImageId || null);
    setCurrentPartType(null); // Reset part type initially
    setImageError(null); // Clear previous errors
    setLoadingImage(true); // Indicate loading

    // Clear or set initial detections based on initial type
    if ((initialState?.status?.imageType || 'good') === 'bad') {
      setDetections(initialState?.detections || []);
    } else {
      setDetections([]);
    }

    // Fetch detailed image info (including part type) if we have an image ID
    if (initialState?.latestImageId) {
      ImageService.getImage(initialState.latestImageId)
        .then(imageDetails => {
          setCurrentPartType(imageDetails.trigger_part || 'Unknown'); 
          // Potentially update other state here if needed from imageDetails
        })
        .catch(err => {
          console.error("Failed to fetch initial image details:", err);
          setCurrentPartType('Error'); // Indicate error fetching part type
          // Optionally set imageError here too
        })
        .finally(() => {
          // If only fetching details, set loading false here,
          // otherwise loadImageAndDefects will handle it.
          if (imageType === 'good') { // If initial type is good, we are done loading
             setLoadingImage(false);
          } 
        });
    } else {
      setCurrentPartType('N/A'); // No image ID to fetch details from
      setLoadingImage(false);
    }
    
    // Trigger defect loading/clearing based on initial imageType
    // This needs to run after initial state is set.
    // We might need a separate effect or ensure state updates complete.
    // Using a small timeout as a simple way for now.
    const initialLoadTimeout = setTimeout(() => {
       loadImageAndDefects(); 
    }, 10);

    return () => clearTimeout(initialLoadTimeout);

  }, [initialState]); // Rerun setup when initialState changes

  const updateImageDisplayDimensions = () => {
    if (imageRef.current) {
      const img = imageRef.current;
      const container = img.parentElement;
      if (!container) return;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      if (naturalWidth === 0 || naturalHeight === 0) return;

      setImageWidth(naturalWidth); // Store actual image dimensions
      setImageHeight(naturalHeight);

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
  
  const loadImageAndDefects = async () => {
    if (imageType === 'good') {
      setDetections([]);
      setLoadingImage(false); 
      setImageError(null);
      return;
    }

    if (!currentImageId) {
      setImageError("No image selected or available to load defects for.");
      setDetections([]);
      setLoadingImage(false);
      return;
    }

    setLoadingImage(true);
    setImageError(null);
    try {
      console.log(`Fetching defects for image ID: ${currentImageId}`);
      const defectsData = await DefectService.getDefectsForImage(currentImageId);
      setDetections(defectsData || []);
    } catch (error) {
      console.error(`Error loading defects for image ${currentImageId}:`, error);
      setImageError(error.message || "Failed to load defects");
      setDetections([]);
    } finally {
      setLoadingImage(false);
    }
  };

  useEffect(() => {
    // Only run if currentImageId is available (initial load handles initial defects)
    if(currentImageId){
        loadImageAndDefects();
    }
  }, [imageType, currentImageId]);

  // --- Region Management --- 
  useEffect(() => {
    const loadRegions = async () => {
      if (!cameraId) return;
      setLoadingRegions(true);
      setRegionError(null);
      try {
        const regionsFromApi = await RegionService.getRegionsForCamera(cameraId);
        const regionsObj = {};
        (regionsFromApi || []).forEach(region => {
          regionsObj[region.region_id] = { // Use user-defined region_id as key
            ...region, // Spread all properties from backend region object
            // Ensure polygon is an array of objects {x, y}
            polygon: Array.isArray(region.polygon) ? region.polygon : [] 
          };
        });
        setSavedRegions(regionsObj);
      } catch (error) {
        console.error("Error loading regions:", error);
        setRegionError(error.message || "Failed to load regions");
      } finally {
        setLoadingRegions(false);
      }
    };
    loadRegions();
  }, [cameraId]);

  const saveRegionParameters = async () => {
    if (!currentRegionId || !savedRegions[currentRegionId] || !savedRegions[currentRegionId].id) {
        console.warn("Cannot save parameters: No current region selected or region has no backend ID.");
        setRegionError("Select a region or save the new region drawing first.");
        return;
    }
    setRegionError(null);
    const backendRegionId = savedRegions[currentRegionId].id;

    const regionUpdateData = {
      size_threshold: sizeThreshold,
      density_threshold: densityThreshold,
      proximity_threshold: proximityThreshold,
      part_number: currentPartType && currentPartType !== 'Unknown' && currentPartType !== 'Error' && currentPartType !== 'N/A' ? currentPartType : null // Automatically include current part type if known
    };

    try {
      const updatedRegion = await RegionService.updateRegion(backendRegionId, regionUpdateData);
      setSavedRegions(prev => ({
        ...prev,
        [currentRegionId]: { ...prev[currentRegionId], ...updatedRegion }
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving region parameters:", error);
      setRegionError(error.message || "Failed to save region parameters");
    }
  };

  const loadRegionParameters = (userDefinedRegionId) => {
    if (!userDefinedRegionId || !savedRegions[userDefinedRegionId]) return;
    const region = savedRegions[userDefinedRegionId];
    setSizeThreshold(region.size_threshold || 1.0);
    setDensityThreshold(region.density_threshold || 3);
    setProximityThreshold(region.proximity_threshold || 5.0);
    setCurrentPolygonPoints(Array.isArray(region.polygon) ? region.polygon : []);
    setFailureAnalysisEnabled(true);
    setCurrentRegionId(userDefinedRegionId);
    setShowRegionForm(false); // Close new region form if it was open
    setIsDrawingRegion(false); // Ensure not in drawing mode
  };

  const addNewRegion = async () => {
    if (!newRegionId.trim() || currentPolygonPoints.length < 3) {
      setRegionError("Region ID and at least 3 polygon points are required.");
      return;
    }
    setRegionError(null);
    
    const regionCreateData = {
      camera_id: cameraId,
      region_id: newRegionId, // User-defined ID
      size_threshold: sizeThreshold,
      density_threshold: densityThreshold,
      proximity_threshold: proximityThreshold,
      polygon: currentPolygonPoints, 
      active: true,
      part_number: currentPartType && currentPartType !== 'Unknown' && currentPartType !== 'Error' && currentPartType !== 'N/A' ? currentPartType : null // Automatically include current part type if known
    };

    try {
      const newRegionFromApi = await RegionService.createRegion(regionCreateData);
      setSavedRegions(prev => ({
        ...prev,
        [newRegionFromApi.region_id]: newRegionFromApi
      }));
      setCurrentRegionId(newRegionFromApi.region_id);
      setNewRegionId('');
      setShowRegionForm(false);
      // currentPolygonPoints are already set for this new region, no need to clear if we want to keep displaying it
      setIsDrawingRegion(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Error creating region:", error);
      setRegionError(error.message || (error.response?.data?.detail || "Failed to create region"));
    }
  };

  const deleteRegionApiCall = async (userDefinedRegionId) => {
    if (!userDefinedRegionId || !savedRegions[userDefinedRegionId] || !savedRegions[userDefinedRegionId].id) {
        setRegionError("Region not found or cannot be deleted.");
        return;
    }
    setRegionError(null);
    const backendRegionId = savedRegions[userDefinedRegionId].id;

    try {
      await RegionService.deleteRegion(backendRegionId);
      setSavedRegions(prev => {
        const { [userDefinedRegionId]: removed, ...updated } = prev;
        return updated;
      });
      if (currentRegionId === userDefinedRegionId) {
        setCurrentRegionId('');
        setCurrentPolygonPoints([]);
        // Reset parameters to default if needed
        setSizeThreshold(1.0);
        setDensityThreshold(3);
        setProximityThreshold(5.0);
      }
    } catch (error) {
      console.error("Error deleting region:", error);
      setRegionError(error.message || "Failed to delete region");
    }
  };

  // --- Defect Disposition --- 
  const handleDisposition = async (disp) => {
    if (selectedDefectIndex < 0 || selectedDefectIndex >= visibleDetections.length) {
        console.warn("Disposition clicked with no valid defect selected.");
        return;
    }
    const selectedDefect = visibleDetections[selectedDefectIndex];
    if (!selectedDefect || !selectedDefect.id) {
        console.error("Selected defect is invalid or missing ID.");
        return;
      }

    try {
      const updatedDefect = await DefectService.updateDefectDisposition(
        selectedDefect.id,
        disp,
        `Dispositioned by operator at ${new Date().toISOString()}` // Example notes
      );
      
      setDetections(prevDetections => 
        prevDetections.map((d, i) => 
          d.id === selectedDefect.id ? { ...d, disposition: updatedDefect.disposition } : d
        )
      );
      // Optionally move to the next defect
      handleNextDefect();
            } catch (error) {
      console.error("Error updating defect disposition:", error);
      // TODO: Show error to user
    }
  };

  // --- UI Handlers (Sidebar, PIN, Polygon Drawing Toggles) ---
  const handleSidebarToggle = () => { if (!isSidebarCollapsed) setIsSidebarCollapsed(true); else { setShowPinModal(true); setPinInput(''); setPinError(false); } };
  const verifyPin = () => { const now = new Date(); const h = now.getHours(); const m = now.getMinutes(); const pin = `${h.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}`; if (pinInput === pin) { setIsSidebarCollapsed(false); setShowPinModal(false); setPinInput(''); } else { setPinError(true); setPinInput(''); setTimeout(() => setPinError(false), 2000); } };
  const handleStartDrawing = () => { setCurrentPolygonPoints([]); setIsDrawingRegion(true); panzoomInstanceRef.current?.pause(); };
  const handleFinishDrawing = () => { setIsDrawingRegion(false); panzoomInstanceRef.current?.resume(); /* Polygon points remain for saving */ };
  const handleCancelDrawing = () => { setIsDrawingRegion(false); setCurrentPolygonPoints([]); panzoomInstanceRef.current?.resume(); };
  const handleCancelRegionForm = () => { setShowRegionForm(false); setNewRegionId(''); setIsDrawingRegion(false); setCurrentPolygonPoints([]); panzoomInstanceRef.current?.resume(); };

  // --- Panzoom Initialization and Event Handling ---
  const initializePanzoom = () => {
    if (panzoomInstanceRef.current || !panzoomTargetRef.current || !imageContainerRef.current) return;
    const panzoomTargetElement = panzoomTargetRef.current;
    const containerElement = imageContainerRef.current;
    const imageElement = imageRef.current;

    if (imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
      const pz = Panzoom(panzoomTargetElement, { maxScale: 20, minScale: 0.5, contain: 'outside', step: 0.3 });
      panzoomInstanceRef.current = pz;
      const handlePanZoomChange = (event) => { if (event.detail && typeof event.detail.scale === 'number') { setZoomScale(event.detail.scale); } };
      zoomHandlerRef.current = handlePanZoomChange;
      panzoomTargetElement.addEventListener('panzoomchange', zoomHandlerRef.current);
      panzoomTargetElement.addEventListener('panzoomreset', zoomHandlerRef.current);
      wheelHandlerRef.current = pz.zoomWithWheel;
      containerElement.addEventListener('wheel', wheelHandlerRef.current);
      setZoomScale(pz.getScale());
    } else {
      console.warn("Panzoom init skipped: Image not ready or no natural dimensions.");
    }
  };

  useEffect(() => {
    // Attempt to initialize Panzoom when the image URL changes and imageRef is available.
    // updateImageDisplayDimensions is called on image load, which then calls initializePanzoom if conditions are met.
    // This ensures Panzoom initializes after image is loaded and dimensions are known.
    if (imageUrl && imageRef.current) {
      // The onLoad handler for the image will call updateImageDisplayDimensions, which then calls initializePanzoom.
    } else if (!imageUrl) {
      // If imageUrl is cleared, destroy existing panzoom instance
      if (panzoomInstanceRef.current) {
        panzoomInstanceRef.current.destroy();
        panzoomInstanceRef.current = null;
      }
    }
  }, [imageUrl]); // Re-evaluate when imageUrl changes

  useEffect(() => {
    const containerNode = imageContainerRef.current;
    const targetNode = panzoomTargetRef.current;
    const panzoomNode = panzoomInstanceRef.current;
    const wheelHandler = wheelHandlerRef.current;
    const zoomHandler = zoomHandlerRef.current;
    return () => {
      if (panzoomNode) panzoomNode.destroy();
      if (targetNode && zoomHandler) { targetNode.removeEventListener('panzoomchange', zoomHandler); targetNode.removeEventListener('panzoomreset', zoomHandler); }
      if (containerNode && wheelHandler) containerNode.removeEventListener('wheel', wheelHandler);
      panzoomInstanceRef.current = null; wheelHandlerRef.current = null; zoomHandlerRef.current = null;
    };
  }, []); // Run once on unmount

  useEffect(() => { const t = setTimeout(updateImageDisplayDimensions, 300); return () => clearTimeout(t); }, [isSidebarCollapsed]);
  useEffect(() => { window.dispatchEvent(new Event('resize')); const t = setTimeout(() => { window.dispatchEvent(new Event('resize')); updateImageDisplayDimensions(); }, 100); return () => clearTimeout(t); }, []);


  // --- Polygon Drawing Click Handler ---
  const handleImageClickForPolygon = (event) => {
    if (!isDrawingRegion || !panzoomInstanceRef.current || !panzoomTargetRef.current || !imageRef.current) return;
    const panzoom = panzoomInstanceRef.current;
    const targetElement = panzoomTargetRef.current;
    const rect = targetElement.getBoundingClientRect();
    const clickX_relativeToTarget = event.clientX - rect.left;
    const clickY_relativeToTarget = event.clientY - rect.top;
    const currentPan = panzoom.getPan();
    const currentScale = panzoom.getScale();
    const imageCoordX = (clickX_relativeToTarget - currentPan.x) / currentScale;
    const imageCoordY = (clickY_relativeToTarget - currentPan.y) / currentScale;
    if (imageCoordX < 0 || imageCoordY < 0 || imageCoordX > imageWidth || imageCoordY > imageHeight) { console.warn("Clicked outside image bounds."); return; }
    setCurrentPolygonPoints(prevPoints => [...prevPoints, { x: imageCoordX, y: imageCoordY }]);
  };

  useEffect(() => {
    const targetElement = panzoomTargetRef.current; 
    if (targetElement && isDrawingRegion) {
        targetElement.addEventListener('click', handleImageClickForPolygon);
        targetElement.style.cursor = 'crosshair';
    } else if (targetElement) {
        targetElement.removeEventListener('click', handleImageClickForPolygon);
      targetElement.style.cursor = panzoomInstanceRef.current && panzoomInstanceRef.current.getOptions().cursor || 'grab';
    }
    return () => {
      if (targetElement) {
        targetElement.removeEventListener('click', handleImageClickForPolygon);
        targetElement.style.cursor = panzoomInstanceRef.current && panzoomInstanceRef.current.getOptions().cursor || 'grab';
      }
    };
  }, [isDrawingRegion, imageWidth, imageHeight]); // Dependencies ensure listener is correctly managed

  // --- Defect Navigation and Analysis ---
  const enhancedDetections = useMemo(() => {
    if (!failureAnalysisEnabled || !detections || detections.length === 0) return (detections || []).map(d => ({ ...d, isTrueFail: false, failReason: null }));
    const analyzed = (detections || []).map(d => { 
        const wMm = (d.normalized?.width * imageWidth) * (7.9375 / pixelDensity); 
        const hMm = (d.normalized?.height * imageHeight) * (7.9375 / pixelDensity);
        const isSize = Math.max(wMm, hMm) >= sizeThreshold;
        return { ...d, widthMm: wMm, heightMm: hMm, areaMm: wMm * hMm, isTrueFail: isSize, failReason: isSize ? 'Size' : null, clusterMembers: [] }; 
    });
    // Basic density check (simplified from original, needs refinement for actual clustering)
    for (let i = 0; i < analyzed.length; i++) {
      if (analyzed[i].isTrueFail) continue;
      let nearbyCount = 0;
      for (let j = 0; j < analyzed.length; j++) {
        if (i === j) continue;
        const x1 = analyzed[i].normalized?.x_center * imageWidth; const y1 = analyzed[i].normalized?.y_center * imageHeight;
        const x2 = analyzed[j].normalized?.x_center * imageWidth; const y2 = analyzed[j].normalized?.y_center * imageHeight;
        const distPx = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const distMm = distPx * (7.9375 / pixelDensity);
        if (distMm <= proximityThreshold) nearbyCount++;
      }
      if (nearbyCount + 1 >= densityThreshold) { analyzed[i].isTrueFail = true; analyzed[i].failReason = 'Density'; }
    }
    return analyzed;
  }, [detections, sizeThreshold, densityThreshold, proximityThreshold, failureAnalysisEnabled, imageWidth, imageHeight, pixelDensity]);
  
  const visibleDetections = useMemo(() => failureAnalysisEnabled && showOnlyFailures ? enhancedDetections.filter(d => d.isTrueFail) : enhancedDetections, [enhancedDetections, showOnlyFailures, failureAnalysisEnabled]);

  const handleDefectSelect = (index) => {
    if (index < 0 || index >= visibleDetections.length) { setSelectedDefectIndex(-1); return; }
    setSelectedDefectIndex(index);
    const panzoom = panzoomInstanceRef.current;
    const defect = visibleDetections[index];
    if (!panzoom || !defect || !defect.normalized) { console.error("Panzoom or defect data invalid for navigation."); return; }
    const targetScale = 2; // Example target scale
    // Calculate center of defect in original image coordinates
    const defectCenterX = defect.normalized.x_center * imageWidth;
    const defectCenterY = defect.normalized.y_center * imageHeight;
    // Get current panzoom target dimensions (the image as displayed by panzoom)
    const panzoomElement = panzoomTargetRef.current;
    if (!panzoomElement) return;
    // Calculate desired view: pan so defect center is at view center, then zoom.
    // Panzoom's pan and zoom methods are relative to its current state or can take absolute points.
    // Simpler: zoom to a point. The panzoom.zoomToPoint(scale, pointX, pointY) is often easiest.
    // pointX, pointY should be client coordinates relative to the panzoom container.
    // For now, a simplified pan and zoom using setTimeout as in original example
    setTimeout(() => {
        const currentPanzoom = panzoomInstanceRef.current;
        if (!currentPanzoom) return;
        currentPanzoom.reset({ animate: false, force: true });
        currentPanzoom.zoom(targetScale, { animate: false });
        const zoomedScale = currentPanzoom.getScale();
        const viewContainerRect = imageContainerRef.current.getBoundingClientRect();
        const viewCenterX = viewContainerRect.width / 2;
        const viewCenterY = viewContainerRect.height / 2;
        const panX = viewCenterX - (imageWidth / 2) - zoomedScale * (defectCenterX - (imageWidth / 2));
        const panY = viewCenterY - (imageHeight / 2) - zoomedScale * (defectCenterY - (imageHeight / 2));
        currentPanzoom.pan(panX, panY, { animate: false });
    }, 0);
  };

  const handlePrevDefect = () => { if (visibleDetections.length === 0) return; const newIndex = selectedDefectIndex <= 0 ? visibleDetections.length - 1 : selectedDefectIndex - 1; handleDefectSelect(newIndex); };
  const handleNextDefect = () => { if (visibleDetections.length === 0) return; const newIndex = selectedDefectIndex >= visibleDetections.length - 1 ? 0 : selectedDefectIndex + 1; handleDefectSelect(newIndex); };

  // --- JSX Structure ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 overflow-auto p-4">
      <div className="bg-white rounded-lg p-4 w-full mx-4 relative max-h-[90vh] flex flex-col" style={{ maxWidth: "calc(1280px * 1.43)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl font-bold z-50 focus:outline-none" aria-label="Close">&times;</button>
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-bold">Camera {cameraId}</h2>
          <div className="ml-2">
            { loadingImage ? <span className="text-xs text-gray-500">Loading...</span> : 
              imageError ? <X className="text-orange-500" size={24} title={imageError} /> : 
              (imageType === 'good' && !initialState?.status?.failed) ? <CheckCircle className="text-green-500" size={24} /> : 
              <X className="text-red-500" size={24} />
            }
            </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 overflow-hidden h-full">
          {/* Left Sidebar */}
          <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-14' : 'w-full lg:w-[calc(18rem*1.1)]'} flex-shrink-0 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-100px)] relative bg-white rounded-lg border border-gray-200`}>
            <button onClick={handleSidebarToggle} className="absolute right-1 top-1 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10" title={isSidebarCollapsed ? "Expand" : "Collapse"}><ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} /></button>
            <div className={`p-3 ${isSidebarCollapsed ? 'invisible opacity-0 absolute' : 'visible opacity-100'} transition-opacity duration-300`}>
              <div className="mb-4"><h3 className="font-semibold mb-2">Image Type</h3><div className="flex gap-2"><button onClick={() => setImageType('good')} className={`flex-1 px-3 py-2 rounded text-sm ${imageType === 'good' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>Good</button><button onClick={() => setImageType('bad')} className={`flex-1 px-3 py-2 rounded text-sm ${imageType === 'bad' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>Bad</button></div></div>
              <div className="mb-4"><h3 className="font-semibold mb-2">Calibration</h3><div className="bg-gray-100 rounded-lg p-3"><div className="flex items-center gap-2 mb-1"><div className="text-sm">Density:</div><input type="range" min="1" max="30" step="0.1" value={pixelDensity} className="flex-1" disabled={true} /><div className="w-14 text-center font-medium text-sm">{pixelDensity.toFixed(1)}</div><button onClick={() => alert('Calibration is fixed.')} className="p-1 bg-gray-200 rounded-full" title="Calibration Locked"><Lock size={14} /></button></div><div className="text-xs text-gray-600">px/mm (Fixed)</div></div></div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2"><h3 className="font-semibold">Failure Analysis</h3><button onClick={() => setFailureAnalysisEnabled(!failureAnalysisEnabled)} className={`px-2 py-1 rounded text-white text-xs ${failureAnalysisEnabled ? 'bg-green-500' : 'bg-gray-400'}`}>{failureAnalysisEnabled ? 'On' : 'Off'}</button></div>
                {failureAnalysisEnabled && (<>
                  <button onClick={() => setShowOnlyFailures(!showOnlyFailures)} className={`w-full px-3 py-1 rounded text-white text-sm mb-3 ${showOnlyFailures ? 'bg-red-500' : 'bg-blue-500'}`}>{showOnlyFailures ? 'Failures Only' : 'Show All'}</button>
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg border">
                    <h4 className="font-medium text-sm mb-2">Region Config</h4>
                    {regionError && <p className='text-xs text-red-500 mb-2'>{regionError}</p>}
                    {currentRegionId ? <div className="flex items-center justify-between mb-2"><span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Region: {currentRegionId}</span><div className="flex gap-1"><button onClick={saveRegionParameters} className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600">Save Params</button><button onClick={() => {setCurrentRegionId(''); setCurrentPolygonPoints([]);}} className="bg-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-400">Clear Sel.</button></div></div> : <div className="mb-2 text-xs italic">No region selected</div>}
                    {saveSuccess && <div className="mb-2 text-xs text-green-600">✓ Saved</div>}
                    {loadingRegions ? <p className='text-xs text-gray-500'>Loading regions...</p> : Object.keys(savedRegions).length > 0 && 
                        <div className="mb-2"><label className="block text-xs mb-1">Load Region:</label>
                            <div className="flex items-center gap-1 flex-wrap max-h-20 overflow-y-auto">
                                {Object.keys(savedRegions).map(rId => (
                                <div key={rId} className="flex items-center">
                                    <button onClick={() => loadRegionParameters(rId)} className={`text-xs px-2 py-1 rounded mr-1 whitespace-nowrap ${currentRegionId === rId ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{rId}</button>
                                    <button onClick={() => deleteRegionApiCall(rId)} className="text-red-500 hover:text-red-700 text-xs">×</button>
                                </div>))}
                            </div>
                        </div>
                    }
                    {!showRegionForm ? <button onClick={() => {setShowRegionForm(true); setNewRegionId(''); setCurrentPolygonPoints([]); setIsDrawingRegion(false);}} className="text-xs bg-blue-500 text-white px-2 py-1 rounded w-full">+ Add New Region</button> : 
                        <div className="mt-2 border-t pt-2">
                            <h5 className="text-xs font-semibold mb-1">New Region</h5>
                            <div className="flex items-center gap-1 mb-2">
                                <input type="text" value={newRegionId} onChange={(e) => setNewRegionId(e.target.value)} placeholder="New Region ID" className="flex-1 px-2 py-1 text-xs border rounded" disabled={isDrawingRegion} />
                                <button onClick={handleStartDrawing} disabled={!newRegionId.trim() || isDrawingRegion} className={`whitespace-nowrap text-xs px-2 py-1 rounded ${(!newRegionId.trim() || isDrawingRegion) ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>{isDrawingRegion ? 'Drawing...' : 'Draw Polygon'}</button>
                            </div>
                            {isDrawingRegion && <div className="mb-2 space-y-1">
                                <p className="text-xs text-center text-blue-600 italic">Click on image to add points ({currentPolygonPoints.length}).</p>
                                <button onClick={handleFinishDrawing} disabled={currentPolygonPoints.length < 3} className={`w-full text-xs px-2 py-1 rounded ${currentPolygonPoints.length < 3 ? 'bg-yellow-300 cursor-not-allowed' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}>Finish Drawing</button>
                                <button onClick={handleCancelDrawing} className="w-full text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Cancel Drawing</button>
                            </div>}
                            <div className="flex items-center gap-1 mt-1">
                                <button onClick={addNewRegion} disabled={!newRegionId.trim() || currentPolygonPoints.length < 3 || isDrawingRegion} className={`flex-1 px-2 py-1 rounded text-xs ${(!newRegionId.trim() || currentPolygonPoints.length < 3 || isDrawingRegion) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Save New Region</button>
                                <button onClick={handleCancelRegionForm} disabled={isDrawingRegion} className={`px-2 py-1 rounded text-xs ${isDrawingRegion ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button>
                            </div>
                        </div>
                    }
                  </div>
                  <div className="mb-3"><label className="text-sm block mb-1">Size Thresh: {sizeThreshold.toFixed(1)}mm</label><input type="range" min="0.1" max="5.0" step="0.1" value={sizeThreshold} onChange={e => setSizeThreshold(parseFloat(e.target.value))} className="w-full" disabled={!currentRegionId && !showRegionForm}/></div>
                  <div className="mb-3"><label className="text-sm block mb-1">Density Thresh: {densityThreshold}</label><input type="range" min="2" max="10" step="1" value={densityThreshold} onChange={e => setDensityThreshold(parseInt(e.target.value))} className="w-full" disabled={!currentRegionId && !showRegionForm}/></div>
                  <div className="mb-3"><label className="text-sm block mb-1">Proximity: {proximityThreshold.toFixed(1)}mm</label><input type="range" min="1.0" max="20.0" step="0.5" value={proximityThreshold} onChange={e => setProximityThreshold(parseFloat(e.target.value))} className="w-full" disabled={!currentRegionId && !showRegionForm}/></div>
                  <div className="text-xs bg-gray-100 p-2 rounded"><div className="mb-1 font-medium">Legend:</div><div className="grid grid-cols-1 gap-1"><div className="flex items-center"><div className="w-3 h-3 mr-1 border-2 border-red-500 bg-red-100"></div><span>Size Fail</span></div><div className="flex items-center"><div className="w-3 h-3 mr-1 border-2 border-dashed border-red-400 bg-red-100"></div><span>Density Fail</span></div><div className="flex items-center"><div className="w-3 h-3 mr-1 border border-red-400"></div><span>Non-Critical</span></div></div></div>
                </>)}
              </div>
            </div>
            <div className={`py-10 px-2 flex flex-col items-center space-y-6 ${isSidebarCollapsed ? 'visible opacity-100' : 'invisible opacity-0 absolute'} transition-opacity duration-300`}>
              <button onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setImageType(p => p === 'good' ? 'bad' : 'good')} title={isSidebarCollapsed ? "Auth required" : `Switch to ${imageType === 'good' ? 'bad' : 'good'}`} className={`p-1.5 rounded-full ${(imageType === 'good' && !initialState?.status?.failed) ? 'bg-green-100' : 'bg-red-100'} ${isSidebarCollapsed ? 'opacity-80' : 'hover:bg-opacity-80'}`}>{(imageType === 'good' && !initialState?.status?.failed) ? <CheckCircle className="text-green-500 h-5 w-5" /> : <X className="text-red-500 h-5 w-5" />}</button>
              <button onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setFailureAnalysisEnabled(!failureAnalysisEnabled)} className={`p-1.5 rounded-full ${failureAnalysisEnabled ? 'bg-green-100' : 'bg-gray-100'} ${isSidebarCollapsed ? 'opacity-80' : 'hover:bg-opacity-80'}`} title={isSidebarCollapsed ? "Auth required" : `${failureAnalysisEnabled ? 'Disable' : 'Enable'} FA`}><div className={`h-5 w-5 flex items-center justify-center text-xs font-bold ${failureAnalysisEnabled ? 'text-green-500' : 'text-gray-400'}`}>FA</div></button>
              {failureAnalysisEnabled && <button onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setShowOnlyFailures(!showOnlyFailures)} className={`p-1.5 rounded-full ${showOnlyFailures ? 'bg-red-100' : 'bg-blue-100'} ${isSidebarCollapsed ? 'opacity-80' : 'hover:bg-opacity-80'}`} title={isSidebarCollapsed ? "Auth required" : `${showOnlyFailures ? 'Show all' : 'Failures only'}`}><div className={`h-5 w-5 flex items-center justify-center text-xs font-bold ${showOnlyFailures ? 'text-red-500' : 'text-blue-500'}`}>{showOnlyFailures ? 'F' : 'A'}</div></button>}
            </div>
          </div>

          {/* Center Image Area */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div ref={imageContainerRef} className="relative mb-4 border rounded-lg overflow-hidden flex-1 bg-gray-200" style={{ height: '75vh', minHeight: '550px' }}>
              <div className="absolute top-2 left-2 z-10 bg-white bg-opacity-75 p-2 rounded shadow"><h3 className="font-semibold mb-1 text-xs text-center">Display</h3><button onClick={() => setDetectionDisplayMode(p => (p + 1) % 3)} className="px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs w-12 text-center" title={`Detection Display: ${['Full', 'Boxes Only', 'Hidden'][detectionDisplayMode]}`}>{['Full', 'Box', 'Hide'][detectionDisplayMode]}</button></div>
              <div className="absolute top-2 right-2 z-10 bg-white bg-opacity-75 p-2 rounded shadow" style={{ transform: 'translateZ(0)' }}><h3 className="font-semibold mb-1 text-xs text-center">Zoom</h3><div className="flex gap-1"><button onClick={() => panzoomInstanceRef.current?.zoomIn()} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">In</button><button onClick={() => panzoomInstanceRef.current?.zoomOut()} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">Out</button><button onClick={() => panzoomInstanceRef.current?.reset()} className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs">Reset</button></div></div>
              
              <div ref={panzoomTargetRef} className="w-full h-full relative" style={{ touchAction: 'none' }} >
                  {loadingImage && <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-75 z-50"><p>Loading image...</p></div>}
                  {imageError && !loadingImage && <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-40"><p className="text-red-500 p-4 text-center">Error: {imageError}</p></div>}
                  {!loadingImage && !imageError && imageUrl && (
                  <img 
                    ref={imageRef} 
                        src={imageUrl} 
                    alt={`Cam ${cameraId} ${imageType}`} 
                    className="block object-contain w-full h-full" 
                        style={{ transformOrigin: '0 0' /* Important for panzoom when image itself is target */}} 
                        onLoad={() => { updateImageDisplayDimensions(); initializePanzoom(); }}
                        onError={(e) => { console.error(`Failed to load image: ${e.target.src}`); setImageError("Image failed to load."); imageUrl(''); }}
                    />
                  )}
                  {!loadingImage && !imageError && !imageUrl && <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-40"><p>No image to display.</p></div>}
                  
                  {detectionDisplayMode < 2 && visibleDetections.length > 0 && imageUrl && (
                    <div style={{ position: 'absolute', top: `${imageDimensions.offsetTop}px`, left: `${imageDimensions.offsetLeft}px`, width: `${imageDimensions.width}px`, height: `${imageDimensions.height}px`, pointerEvents: 'none' }}>
                        {visibleDetections.map((d, idx) => {
                            const wMm = d.widthMm || (d.normalized?.width * imageWidth) * (7.9375 / pixelDensity); 
                            const hMm = d.heightMm || (d.normalized?.height * imageHeight) * (7.9375 / pixelDensity);
                    const isSelected = idx === selectedDefectIndex;
                            const bStyle = isSelected ? '3px solid #3b82f6' : (failureAnalysisEnabled && d.isTrueFail ? (d.failReason === 'Size' ? '2px solid #ef4444' : '2px dashed #f87171') : '1px solid red');
                            if (!d.normalized) return null;
                    return (
                            <div key={d.id} style={{
                          position: 'absolute',
                                left: `${d.normalized.x_center * 100}%`,
                                top: `${d.normalized.y_center * 100}%`,
                                width: `${d.normalized.width * 100}%`,
                                height: `${d.normalized.height * 100}%`,
                                transform: 'translate(-50%, -50%)', border: bStyle,
                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : (failureAnalysisEnabled && d.isTrueFail ? 'rgba(239, 68, 68, 0.1)' : 'transparent'),
                                zIndex: isSelected ? 10 : 1
                            }}>
                        {detectionDisplayMode === 0 && (
                                <span className={`absolute text-white text-xs px-1 whitespace-nowrap ${isSelected ? 'bg-blue-600' : (failureAnalysisEnabled && d.isTrueFail ? 'bg-red-600' : 'bg-gray-600') }`} style={{ fontSize: '10px', bottom: '-18px', left: '0', zIndex: 1000 }}>
                             {wMm.toFixed(1)}×{hMm.toFixed(1)}mm{failureAnalysisEnabled && d.isTrueFail && ` (${d.failReason} Fail)`}
                                </span>)}
                            </div>);
                  })}
                    </div>
                  )}

                  <svg style={{ position: 'absolute', top: 0, left: 0, width: `${imageWidth}px`, height: `${imageHeight}px`, pointerEvents: 'none', overflow: 'visible', transformOrigin: '0 0' }}>
                    {isDrawingRegion && currentPolygonPoints.length > 0 && (
                      <>
                        <polyline points={currentPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')} fill={"rgba(0, 0, 255, 0.2)"} stroke="#0000FF" strokeWidth={Math.max(1, 1 / zoomScale * 2)} vectorEffect="non-scaling-stroke" />
                        {currentPolygonPoints.map((point, index) => (<circle key={`draw-point-${index}`} cx={point.x} cy={point.y} r={Math.max(2, 1 / zoomScale * 5)} fill="#0000FF" />))}
                      </>
                    )}
                    {!isDrawingRegion && currentRegionId && savedRegions[currentRegionId]?.polygon?.length > 0 && (
                      <polygon points={savedRegions[currentRegionId].polygon.map(p => `${p.x},${p.y}`).join(' ')} fill={"rgba(0, 255, 0, 0.15)"} stroke="#00FF00" strokeWidth={Math.max(1, 1 / zoomScale * 1.5)} strokeDasharray={Math.max(2,1 / zoomScale * 4)} vectorEffect="non-scaling-stroke" />
                    )}
                  </svg>
              </div>
              <div className="scale-indicator-fixed" style={{ /* transform: 'none !important' - handled by App.css */ }}>
                 <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>Scale Ref</div>
                 <div style={{ display: 'flex', alignItems: 'center' }}>
                   <div style={{ height: '3px', backgroundColor: 'black', width: `${Math.max(1, millimetersToPixels(1, pixelDensity) * zoomScale)}px` }}></div>
                   <span style={{ fontSize: '10px', marginLeft: '3px' }}>1mm</span>
                 </div>
                 <div style={{ fontSize: '10px', marginTop: '2px' }}>{pixelDensity.toFixed(1)} px/mm @ {zoomScale.toFixed(1)}x</div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-96 flex flex-col min-h-0 max-h-[calc(90vh-100px)] overflow-y-auto space-y-3">
            <div className="bg-white rounded-lg border p-3 shadow-sm flex-shrink-0">
              <h3 className="font-semibold text-lg mb-3 text-center">Disposition Defect #{selectedDefectIndex >= 0 && visibleDetections[selectedDefectIndex] ? selectedDefectIndex + 1 : '--'}</h3>
              <div className="flex gap-3 mb-3">
                <button className={`flex-1 py-3 text-white rounded-lg transition-colors duration-200 text-lg font-medium shadow-sm ${selectedDefectIndex === -1 || !visibleDetections[selectedDefectIndex] ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`} onClick={() => handleDisposition('Part Okay')} disabled={selectedDefectIndex === -1 || !visibleDetections[selectedDefectIndex]}>Okay</button>
                <button className={`flex-1 py-3 text-white rounded-lg transition-colors duration-200 text-lg font-medium shadow-sm ${selectedDefectIndex === -1 || !visibleDetections[selectedDefectIndex] ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`} onClick={() => handleDisposition('Scrap')} disabled={selectedDefectIndex === -1 || !visibleDetections[selectedDefectIndex]}>Scrap</button>
              </div>
              <div className="flex justify-between items-center mt-6">
                 <button onClick={handlePrevDefect} disabled={visibleDetections.length <= 1} className={`p-3 rounded-full ${visibleDetections.length <= 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-600 text-white hover:bg-gray-700'}`} aria-label="Previous Defect"><ChevronLeft size={24} /></button>
                 <span className="text-sm text-gray-600">{visibleDetections.length > 0 ? `${selectedDefectIndex + 1} / ${visibleDetections.length}` : '0 / 0'}</span>
                 <button onClick={handleNextDefect} disabled={visibleDetections.length <= 1} className={`p-3 rounded-full ${visibleDetections.length <= 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-600 text-white hover:bg-gray-700'}`} aria-label="Next Defect"><ChevronRight size={24} /></button>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-3 shadow-sm flex-shrink-0">
              <h3 className="font-semibold text-lg mb-3 text-center">Part Information</h3>
              <div className="mb-3">
                 <span className="font-medium text-sm">Part Type:</span>
                 <span className="ml-2 text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{currentPartType || 'Loading...'}</span> 
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 border-t pt-2">Viable Regions & Criteria:</h4>
                {loadingRegions ? <p className="text-xs text-gray-500 italic">Loading regions...</p> :
                 regionError ? <p className="text-xs text-red-500 italic">Error: {regionError}</p> :
                 Object.keys(savedRegions).length === 0 ? <p className="text-xs text-gray-500 italic">No regions defined.</p> :
                  (<ul className="space-y-2 text-xs max-h-40 overflow-y-auto">
                    {Object.entries(savedRegions).map(([regionId, regionData]) => (
                      <li key={regionId} className="p-1.5 bg-gray-50 rounded border border-gray-200">
                        <span className="font-semibold text-blue-700">{regionId}:</span>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>Size ≥ {regionData.size_threshold?.toFixed(1) ?? 'N/A'} mm</li>
                          <li>Density ≥ {regionData.density_threshold ?? 'N/A'}</li>
                          <li>Proximity ≤ {regionData.proximity_threshold?.toFixed(1) ?? 'N/A'} mm</li>
                        </ul>
                      </li>))}
                  </ul>)
                }
              </div>
            </div>

            <div className="bg-white rounded-lg border p-3 shadow-sm flex-grow overflow-hidden flex flex-col">
              <h3 className="font-semibold text-lg mb-2 flex-shrink-0">Detected Defects ({visibleDetections.length})</h3>
              <div className="space-y-2 overflow-y-auto flex-grow min-h-0">
              {imageType === 'bad' && visibleDetections.length === 0 && !loadingImage && (<p className="text-gray-500 italic text-center py-4">No defects match criteria.</p>)}
              {imageType === 'good' && !loadingImage && (<p className="text-gray-500 italic text-center py-4">Image marked as good.</p>)}
              {visibleDetections.map((defect, index) => {
                  const wMm = defect.widthMm || (defect.normalized?.width * imageWidth) * (7.9375 / pixelDensity);
                  const hMm = defect.heightMm || (defect.normalized?.height * imageHeight) * (7.9375 / pixelDensity);
                  const currentDisposition = defect.disposition || "Pending";
                  const isSelected = index === selectedDefectIndex;
                  if (!defect.normalized) return <div key={defect.id || index} className='text-xs text-red-500'>Defect data incomplete.</div>;
                  return (
                    <div key={defect.id || index} className={`p-2 rounded border cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`} onClick={() => handleDefectSelect(index)}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">Defect #{index + 1} {defect.isTrueFail ? `(${defect.failReason})` : ''}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>{currentDisposition}</span>
                      </div>
                      <div className="text-xs text-gray-600">Size: {wMm.toFixed(1)} x {hMm.toFixed(1)} mm</div>
                    </div>);
              })}
              </div>
            </div>
          </div>
        </div>
        {showPinModal && <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"><div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4"><h3 className="text-xl font-bold mb-4">Authentication</h3><p className="mb-4">Enter PIN to access controls.</p><div className="mb-4"><label htmlFor="pin-input" className="block text-sm mb-1">PIN:</label><input id="pin-input" type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Enter PIN" className={`w-full px-3 py-2 border ${pinError ? 'border-red-500' : 'border-gray-300'} rounded focus:ring-blue-500`} maxLength={4} onKeyDown={e => e.key === 'Enter' && verifyPin()} />{pinError && <p className="mt-1 text-red-500 text-sm">Incorrect PIN.</p>}</div><div className="flex justify-end gap-3"><button onClick={() => setShowPinModal(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button><button onClick={verifyPin} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Submit</button></div></div></div>}
      </div>
    </div>
  );
};

export default ExpandedCameraModal; 