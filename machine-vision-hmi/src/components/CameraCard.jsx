// CameraCard.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

// TODO: Consider moving utility functions to a separate file
const parseYoloDetections = (fileContent, imageWidth, imageHeight) => {
  if (!fileContent || fileContent.trim() === '') return [];
  return fileContent.trim().split('\n').map((line, index) => {
    const parts = line.trim().split(' ').map(Number);
    const classId = parts[0]; const x_center_norm = parts[1]; const y_center_norm = parts[2];
    const width_norm = parts[3]; const height_norm = parts[4];
    const x_abs = (x_center_norm - width_norm/2) * imageWidth;
    const y_abs = (y_center_norm - height_norm/2) * imageHeight;
    const width_abs = width_norm * imageWidth; const height_abs = height_norm * imageHeight;
    return { id: `defect-${index}-${Date.now()}`, classId, normalized: { x_center: x_center_norm, y_center: y_center_norm, width: width_norm, height: height_norm }, x: x_abs, y: y_abs, width: width_abs, height: height_abs, label: `Defect ${classId}` };
  });
};

const CameraCard = ({ id, onSelect }) => {
  const [status, setStatus] = useState({ failed: false, timestamp: new Date(), imageType: 'good' });
  const [detections, setDetections] = useState([]);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 });
  const imageRef = React.useRef(null);

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
    }
  };

  useEffect(() => {
    let observer; let currentImageRef = imageRef.current;
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
            if (observer) { observer.unobserve(currentImageRef); observer.disconnect(); }
            currentImageRef.removeEventListener('load', handleImageLoad);
        }
    };
  }, [status.imageType]);

  useEffect(() => {
    const loadDetections = async () => {
      if (status.imageType === 'bad') {
        try {
          const imgWidth = imageRef.current?.naturalWidth || 5120; const imgHeight = imageRef.current?.naturalHeight || 5120;
          const response = await fetch(`/images/camera${id}_bad.txt`);
          if (response.ok) {
            const yoloContent = await response.text();
            const parsedDetections = parseYoloDetections(yoloContent, imgWidth, imgHeight);
            setDetections(parsedDetections);
          } else { setDetections([]); }
        } catch (error) { console.error("Error loading detections:", error); setDetections([]); }
      } else { setDetections([]); }
    };
    loadDetections();
  }, [id, status.imageType]);

  // Randomize the image type periodically, start good, first check after 5s, then every 30s
  useEffect(() => {
    let timeoutId = null;
    let intervalId = null;

    const performRandomUpdate = () => {
      const randomizeBad = Math.random() < 0.5;
      const imageType = randomizeBad ? 'bad' : 'good';
      setStatus({
        failed: randomizeBad,
        timestamp: new Date(),
        imageType,
      });
    };

    // Schedule the first update after 5 seconds
    timeoutId = setTimeout(() => {
      console.log(`Camera ${id}: Performing initial random check after 5s`);
      performRandomUpdate();
      
      // After the first check, start the regular 30-second interval
      intervalId = setInterval(() => {
         console.log(`Camera ${id}: Performing periodic random check (30s interval)`);
         performRandomUpdate();
      }, 30000); // Subsequent updates every 30 seconds

    }, 5000); // First update after 5 seconds

    // Cleanup function
    return () => {
      console.log(`Camera ${id}: Clearing image randomization timers`);
      clearTimeout(timeoutId); 
      clearInterval(intervalId);
    };
  }, [id]); // Depend only on id, as status changes shouldn't reset the timer logic

  return (
    <div
      className={`border-2 rounded-lg bg-white shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col w-[32%] ${status.failed ? 'border-red-500 flashing-border' : 'border-gray-200'}`}
      onClick={() => onSelect(id, { status, detections })}
    >
      <div className="flex justify-between items-center p-2 flex-shrink-0">
        <h3 className="font-semibold">Camera {id}</h3>
        {status.failed ? <X className="text-red-500" /> : <CheckCircle className="text-green-500" />}
      </div>
      <div
        className="relative flex-1 bg-gray-100 overflow-hidden min-h-0"
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative h-full w-full">
            <img ref={imageRef} src={`/images/camera${id}_${status.imageType}.jpg?t=${status.timestamp.getTime()}`} alt={`Camera ${id} feed`} className="w-full h-full object-contain"
              onError={(e) => {
                  console.warn(`Error loading image: /images/camera${id}_${status.imageType}.jpg`);
                  e.target.onerror = null; e.target.src = `/images/camera${id}.jpg`;
                  setStatus(prev => ({...prev, imageType: 'good', failed: false}));
                  e.target.onerror = () => { console.error(`Fallback image /images/camera${id}.jpg also failed.`); };
              }}
            />
            {/* Detection overlay for bad images - Use percentage positioning relative to container */}
            {status.imageType === 'bad' && detections.map((detection) => (
              <div 
                key={detection.id} 
                style={{
                  position: 'absolute',
                  // Position based on normalized coords relative to the parent container (div with relative h-full w-full)
                  left: `${detection.normalized.x_center * 100}%`,
                  top: `${detection.normalized.y_center * 100}%`,
                  width: `${detection.normalized.width * 100}%`,
                  height: `${detection.normalized.height * 100}%`,
                  transform: 'translate(-50%, -50%)', // Keep centering on the point
                  border: '0.5px solid red',
                  backgroundColor: 'transparent',
                  pointerEvents: 'none'
                }}
               />
            ))}
          </div>
        </div>
      </div>
      <div className="p-2 text-xs text-gray-600 flex-shrink-0">
        Last update: {status.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default CameraCard; 