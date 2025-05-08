// ExpandedCameraModal.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Lock, Unlock, X } from 'lucide-react';
import Panzoom from '@panzoom/panzoom';

// TODO: Move utils
const parseYoloDetections = (fileContent, imageWidth, imageHeight) => {
  if (!fileContent || fileContent.trim() === '') return [];
  return fileContent.trim().split('\n').map((line, index) => {
    const parts = line.trim().split(' ').map(Number);
    const classId = parts[0]; const x_center_norm = parts[1]; const y_center_norm = parts[2];
    const width_norm = parts[3]; const height_norm = parts[4];
    const x_abs = (x_center_norm - width_norm/2) * imageWidth; const y_abs = (y_center_norm - height_norm/2) * imageHeight;
    const width_abs = width_norm * imageWidth; const height_abs = height_norm * imageHeight;
    return { id: `defect-${index}-${Date.now()}`, classId, normalized: { x_center: x_center_norm, y_center: y_center_norm, width: width_norm, height: height_norm }, x: x_abs, y: y_abs, width: width_abs, height: height_abs, label: `Defect ${classId}` };
  });
};
const millimetersToPixels = (mm, pixelDensity) => mm * pixelDensity;

const ExpandedCameraModal = ({ cameraId, initialState, onClose }) => {
  const [pixelDensity] = useState(95 / 7.9375);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [currentRegionId, setCurrentRegionId] = useState('');
  const [newRegionId, setNewRegionId] = useState('');
  const [savedRegions, setSavedRegions] = useState({});
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [imageType, setImageType] = useState(initialState?.status?.imageType || 'good');
  const [detections, setDetections] = useState(initialState?.detections || []);
  const [sizeThreshold, setSizeThreshold] = useState(1.0);
  const [densityThreshold, setDensityThreshold] = useState(3);
  const [proximityThreshold, setProximityThreshold] = useState(5.0);
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);
  const [failureAnalysisEnabled, setFailureAnalysisEnabled] = useState(false);
  const [imageWidth, setImageWidth] = useState(5120);
  const [imageHeight, setImageHeight] = useState(5120);
  const [zoomScale, setZoomScale] = useState(1);
  const [detectionDisplayMode, setDetectionDisplayMode] = useState(0);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 });
  const [inspectionHistory, setInspectionHistory] = useState([
    ...(initialState?.status ? [{ id: Date.now(), timestamp: initialState.status.timestamp || new Date(), imageType: initialState.status.imageType || 'good', disposition: initialState.status.failed ? 'Scrap' : 'Part Okay' }] : []),
    ...Array(9).fill(null).map((_, i) => ({ id: i, timestamp: new Date(Date.now() - (i + 1) * 3600000), imageType: Math.random() < 0.7 ? 'good' : 'bad', disposition: Math.random() < 0.7 ? 'Part Okay' : 'Scrap' }))
  ]);

  // --- NEW STATE --- 
  const [selectedDefectIndex, setSelectedDefectIndex] = useState(-1); // -1 means nothing selected
  // Add state to store dispositions for each defect (optional, could also modify original array)
  // const [defectDispositions, setDefectDispositions] = useState({}); // E.g., { defectId: 'okay', ... }

  // --- Polygon Drawing State ---
  const [isDrawingRegion, setIsDrawingRegion] = useState(false);
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState([]);
  // --- End Polygon Drawing State ---

  // --- Refs to store event handlers for removal ---
  const wheelHandlerRef = useRef(null);
  const zoomHandlerRef = useRef(null);

  // --- Refs --- 
  const imageRef = useRef(null);
  const panzoomInstanceRef = useRef(null);
  const imageContainerRef = useRef(null);
  const panzoomTargetRef = useRef(null);

  useEffect(() => { try { const d = localStorage.getItem(`camera${cameraId}_regions`); if (d) setSavedRegions(JSON.parse(d)); } catch (e) { console.error(e); } }, [cameraId]);

  const saveRegionParameters = () => { if (!currentRegionId) return; const p = { sizeThreshold, densityThreshold, proximityThreshold, lastUpdated: new Date().toISOString(), cameraId }; const u = { ...savedRegions, [currentRegionId]: p }; setSavedRegions(u); try { localStorage.setItem(`camera${cameraId}_regions`, JSON.stringify(u)); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000); } catch (e) { console.error(e); } };
  const loadRegionParameters = (regionId) => { if (!regionId || !savedRegions[regionId]) return; const p = savedRegions[regionId]; setSizeThreshold(p.sizeThreshold); setDensityThreshold(p.densityThreshold); setProximityThreshold(p.proximityThreshold); setFailureAnalysisEnabled(true); setCurrentRegionId(regionId); };
  const addNewRegion = () => { 
    if (!newRegionId.trim() || currentPolygonPoints.length < 3) return; // Ensure polygon has at least 3 points
    setCurrentRegionId(newRegionId);
    const p = { 
        sizeThreshold, 
        densityThreshold, 
        proximityThreshold, 
        polygon: currentPolygonPoints, // Add polygon points
        lastUpdated: new Date().toISOString(), 
        cameraId 
    }; 
    const u = { ...savedRegions, [newRegionId]: p }; 
    setSavedRegions(u); 
    try { localStorage.setItem(`camera${cameraId}_regions`, JSON.stringify(u)); } 
    catch (e) { console.error(e); } 
    setNewRegionId(''); 
    setShowRegionForm(false); 
    setCurrentPolygonPoints([]); // Reset points
    setIsDrawingRegion(false); // Ensure drawing state is reset
    setSaveSuccess(true); 
    setTimeout(() => setSaveSuccess(false), 2000); 
  };
  const deleteRegion = (regionId) => { if (!regionId || !savedRegions[regionId]) return; const { [regionId]: removed, ...updatedRegions } = savedRegions; setSavedRegions(updatedRegions); if (currentRegionId === regionId) setCurrentRegionId(''); try { localStorage.setItem(`camera${cameraId}_regions`, JSON.stringify(updatedRegions)); } catch (e) { console.error(e); } };
  const handleSidebarToggle = () => { if (!isSidebarCollapsed) setIsSidebarCollapsed(true); else { setShowPinModal(true); setPinInput(''); setPinError(false); } };
  const verifyPin = () => { const now = new Date(); const h = now.getHours(); const m = now.getMinutes(); const pin = `${h.toString().padStart(2, '0')}${m.toString().padStart(2, '0')}`; if (pinInput === pin) { setIsSidebarCollapsed(false); setShowPinModal(false); setPinInput(''); } else { setPinError(true); setPinInput(''); setTimeout(() => setPinError(false), 2000); } };

  const updateImageDimensions = () => {
    if (imageRef.current) {
      const img = imageRef.current; const container = img.parentElement;
      if (!container) return;
      const containerWidth = container.clientWidth; const containerHeight = container.clientHeight;
      const naturalWidth = img.naturalWidth; const naturalHeight = img.naturalHeight;
      if (naturalWidth === 0 || naturalHeight === 0) return;
      let displayWidth, displayHeight;
      const containerAspect = containerWidth / containerHeight; const imageAspect = naturalWidth / naturalHeight;
      if (imageAspect > containerAspect) { displayWidth = containerWidth; displayHeight = containerWidth / imageAspect; }
      else { displayHeight = containerHeight; displayWidth = containerHeight * imageAspect; }
      const offsetLeft = (containerWidth - displayWidth) / 2; const offsetTop = (containerHeight - displayHeight) / 2;
      setImageDimensions({ width: displayWidth, height: displayHeight, offsetLeft, offsetTop });
      if (naturalWidth !== imageWidth) setImageWidth(naturalWidth);
      if (naturalHeight !== imageHeight) setImageHeight(naturalHeight);
    }
  };

  // --- Function to Initialize Panzoom --- 
  const initializePanzoom = () => {
    if (panzoomInstanceRef.current || !panzoomTargetRef.current || !imageContainerRef.current) return;

    const panzoomTargetElement = panzoomTargetRef.current; // The element Panzoom is attached to
    const containerElement = imageContainerRef.current; // The parent container
    console.log("Attempting Panzoom Init on wrapper...");

    const imageElement = imageRef.current;
    if (imageElement && imageElement.complete && imageElement.naturalWidth > 0) { 
      console.log(`Initializing Panzoom for camera ${cameraId} on wrapper`);
      const pz = Panzoom(panzoomTargetElement, {
        maxScale: 20, 
        minScale: 0.5, 
        contain: 'outside', 
        step: 0.3
      });
      panzoomInstanceRef.current = pz;

      const handlePanZoomChange = (event) => {
        if (event.detail && typeof event.detail.scale === 'number') { 
            console.log('panzoomchange event on target, scale:', event.detail.scale.toFixed(3)); // Modified log
            setZoomScale(event.detail.scale);
        }
      };
      zoomHandlerRef.current = handlePanZoomChange; // Keep handler ref
      
      // --- MODIFIED: Attach listeners to the panzoom TARGET element --- 
      panzoomTargetElement.addEventListener('panzoomchange', zoomHandlerRef.current); 
      panzoomTargetElement.addEventListener('panzoomreset', zoomHandlerRef.current); 
      // --- End Modification ---

      // Keep wheel listener on the PARENT container for better capture area
      wheelHandlerRef.current = pz.zoomWithWheel;
      containerElement.addEventListener('wheel', wheelHandlerRef.current);

      setZoomScale(pz.getScale()); // Set initial scale
    } else {
       console.warn("Panzoom init skipped: Image not ready within target.");
    }
  };

  // --- Effect for Panzoom Cleanup --- 
  useEffect(() => {
    const containerNode = imageContainerRef.current; // Parent container
    const targetNode = panzoomTargetRef.current; // Panzoom target element
    const panzoomNode = panzoomInstanceRef.current;
    const wheelHandler = wheelHandlerRef.current; // Belongs to containerNode
    const zoomHandler = zoomHandlerRef.current; // Belongs to targetNode

    return () => {
      if (panzoomNode) {
        console.log(`Destroying Panzoom for camera ${cameraId}`);
        panzoomNode.destroy();
      }
      if (targetNode && zoomHandler) {
          console.log("Removing panzoomchange/reset listeners from targetNode");
          targetNode.removeEventListener('panzoomchange', zoomHandler);
          targetNode.removeEventListener('panzoomreset', zoomHandler);
      }
      if (containerNode && wheelHandler) {
          console.log("Removing wheel listener from containerNode");
          containerNode.removeEventListener('wheel', wheelHandler);
      }
      panzoomInstanceRef.current = null;
      wheelHandlerRef.current = null;
      zoomHandlerRef.current = null;
    };
  }, [cameraId]);

  // --- Other Effects (Load Detections, etc.) ---
  useEffect(() => { try { const d = localStorage.getItem(`camera${cameraId}_regions`); if (d) setSavedRegions(JSON.parse(d)); } catch (e) { console.error(e); } }, [cameraId]);
  useEffect(() => { const t = setTimeout(updateImageDimensions, 300); return () => clearTimeout(t); }, [isSidebarCollapsed]);
  useEffect(() => { window.dispatchEvent(new Event('resize')); const t = setTimeout(() => { window.dispatchEvent(new Event('resize')); updateImageDimensions(); }, 100); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const load = async () => {
      if (imageType === 'good') { setDetections([]); return; }
      if (initialState?.detections?.length > 0 && imageType === initialState?.status?.imageType) { setDetections(initialState.detections); return; }
      try {
        const res = await fetch(`/images/camera${cameraId}_bad.txt`);
        if (res.ok) {
          const yolo = await res.text();
          const w = imageRef.current?.naturalWidth || imageWidth;
          const h = imageRef.current?.naturalHeight || imageHeight;
          setDetections(parseYoloDetections(yolo, w, h));
        } else { setDetections([]); }
      } catch (error) { console.error(error); setDetections([]); }
    };
    load();
  }, [cameraId, imageType, initialState, imageWidth, imageHeight]);

  // --- UPDATED DISPOSITION HANDLER --- 
  const handleDisposition = (disp) => {
    if (selectedDefectIndex < 0 || selectedDefectIndex >= visibleDetections.length) {
        console.warn("Disposition clicked with no valid defect selected.");
        return;
    }
    const selectedDefect = visibleDetections[selectedDefectIndex];
    console.log(`Disposition for Defect ${selectedDefect.id} (Index ${selectedDefectIndex}): ${disp}`);
    
    // TODO: Update the actual defect data or a separate state with the disposition
    // Example: setDefectDispositions(prev => ({ ...prev, [selectedDefect.id]: disp }));
    
    // Optionally, move to the next defect after disposition
    // handleNextDefect(); 
  };

  // --- NEW NAVIGATION HANDLERS --- 
  const handleDefectSelect = (index) => {
      console.log(`Attempting to select defect index: ${index}`);
      if (index < 0 || index >= visibleDetections.length) {
        console.log("Invalid index or no visible detections, resetting selection.");
        setSelectedDefectIndex(-1);
        return;
      }

      setSelectedDefectIndex(index);
      
      const panzoom = panzoomInstanceRef.current;
      const defect = visibleDetections[index];
      
      if (!panzoom) {
          console.error("Panzoom instance not available for navigation.");
          return;
      }
      if (!defect || typeof defect.x !== 'number' || typeof defect.y !== 'number' || typeof defect.width !== 'number' || typeof defect.height !== 'number') {
          console.error("Selected defect data is invalid or incomplete:", defect);
          return;
      }

      try {
        // Get the panzoom target element and its parent container
        const panzoomElement = panzoomTargetRef.current;
        const parentContainer = imageContainerRef.current; // The element handling pointer events for zoomToPoint
        if (!panzoomElement || !parentContainer) { 
            console.error("Panzoom refs not available for dimension/position calculation.");
            return;
        }

        // Calculate the viewport center coordinates of the image container
        const containerRect = parentContainer.getBoundingClientRect();
        const viewCenterX = containerRect.left + containerRect.width / 2;
        const viewCenterY = containerRect.top + containerRect.height / 2;

        const targetScale = 2;

        console.log(`Queueing reset, zoom, and pan for index ${index}`);

        // Wrap in setTimeout to ensure execution after current event loop tick
        setTimeout(() => {
            const currentPanzoom = panzoomInstanceRef.current; // Re-check ref inside timeout
            if (!currentPanzoom) {
                console.error("Panzoom instance lost before timeout execution.");
                return;
            }
            const parentContainer = imageContainerRef.current; // Also need parent container ref
            if (!parentContainer) {
                 console.error("Parent container ref lost before timeout execution.");
                 return;
            }

            console.log(`Executing reset, zoom, and pan for index ${index}`);
            try {
                // Reset first to clear potential bad state
                console.log(`  Resetting panzoom state...`);
                currentPanzoom.reset({ animate: false, force: true });
                
                // 1. Zoom to the target scale (no focal point)
                console.log(`  Zooming to scale ${targetScale}...`);
                currentPanzoom.zoom(targetScale, { animate: false }); 
                const zoomedScale = currentPanzoom.getScale(); // Use actual scale after zoom
                console.log(`  After Zoom - Scale: ${zoomedScale.toFixed(2)}`);

                // 2. Calculate required pan to center the defect, considering transform origin
                const viewContainerRect = parentContainer.getBoundingClientRect();
                // View center relative to the view container itself
                const viewCenterX = viewContainerRect.width / 2; 
                const viewCenterY = viewContainerRect.height / 2;

                // Defect center coordinates on the *original, full-size* image
                const defectOrigX = defect.normalized.x_center * imageWidth; 
                const defectOrigY = defect.normalized.y_center * imageHeight;

                // Calculate the pan needed using the formula for 50% 50% transform origin
                const W = imageWidth; // Original image width
                const H = imageHeight; // Original image height
                const panX = viewCenterX - (W / 2) - zoomedScale * (defectOrigX - (W / 2));
                const panY = viewCenterY - (H / 2) - zoomedScale * (defectOrigY - (H / 2));
                console.log(`  Calculated Pan for Centering (Origin 50% 50%): (${panX.toFixed(1)}, ${panY.toFixed(1)})`);

                // 3. Apply the calculated pan
                currentPanzoom.pan(panX, panY, { animate: false });

                // Log final state 
                const finalPan = currentPanzoom.getPan();
                const finalScale = currentPanzoom.getScale();
                console.log(`  Final State - Pan: (${finalPan.x.toFixed(1)}, ${finalPan.y.toFixed(1)}), Scale: ${finalScale.toFixed(2)}`);

            } catch (error) {
                console.error("Error executing reset/zoom/pan inside setTimeout:", error);
            }
        }, 0); // Zero delay pushes to end of event loop

      } catch (error) {
         console.error("Error occurred during panzoom navigation:", error);
      }
  };

  const handlePrevDefect = () => {
      if (visibleDetections.length === 0) return;
      const newIndex = selectedDefectIndex <= 0 
          ? visibleDetections.length - 1 
          : selectedDefectIndex - 1;
      handleDefectSelect(newIndex);
  };

  const handleNextDefect = () => {
      if (visibleDetections.length === 0) return;
      const newIndex = selectedDefectIndex >= visibleDetections.length - 1 
          ? 0 
          : selectedDefectIndex + 1;
      handleDefectSelect(newIndex);
  };

  const calculateDistance = (d1, d2) => { const x1 = d1.normalized.x_center * imageWidth; const y1 = d1.normalized.y_center * imageHeight; const x2 = d2.normalized.x_center * imageWidth; const y2 = d2.normalized.y_center * imageHeight; const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)); return dist * (7.9375 / 95); };
  const analyzeDefects = () => {
    if (!failureAnalysisEnabled || !detections || detections.length === 0) return detections.map(d => ({ ...d, isTrueFail: false, failReason: null }));
    const analyzed = detections.map(d => { const wMm = d.width * (7.9375 / 95); const hMm = d.height * (7.9375 / 95); const isSize = Math.max(wMm, hMm) >= sizeThreshold; return { ...d, widthMm: wMm, heightMm: hMm, areaMm: wMm * hMm, isTrueFail: isSize, failReason: isSize ? 'Size' : null, clusterMembers: [] }; });
    for (let i = 0; i < analyzed.length; i++) {
      if (analyzed[i].isTrueFail) continue;
      const nearby = [];
      for (let j = 0; j < analyzed.length; j++) { if (i === j) continue; if (calculateDistance(analyzed[i], analyzed[j]) <= proximityThreshold) nearby.push(j); }
      if (nearby.length + 1 >= densityThreshold) { analyzed[i].isTrueFail = true; analyzed[i].failReason = 'Density'; analyzed[i].clusterMembers = nearby; nearby.forEach(idx => { analyzed[idx].isTrueFail = true; analyzed[idx].failReason = 'Density'; analyzed[idx].clusterMembers = [...(analyzed[idx].clusterMembers || []), i]; }); }
    }
    return analyzed;
  };
  const enhancedDetections = useMemo(analyzeDefects, [detections, sizeThreshold, densityThreshold, proximityThreshold, failureAnalysisEnabled, imageWidth, imageHeight]);
  const visibleDetections = useMemo(() => failureAnalysisEnabled && showOnlyFailures ? enhancedDetections.filter(d => d.isTrueFail) : enhancedDetections, [enhancedDetections, showOnlyFailures, failureAnalysisEnabled]);

  const handleStartDrawing = () => {
    setCurrentPolygonPoints([]); // Clear any previous points
    setIsDrawingRegion(true);
    // Maybe add visual cue, disable panzoom temporarily?
    panzoomInstanceRef.current?.pause(); // Pause panning/zooming while drawing
  };

  const handleFinishDrawing = () => {
    setIsDrawingRegion(false);
    panzoomInstanceRef.current?.resume(); // Resume panning/zooming
    // Keep currentPolygonPoints as they are now the final shape
  };
  
  const handleCancelDrawing = () => {
    setIsDrawingRegion(false);
    setCurrentPolygonPoints([]); // Clear points
    panzoomInstanceRef.current?.resume(); // Resume panning/zooming
  };

  const handleCancelRegionForm = () => {
    setShowRegionForm(false);
    setNewRegionId('');
    setIsDrawingRegion(false);
    setCurrentPolygonPoints([]);
    panzoomInstanceRef.current?.resume(); // Ensure panzoom is resumed
  };

  const handleImageClickForPolygon = (event) => {
    if (!isDrawingRegion) return;

    const panzoom = panzoomInstanceRef.current;
    const targetElement = panzoomTargetRef.current; // Element receiving the click
    
    if (!panzoom || !targetElement || !imageRef.current) {
        console.error("Panzoom or target element not available for click handling.");
        return;
    }

    // Get click coordinates relative to the panzoom target element
    const rect = targetElement.getBoundingClientRect();
    const clickX_relativeToTarget = event.clientX - rect.left;
    const clickY_relativeToTarget = event.clientY - rect.top;

    // Get current pan and scale
    const currentPan = panzoom.getPan();
    const currentScale = panzoom.getScale();
    
    // --- Coordinate Transformation ---
    // Convert click coordinates relative to the target element 
    // into coordinates relative to the original image (0,0 at top-left)
    // This accounts for the current pan and zoom state.
    const imageCoordX = (clickX_relativeToTarget - currentPan.x) / currentScale;
    const imageCoordY = (clickY_relativeToTarget - currentPan.y) / currentScale;

    // Validate coordinates (optional, but good practice)
    if (imageCoordX < 0 || imageCoordY < 0 || imageCoordX > imageWidth || imageCoordY > imageHeight) {
        console.warn("Clicked outside image bounds.");
        return;
    }

    // Add the new point (using original image coordinates)
    setCurrentPolygonPoints(prevPoints => [...prevPoints, { x: imageCoordX, y: imageCoordY }]);
  };

  // Effect to add/remove click listener for polygon drawing
  useEffect(() => {
    const targetElement = panzoomTargetRef.current; 
    if (targetElement && isDrawingRegion) {
        console.log("Adding polygon click listener");
        targetElement.addEventListener('click', handleImageClickForPolygon);
        // Optionally change cursor style
        targetElement.style.cursor = 'crosshair';
    } else if (targetElement) {
        // Cleanup when not drawing or component unmounts
        console.log("Removing polygon click listener");
        targetElement.removeEventListener('click', handleImageClickForPolygon);
        targetElement.style.cursor = 'grab'; // Reset cursor
    }

    // Cleanup function for when the effect re-runs or component unmounts
    return () => {
      if (targetElement) {
        console.log("Cleaning up polygon click listener");
        targetElement.removeEventListener('click', handleImageClickForPolygon);
        targetElement.style.cursor = 'grab'; // Ensure cursor is reset
      }
    };
  }, [isDrawingRegion, imageWidth, imageHeight]); // Dependencies

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 overflow-auto p-4">
      <div className="bg-white rounded-lg p-4 w-full mx-4 relative max-h-[90vh] flex flex-col" style={{ maxWidth: "calc(1280px * 1.43)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl font-bold z-50 focus:outline-none" aria-label="Close">&times;</button>
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-bold">Camera {cameraId}</h2>
          <div className="ml-2">{imageType === 'good' ? <CheckCircle className="text-green-500" size={24} /> : <X className="text-red-500" size={24} />}</div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 overflow-hidden h-full">
          {/* Left Sidebar */}
          <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-14' : 'w-full lg:w-[calc(18rem*1.1)]'} flex-shrink-0 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-100px)] relative bg-white rounded-lg border border-gray-200`}>
            <button onClick={handleSidebarToggle} className="absolute right-1 top-1 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10" title={isSidebarCollapsed ? "Expand" : "Collapse"}><ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} /></button>
            <div className={`p-3 ${isSidebarCollapsed ? 'invisible opacity-0 absolute' : 'visible opacity-100'} transition-opacity duration-300`}>
              {/* Controls */} 
              <div className="mb-4"><h3 className="font-semibold mb-2">Image Type</h3><div className="flex gap-2"><button onClick={() => setImageType('good')} className={`flex-1 px-3 py-2 rounded text-sm ${imageType === 'good' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>Good</button><button onClick={() => setImageType('bad')} className={`flex-1 px-3 py-2 rounded text-sm ${imageType === 'bad' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>Bad</button></div></div>
              <div className="mb-4"><h3 className="font-semibold mb-2">Calibration</h3><div className="bg-gray-100 rounded-lg p-3"><div className="flex items-center gap-2 mb-1"><div className="text-sm">Density:</div><input type="range" min="1" max="30" step="0.1" value={pixelDensity} className="flex-1" disabled={true} /><div className="w-14 text-center font-medium text-sm">{pixelDensity.toFixed(1)}</div><button onClick={() => alert('Calibration is fixed.')} className="p-1 bg-gray-200 rounded-full" title="Calibration Locked"><Lock size={14} /></button></div><div className="text-xs text-gray-600">px/mm (Fixed)</div></div></div>
              <div className="mb-4"><div className="flex items-center justify-between mb-2"><h3 className="font-semibold">Failure Analysis</h3><button onClick={() => setFailureAnalysisEnabled(!failureAnalysisEnabled)} className={`px-2 py-1 rounded text-white text-xs ${failureAnalysisEnabled ? 'bg-green-500' : 'bg-gray-400'}`}>{failureAnalysisEnabled ? 'On' : 'Off'}</button></div>{failureAnalysisEnabled && (<><button onClick={() => setShowOnlyFailures(!showOnlyFailures)} className={`w-full px-3 py-1 rounded text-white text-sm mb-3 ${showOnlyFailures ? 'bg-red-500' : 'bg-blue-500'}`}>{showOnlyFailures ? 'Failures Only' : 'Show All'}</button><div className="mb-4 bg-gray-50 p-3 rounded-lg border"><h4 className="font-medium text-sm mb-2">Region Config</h4>{currentRegionId ? <div className="flex items-center justify-between mb-2"><span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Region: {currentRegionId}</span><div className="flex gap-1"><button onClick={saveRegionParameters} className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600">Save</button><button onClick={() => setCurrentRegionId('')} className="bg-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-400">Clear</button></div></div> : <div className="mb-2 text-xs italic">No region selected</div>}{saveSuccess && <div className="mb-2 text-xs text-green-600">✓ Saved</div>}{Object.keys(savedRegions).length > 0 && <div className="mb-2"><label className="block text-xs mb-1">Load:</label><div className="flex items-center gap-1 flex-wrap">{Object.keys(savedRegions).map(rId => (<div key={rId} className="flex items-center"><button onClick={() => loadRegionParameters(rId)} className={`text-xs px-2 py-1 rounded mr-1 ${currentRegionId === rId ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{rId}</button><button onClick={() => deleteRegion(rId)} className="text-red-500 hover:text-red-700 text-xs">×</button></div>))}</div></div>}{!showRegionForm ? <button onClick={() => setShowRegionForm(true)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded w-full">+ Add New Region</button> : <div className="mt-2 border-t pt-2"><h5 className="text-xs font-semibold mb-1">New Region</h5><div className="flex items-center gap-1 mb-2"><input type="text" value={newRegionId} onChange={(e) => setNewRegionId(e.target.value)} placeholder="Region ID" className="flex-1 px-2 py-1 text-xs border rounded" disabled={isDrawingRegion} /><button onClick={handleStartDrawing} disabled={!newRegionId.trim()} className={`w-full text-xs px-2 py-1 rounded ${!newRegionId.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>Start Drawing Polygon</button></div><div className="mb-2 space-y-1"><p className="text-xs text-center text-blue-600 italic">Click on the image to add points.</p><button onClick={handleFinishDrawing} disabled={currentPolygonPoints.length < 3} className={`w-full text-xs px-2 py-1 rounded ${currentPolygonPoints.length < 3 ? 'bg-yellow-300 cursor-not-allowed' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}>Finish Drawing ({currentPolygonPoints.length} points)</button><button onClick={handleCancelDrawing} className="w-full text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Cancel Drawing</button></div><div className="flex items-center gap-1"><button onClick={addNewRegion} disabled={!newRegionId.trim() || currentPolygonPoints.length < 3 || isDrawingRegion} className={`flex-1 px-2 py-1 rounded text-xs ${(!newRegionId.trim() || currentPolygonPoints.length < 3 || isDrawingRegion) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Save Region</button><button onClick={handleCancelRegionForm} disabled={isDrawingRegion} className={`px-2 py-1 rounded text-xs ${isDrawingRegion ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button></div></div>}</div><div className="mb-3"><label className="text-sm block mb-1">Size Thresh: {sizeThreshold.toFixed(1)}mm</label><input type="range" min="0.1" max="5.0" step="0.1" value={sizeThreshold} onChange={e => setSizeThreshold(parseFloat(e.target.value))} className="w-full"/></div><div className="mb-3"><label className="text-sm block mb-1">Density Thresh: {densityThreshold}</label><input type="range" min="2" max="10" step="1" value={densityThreshold} onChange={e => setDensityThreshold(parseInt(e.target.value))} className="w-full"/></div><div className="mb-3"><label className="text-sm block mb-1">Proximity: {proximityThreshold.toFixed(1)}mm</label><input type="range" min="1.0" max="20.0" step="0.5" value={proximityThreshold} onChange={e => setProximityThreshold(parseFloat(e.target.value))} className="w-full"/></div><div className="text-xs bg-gray-100 p-2 rounded"><div className="mb-1 font-medium">Legend:</div><div className="grid grid-cols-1 gap-1"><div className="flex items-center"><div className="w-3 h-3 mr-1 border-2 border-red-500 bg-red-100"></div><span>Size Fail</span></div><div className="flex items-center"><div className="w-3 h-3 mr-1 border-2 border-dashed border-red-400 bg-red-100"></div><span>Density Fail</span></div><div className="flex items-center"><div className="w-3 h-3 mr-1 border border-red-400"></div><span>Non-Critical</span></div></div></div></>)}</div>
            </div>
            <div className={`py-10 px-2 flex flex-col items-center space-y-6 ${isSidebarCollapsed ? 'visible opacity-100' : 'invisible opacity-0 absolute'} transition-opacity duration-300`}>
              <button onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setImageType(p => p === 'good' ? 'bad' : 'good')} title={isSidebarCollapsed ? "Auth required" : `Switch to ${imageType === 'good' ? 'bad' : 'good'}`} className={`p-1.5 rounded-full ${imageType === 'good' ? 'bg-green-100' : 'bg-red-100'} ${isSidebarCollapsed ? 'opacity-80' : 'hover:bg-opacity-80'}`}>{imageType === 'good' ? <CheckCircle className="text-green-500 h-5 w-5" /> : <X className="text-red-500 h-5 w-5" />}</button>
              <button onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setFailureAnalysisEnabled(!failureAnalysisEnabled)} className={`p-1.5 rounded-full ${failureAnalysisEnabled ? 'bg-green-100' : 'bg-gray-100'} ${isSidebarCollapsed ? 'opacity-80' : 'hover:bg-opacity-80'}`} title={isSidebarCollapsed ? "Auth required" : `${failureAnalysisEnabled ? 'Disable' : 'Enable'} FA`}><div className={`h-5 w-5 flex items-center justify-center text-xs font-bold ${failureAnalysisEnabled ? 'text-green-500' : 'text-gray-400'}`}>FA</div></button>
              {failureAnalysisEnabled && <button onClick={() => isSidebarCollapsed ? handleSidebarToggle() : setShowOnlyFailures(!showOnlyFailures)} className={`p-1.5 rounded-full ${showOnlyFailures ? 'bg-red-100' : 'bg-blue-100'} ${isSidebarCollapsed ? 'opacity-80' : 'hover:bg-opacity-80'}`} title={isSidebarCollapsed ? "Auth required" : `${showOnlyFailures ? 'Show all' : 'Failures only'}`}><div className={`h-5 w-5 flex items-center justify-center text-xs font-bold ${showOnlyFailures ? 'text-red-500' : 'text-blue-500'}`}>{showOnlyFailures ? 'F' : 'A'}</div></button>}
            </div>
          </div>
          {/* Center Image Area */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div ref={imageContainerRef} className="relative mb-4 border rounded-lg overflow-hidden flex-1" style={{ height: '75vh', minHeight: '550px' }}>
              {/* NEW: Defect Display Controls */}
              <div className="absolute top-2 left-2 z-10 bg-white bg-opacity-75 p-2 rounded shadow">
                  <h3 className="font-semibold mb-1 text-xs text-center">Display</h3>
                  <button 
                    onClick={() => setDetectionDisplayMode(p => (p + 1) % 3)} 
                    className="px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs w-12 text-center"
                    title={`Detection Display: ${['Full', 'Boxes Only', 'Hidden'][detectionDisplayMode]}`}
                  >
                    {['Full', 'Box', 'Hide'][detectionDisplayMode]}
                  </button>
              </div>

              {/* Zoom Controls */}
              <div 
                className="absolute top-2 right-2 z-10 bg-white bg-opacity-75 p-2 rounded shadow"
                style={{ transform: 'translateZ(0)' }}
              >
                <h3 className="font-semibold mb-1 text-xs text-center">Zoom</h3>
                <div className="flex gap-1">
                  <button onClick={() => panzoomInstanceRef.current?.zoomIn()} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">In</button>
                  <button onClick={() => panzoomInstanceRef.current?.zoomOut()} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">Out</button>
                  <button onClick={() => panzoomInstanceRef.current?.reset()} className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs">Reset</button>
                </div>
              </div>
              
              <div 
                ref={panzoomTargetRef} 
                className="w-full h-full relative"
                style={{ touchAction: 'none' }}
              >
                  <img 
                    ref={imageRef} 
                    src={`/images/camera${cameraId}_${imageType}.jpg`} 
                    alt={`Cam ${cameraId} ${imageType}`} 
                    className="block object-contain w-full h-full" 
                    style={{ /* Panzoom applies transform here */ }} 
                    onLoad={() => {
                        console.log(`Image loaded: ${imageRef.current?.src}`);
                        updateImageDimensions();
                        initializePanzoom();
                    }} 
                    onError={(e) => { 
                        console.error(`Failed to load image: ${e.target.src}`);
                        e.target.onerror = null; 
                        e.target.src = `/images/camera${cameraId}.jpg`; 
                        e.target.onload = () => { 
                          console.log(`Fallback image loaded: ${imageRef.current?.src}`);
                          updateImageDimensions(); 
                          initializePanzoom();
                        } 
                    }}
                  />
                  
                  {/* Detection Overlays */} 
                  {detectionDisplayMode < 2 && visibleDetections.map((d, idx) => {
                    const wMm = d.widthMm || d.width * (7.9375 / 95); const hMm = d.heightMm || d.height * (7.9375 / 95);
                    const isSelected = idx === selectedDefectIndex;
                    // Conditional border style based on selection
                    const bStyle = isSelected 
                      ? '3px solid #3b82f6' // Blue, thicker border for selected
                      : (failureAnalysisEnabled && d.isTrueFail 
                          ? (d.failReason === 'Size' ? '2px solid #ef4444' : '2px dashed #f87171') // Red variations for failures
                          : '1px solid red'); // Default red border

                    return (
                      <div 
                        key={d.id} 
                        style={{
                          position: 'absolute',
                          left: `${imageDimensions.offsetLeft + (d.normalized.x_center * imageDimensions.width)}px`,
                          top: `${imageDimensions.offsetTop + (d.normalized.y_center * imageDimensions.height)}px`,
                          width: `${d.normalized.width * imageDimensions.width}px`,
                          height: `${d.normalized.height * imageDimensions.height}px`,
                          transform: 'translate(-50%, -50%)', 
                          border: bStyle, // Use conditional border style
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : (failureAnalysisEnabled && d.isTrueFail ? 'rgba(239, 68, 68, 0.1)' : 'transparent'), // Optional: Add background tint for selected
                          pointerEvents: 'none', 
                          zIndex: isSelected ? 10 : 1 // Ensure selected is drawn on top
                        }}
                      >
                        {detectionDisplayMode === 0 && (
                          <span 
                             className={`absolute text-white text-xs px-1 whitespace-nowrap ${isSelected ? 'bg-blue-600' : (failureAnalysisEnabled && d.isTrueFail ? 'bg-red-600' : 'bg-gray-600') }`} // Conditional label background
                             style={{ fontSize: '10px', bottom: '-18px', left: '0', zIndex: 1000 }}
                          >
                             {wMm.toFixed(1)}×{hMm.toFixed(1)}mm{failureAnalysisEnabled && d.isTrueFail && ` (${d.failReason} Fail)`}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* --- SVG Overlay for Polygon Drawing & Display --- */} 
                  <svg 
                    style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: `${imageWidth}px`, // Match original image width
                        height: `${imageHeight}px`, // Match original image height
                        pointerEvents: 'none', // SVG should not interfere with clicks on the image
                        overflow: 'visible', // Allow points/lines outside initial bounds if needed
                        transformOrigin: '0 0' // Align SVG origin with image origin
                    }}
                  >
                    {/* Render polygon being actively drawn */} 
                    {isDrawingRegion && currentPolygonPoints.length > 0 && (
                      <>
                        <polyline
                          points={currentPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
                          fill={"rgba(0, 0, 255, 0.2)"} // Blue fill while drawing
                          stroke="#0000FF"
                          strokeWidth={1 / zoomScale * 2} 
                          vectorEffect="non-scaling-stroke" 
                        />
                        {currentPolygonPoints.map((point, index) => (
                            <circle
                              key={`draw-point-${index}`}
                              cx={point.x}
                              cy={point.y}
                              r={1 / zoomScale * 5} 
                              fill="#0000FF"
                            />
                        ))}
                      </>
                    )}
                    
                    {/* Render SAVED polygon for the loaded region */} 
                    {!isDrawingRegion && currentRegionId && savedRegions[currentRegionId]?.polygon?.length > 0 && (
                      <polygon // Use polygon for closed shape
                        points={savedRegions[currentRegionId].polygon.map(p => `${p.x},${p.y}`).join(' ')}
                        fill={"rgba(0, 255, 0, 0.15)"} // Greenish fill for saved region
                        stroke="#00FF00"
                        strokeWidth={1 / zoomScale * 1.5} // Slightly thinner stroke for saved
                        strokeDasharray={1 / zoomScale * 4} // Dashed line for saved
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                  </svg>
                  {/* --- End SVG Overlay --- */}

              </div>
              {/* Scale Reference */}
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 999, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', pointerEvents: 'none' }}>
                 <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>Scale Ref</div>
                 <div style={{ display: 'flex', alignItems: 'center' }}>
                   <div style={{ 
                       height: '3px', 
                       backgroundColor: 'white', 
                       width: `${millimetersToPixels(1, pixelDensity) * zoomScale}px` 
                   }}></div>
                   <span style={{ fontSize: '10px', marginLeft: '3px' }}>1mm</span>
                 </div>
                 <div style={{ fontSize: '10px', marginTop: '2px' }}>{pixelDensity.toFixed(1)} px/mm @ {zoomScale.toFixed(1)}x</div>
              </div>
            </div>
          </div>
          {/* Right Sidebar */}
          <div className="w-full lg:w-96 flex flex-col min-h-0 max-h-[calc(90vh-100px)] overflow-y-auto space-y-3">
            {/* Analysis Summary (Optional - keeping for now) */}
            {imageType === 'bad' && <div className="bg-white rounded-lg border p-3 shadow-sm flex-shrink-0"><h3 className="font-semibold text-lg mb-2 flex justify-between"><span>Analysis</span><span className={`text-sm px-2 py-0.5 rounded ${failureAnalysisEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{failureAnalysisEnabled ? 'On' : 'Off'}</span></h3>{/* ... (analysis content) ... */}</div>}
            
            {/* Disposition Controls */}
            <div className="bg-white rounded-lg border p-3 shadow-sm flex-shrink-0">
              <h3 className="font-semibold text-lg mb-3 text-center">Disposition Defect #{selectedDefectIndex >= 0 ? selectedDefectIndex + 1 : '--'}</h3>
              {/* Main Disposition Buttons */}
              <div className="flex gap-3 mb-3">
                <button 
                    className={`flex-1 py-3 text-white rounded-lg transition-colors duration-200 text-lg font-medium shadow-sm ${selectedDefectIndex === -1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                    onClick={() => handleDisposition('Part Okay')} 
                    disabled={selectedDefectIndex === -1}
                >Okay</button>
                <button 
                    className={`flex-1 py-3 text-white rounded-lg transition-colors duration-200 text-lg font-medium shadow-sm ${selectedDefectIndex === -1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
                    onClick={() => handleDisposition('Scrap')} 
                    disabled={selectedDefectIndex === -1}
                >Scrap</button>
              </div>
              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-6">
                 <button 
                    onClick={handlePrevDefect} 
                    disabled={visibleDetections.length <= 1}
                    className={`p-3 rounded-full ${visibleDetections.length <= 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
                    aria-label="Previous Defect"
                 ><ChevronLeft size={24} /></button>
                 <span className="text-sm text-gray-600">
                    {visibleDetections.length > 0 ? 
                      `${selectedDefectIndex + 1} / ${visibleDetections.length}` : 
                      '0 / 0'}
                 </span>
                 <button 
                    onClick={handleNextDefect} 
                    disabled={visibleDetections.length <= 1}
                    className={`p-3 rounded-full ${visibleDetections.length <= 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
                    aria-label="Next Defect"
                 ><ChevronRight size={24} /></button>
              </div>
            </div>

            {/* --- NEW: Part Information Section --- */}
            <div className="bg-white rounded-lg border p-3 shadow-sm flex-shrink-0">
              <h3 className="font-semibold text-lg mb-3 text-center">Part Information</h3>
              <div className="mb-3">
                <span className="font-medium text-sm">Part Type:</span>
                <span className="ml-2 text-sm">ModA_Part1</span> {/* Hardcoded part type */}
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 border-t pt-2">Viable Regions & Criteria:</h4>
                {Object.keys(savedRegions).length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No regions defined for this camera.</p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {Object.entries(savedRegions).map(([regionId, regionData]) => (
                      <li key={regionId} className="p-1.5 bg-gray-50 rounded border border-gray-200">
                        <span className="font-semibold text-blue-700">{regionId}:</span>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>Size ≥ {regionData.sizeThreshold?.toFixed(1) ?? 'N/A'} mm</li>
                          <li>Density ≥ {regionData.densityThreshold ?? 'N/A'}</li>
                          <li>Proximity ≤ {regionData.proximityThreshold?.toFixed(1) ?? 'N/A'} mm</li>
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {/* --- End Part Information Section --- */}

            {/* Detected Defect Regions List */}
            <div className="bg-white rounded-lg border p-3 shadow-sm flex-grow overflow-hidden flex flex-col">
              <h3 className="font-semibold text-lg mb-2 flex-shrink-0">Detected Defects</h3>
              <div className="space-y-2 overflow-y-auto flex-grow min-h-0">
              {visibleDetections.length === 0 && imageType === 'bad' && (
                  <p className="text-gray-500 italic text-center py-4">No defects detected for analysis.</p>
              )}
              {visibleDetections.map((defect, index) => {
                  const wMm = defect.widthMm || defect.width * (7.9375 / 95);
                  const hMm = defect.heightMm || defect.height * (7.9375 / 95);
                  // TODO: Get actual disposition if stored
                  const currentDisposition = "Pending"; // Placeholder
                  const isSelected = index === selectedDefectIndex;

                  return (
                    <div 
                      key={defect.id}
                      className={`p-2 rounded border cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}
                      onClick={() => handleDefectSelect(index)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">Defect #{index + 1} {defect.isTrueFail ? `(${defect.failReason})` : ''}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>{currentDisposition}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                         Size: {wMm.toFixed(1)} x {hMm.toFixed(1)} mm
                      </div>
                      {/* Add more details if needed */}
                    </div>
                  );
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