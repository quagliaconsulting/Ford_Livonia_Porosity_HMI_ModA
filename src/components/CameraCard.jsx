import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

// TODO: Consider moving utility functions to a separate file
// Utility function to parse YOLO format detection files
// YOLO format: class x_center y_center width height (normalized 0-1)
const parseYoloDetections = (fileContent, imageWidth, imageHeight) => {
  if (!fileContent || fileContent.trim() === '') {
    return [];
  }
  
  // console.log(`Parsing YOLO detections for image size: ${imageWidth}x${imageHeight}`);
  
  return fileContent.trim().split('\n').map((line, index) => {
    const parts = line.trim().split(' ').map(Number);
    
    // YOLO format: class x_center y_center width height (all normalized 0-1)
    const classId = parts[0];
    const x_center_norm = parts[1]; // Normalized center x (0-1)
    const y_center_norm = parts[2]; // Normalized center y (0-1)
    const width_norm = parts[3];    // Normalized width (0-1)
    const height_norm = parts[4];   // Normalized height (0-1)
    
    // Convert normalized coordinates (0-1) to absolute pixel positions on the original image
    const x_abs = (x_center_norm - width_norm/2) * imageWidth;
    const y_abs = (y_center_norm - height_norm/2) * imageHeight;
    const width_abs = width_norm * imageWidth;
    const height_abs = height_norm * imageHeight;
    
    // console.log(`Detection ${index}: Class ${classId}, Normalized (${x_center_norm}, ${y_center_norm}, ${width_norm}, ${height_norm})`);
    // console.log(`                  Absolute pixels: (${x_abs}, ${y_abs}, ${width_abs}, ${height_abs})`);
    
    return {
      id: `defect-${index}-${Date.now()}`,
      classId,
      normalized: {
        x_center: x_center_norm,
        y_center: y_center_norm,
        width: width_norm,
        height: height_norm
      },
      x: x_abs,
      y: y_abs,
      width: width_abs,
      height: height_abs,
      label: `Defect ${classId}`
    };
  });
};


// Renamed from Camera to CameraCard
const CameraCard = ({ id, onSelect }) => {
  // State for camera status, imageType and detections
  const [status, setStatus] = useState({
    failed: false,
    timestamp: new Date(),
    imageType: 'good', // Start with good image
  });
  const [detections, setDetections] = useState([]);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 });
  const imageRef = React.useRef(null);
  const containerRef = React.useRef(null); // Ref for the container

  // Function to update image dimensions after render or resize
  const updateImageDimensions = () => {
    // Need both container and image refs
    if (containerRef.current && imageRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      
      // Get container dimensions
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Get natural image dimensions
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      if (naturalWidth === 0 || naturalHeight === 0) return; // Avoid division by zero
      
      // Calculate display dimensions while maintaining aspect ratio
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
      
      setImageDimensions({ 
        width: displayWidth, 
        height: displayHeight,
        offsetLeft,
        offsetTop
      });
    }
  };

  // Observer to detect when image dimensions change
  useEffect(() => {
    let observer;
    let currentContainerRef = containerRef.current; // Use container ref
    let currentImageRef = imageRef.current; // Still need image ref for load event

    const initObserver = () => {
        // Observe the container now
        if (currentContainerRef) {
            observer = new ResizeObserver(updateImageDimensions);
            observer.observe(currentContainerRef);
            updateImageDimensions(); // Initial call
        }
        // Still need the image load listener
        if (currentImageRef) {
            currentImageRef.addEventListener('load', handleImageLoad); // Add load listener
        }
    }

    const handleImageLoad = () => updateImageDimensions();

    // Delay observer setup slightly to ensure element is ready
    const timeoutId = setTimeout(initObserver, 50);

    return () => {
        clearTimeout(timeoutId);
        // Cleanup observer
        if (currentContainerRef && observer) {
            observer.unobserve(currentContainerRef);
            observer.disconnect();
        }
        // Cleanup load listener
        if (currentImageRef) {
            currentImageRef.removeEventListener('load', handleImageLoad); // Clean up listener
        }
    };
  }, [status.imageType]); // Re-run when image type changes or ref changes (implicitly)

  // Load detections if this is a bad image
  useEffect(() => {
    const loadDetections = async () => {
      if (status.imageType === 'bad') {
        try {
          // Use placeholder dimensions for parsing if image not loaded yet
          const imgWidth = imageRef.current?.naturalWidth || 5120;
          const imgHeight = imageRef.current?.naturalHeight || 5120;
          const response = await fetch(`/images/camera${id}_bad.txt`);
          if (response.ok) {
            const yoloContent = await response.text();
            const parsedDetections = parseYoloDetections(yoloContent, imgWidth, imgHeight);
            setDetections(parsedDetections);
          } else {
            setDetections([]);
          }
        } catch (error) {
          console.error("Error loading detections:", error);
          setDetections([]);
        }
      } else {
        setDetections([]);
      }
    };

    loadDetections();
  }, [id, status.imageType]);

  // Randomize the image type periodically, but start with good
  useEffect(() => {
    const updateInterval = setInterval(() => {
      const randomizeBad = Math.random() < 0.5;
      const imageType = randomizeBad ? 'bad' : 'good';
      setStatus({
        failed: randomizeBad,
        timestamp: new Date(),
        imageType,
      });
    }, 30000); 

    return () => clearInterval(updateInterval);
  }, []);

  return (
    // Adjust width for flexbox (approx 1/3), remove fixed h and mx-auto, remove flex-shrink-0
    <div
      className={`border-2 rounded-lg bg-white shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col w-1/3 ${ 
        status.failed ? 'border-red-500 flashing-border' : 'border-gray-200'
      }`}
      onClick={() => onSelect(id, { status, detections })}
    >
      <div className="flex justify-between items-center p-2 flex-shrink-0"> {/* Added flex-shrink-0 */}
        <h3 className="font-semibold">Camera {id}</h3>
        {status.failed ? (
          <X className="text-red-500" />
        ) : (
          <CheckCircle className="text-green-500" />
        )}
      </div>

      {/* Image container */}
      <div
        ref={containerRef} // Attach container ref
        className="relative flex-1 bg-gray-100 overflow-hidden min-h-0 aspect-square"
      >
        {/* Image fills this container directly */}
        <img
          ref={imageRef}
          src={`/images/camera${id}_${status.imageType}.jpg?t=${status.timestamp.getTime()}`} // Add timestamp to force reload
          alt={`Camera ${id} feed`}
          className="w-full h-full object-contain"
          onError={(e) => {
              console.warn(`Error loading image: /images/camera${id}_${status.imageType}.jpg`);
              e.target.onerror = null;
              // Try fallback without type first
              e.target.src = `/images/camera${id}.jpg`;
              setStatus(prev => ({...prev, imageType: 'good', failed: false})); 
              // If even that fails, potentially show a placeholder?
              e.target.onerror = () => { 
                  console.error(`Fallback image /images/camera${id}.jpg also failed.`);
                  // e.target.src = '/images/placeholder.jpg'; 
              };
          }}
        />
        
        {/* Detection overlay for bad images - positioned relative to this container */}
        {status.imageType === 'bad' && imageDimensions.width > 0 && detections.map((detection) => (
          <div
            key={detection.id}
            style={{
              position: 'absolute',
              // Note: Positioning might need adjustment if aspect ratios differ significantly
              // Using imageDimensions calculated for contain, might not be perfect for cover
              left: `${imageDimensions.offsetLeft + (detection.normalized.x_center * imageDimensions.width)}px`,
              top: `${imageDimensions.offsetTop + (detection.normalized.y_center * imageDimensions.height)}px`,
              width: `${detection.normalized.width * imageDimensions.width}px`,
              height: `${detection.normalized.height * imageDimensions.height}px`,
              transform: 'translate(-50%, -50%)',
              border: '0.5px solid red',
              backgroundColor: 'transparent',
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>

      {/* Timestamp footer */}
      <div className="p-2 text-xs text-gray-600 flex-shrink-0"> {/* Added flex-shrink-0 */}
        Last update: {status.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default CameraCard; 