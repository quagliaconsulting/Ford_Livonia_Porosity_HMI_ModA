// CameraCard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { CameraService } from '../api/cameraService';
import { ImageService } from '../api/imageService';
import { DefectService } from '../api/defectService';

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

const CameraCard = ({ camera, onSelect }) => {
  const [status, setStatus] = useState({ failed: false, timestamp: new Date(), imageType: 'good' });
  const [detections, setDetections] = useState([]);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [latestImageId, setLatestImageId] = useState(null);
  const imageRef = useRef(null);
  const pollingIntervalRef = useRef(null); // Changed name to avoid conflict if not already changed

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
    if (!camera || !camera.serial_number) {
      setError("Camera data is missing.");
      setLoading(false);
      return;
    }
    // No setLoading(true) here to avoid flickering on poll, only initial load
    // setError(null); // Clear previous error before new fetch

    try {
      const cameraStatus = await CameraService.getCameraLatest(camera.serial_number);

      if (cameraStatus.latest_image_id) {
        if (latestImageId !== cameraStatus.latest_image_id) {
          setLatestImageId(cameraStatus.latest_image_id);
          setImageUrl(ImageService.getImageUrl(cameraStatus.latest_image_id)); // Use service
        }
        
        setStatus({
          failed: cameraStatus.has_defects,
          timestamp: cameraStatus.timestamp ? new Date(cameraStatus.timestamp) : new Date(),
          imageType: cameraStatus.has_defects ? 'bad' : 'good'
        });

        if (cameraStatus.has_defects) {
          // Only fetch defects if the image changed or if we don't have them yet for this image
          // This simple check might need refinement if defect state can change for the same image_id
          // For now, always fetching if has_defects is true and image is new or detections are empty for this image.
          // Or simply, if has_defects is true and we don't already have defects for this specific image_id.
          const defectsData = await DefectService.getDefectsForImage(cameraStatus.latest_image_id);
          setDetections(defectsData);
        } else {
          setDetections([]);
        }
      } else {
        setStatus({
          failed: false, // Or some other indicator for "no image"
          timestamp: new Date(),
          imageType: 'no_image' // Or 'good' or a specific placeholder
        });
        setImageUrl(''); // No image
        setLatestImageId(null);
        setDetections([]);
      }
      setError(null); // Clear error on successful fetch
    } catch (err) {
      console.error(`Error fetching status for camera ${camera.serial_number}:`, err);
      setError(err.message || 'Failed to load camera data');
      // Optionally, set a status to indicate error, e.g.
      // setStatus({ failed: true, timestamp: new Date(), imageType: 'error' }); 
    } finally {
      setLoading(false); // Set loading to false after attempt, regardless of outcome
    }
  };

  // Initial fetch and setup polling
  useEffect(() => {
    setLoading(true); // Set loading true for the very first fetch
    fetchCameraStatus();

    // Polling interval from plan is 30 seconds
    pollingIntervalRef.current = setInterval(fetchCameraStatus, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [camera.serial_number]); // Re-run if camera serial number changes

  // Handle image dimensions - this effect is from the plan
  useEffect(() => {
    let observer;
    let currentImageRef = imageRef.current;

    const initObserver = () => {
      if (currentImageRef) {
        observer = new ResizeObserver(updateImageDimensions);
        observer.observe(currentImageRef);
        updateImageDimensions(); // Initial call
        // The plan adds 'load' listener here, ensure it's correctly handled
        // It might be better to call updateImageDimensions from img.onLoad directly
      }
    };
    
    // Image onload handling
    const handleImageLoad = () => {
        updateImageDimensions();
        // if currentImageRef was the one observed, ensure observer is still valid or re-observe.
        // This might be tricky if imageUrl changes rapidly.
    }

    if (currentImageRef) {
        currentImageRef.addEventListener('load', handleImageLoad);
    }

    const timeoutId = setTimeout(initObserver, 50); // As per plan

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
  }, [imageUrl]); // Re-run when imageUrl changes to attach load listener to new image element

  const handleImageError = (e) => {
    console.warn(`Error loading image for camera ${camera.serial_number}: ${imageUrl}`);
    setError(`Image not found for ${camera.serial_number}`);
    setImageUrl(''); // Clear invalid URL
    // Fallback image as per plan - this could be a static asset or a placeholder
    // e.target.src = `/images/camera_placeholder.jpg`; // A generic placeholder
    // For now, just show error
  };

  return (
    <div
      className={`border-2 rounded-lg bg-white shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200 flex flex-col w-[32%] min-h-[300px] ${status.failed ? 'border-red-500 flashing-border' : 'border-gray-200'}`}
      onClick={() => onSelect(camera.serial_number, { status, detections, imageUrl, latestImageId })}
    >
      <div className="flex justify-between items-center p-2 flex-shrink-0">
        <h3 className="font-semibold">Camera {camera.serial_number || 'N/A'}</h3>
        {loading && !error ? ( // Show loading only if no error displayed
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
          ) : loading && !imageUrl ? ( // Show "Loading image..." only if loading and no URL yet
            <p className="text-gray-400 text-xs">Loading image...</p>
          ) : (
            <div className="relative h-full w-full">
              {imageUrl ? (
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={`Camera ${camera.serial_number} feed`}
                  className="w-full h-full object-contain"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-400 text-xs">{ status.imageType === 'no_image' ? 'No image available' : 'Image loading...'}</p>
                </div>
              )}

              {/* Detection overlay - only show for failed status with detections */}
              {status.failed && detections && detections.length > 0 && imageUrl && detections.map((detection) => (
                <div
                  key={detection.id}
                  style={{
                    position: 'absolute',
                    // Use normalized coordinates directly for positioning within the image's container
                    // Assumes the parent div of img is the reference for these percentages
                    left: `${detection.normalized.x_center * 100}%`,
                    top: `${detection.normalized.y_center * 100}%`,
                    width: `${detection.normalized.width * 100}%`,
                    height: `${detection.normalized.height * 100}%`,
                    transform: 'translate(-50%, -50%)', // Center the box on the coordinates
                    border: '0.5px solid red', // Thinner border as per old component
                    backgroundColor: 'transparent', // As per old component
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