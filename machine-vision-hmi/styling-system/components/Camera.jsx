import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import '../css/components.css';

/**
 * Camera component that displays an image with status indicators
 * This is a sample component using the extracted styling system
 */
const Camera = ({ id, imageUrl, onSelect }) => {
  const [status, setStatus] = useState({
    failed: false,
    timestamp: new Date().toLocaleTimeString(),
    imageType: 'good' // 'good' or 'bad'
  });
  const [detections, setDetections] = useState([]);

  // Simulate loading detections if image type is 'bad'
  useEffect(() => {
    const loadDetections = async () => {
      if (status.imageType === 'bad') {
        // Simulate loading detections from a file or API
        const sampleDetections = [
          { x: 0.2, y: 0.3, width: 0.1, height: 0.1, class: 'defect', confidence: 0.92 },
          { x: 0.6, y: 0.7, width: 0.15, height: 0.05, class: 'defect', confidence: 0.87 }
        ];
        setDetections(sampleDetections);
      } else {
        setDetections([]);
      }
    };
    
    loadDetections();
  }, [status.imageType]);

  // Simulate changing image type
  useEffect(() => {
    const interval = setInterval(() => {
      // 50% chance to show a bad image
      const newImageType = Math.random() > 0.5 ? 'bad' : 'good';
      setStatus(prev => ({
        ...prev,
        imageType: newImageType,
        timestamp: new Date().toLocaleTimeString()
      }));
    }, 30000); // Change every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Render detections if they exist
  const renderDetections = () => {
    const containerRef = document.getElementById(`camera-${id}-container`);
    if (!containerRef) return null;
    
    const containerWidth = containerRef.clientWidth;
    const containerHeight = containerRef.clientHeight;
    
    return detections.map((detection, index) => {
      const left = detection.x * containerWidth;
      const top = detection.y * containerHeight;
      const width = detection.width * containerWidth;
      const height = detection.height * containerHeight;
      
      return (
        <div
          key={`detection-${index}`}
          className="detection-box"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          <div className="detection-label">
            {detection.class} ({Math.round(detection.confidence * 100)}%)
          </div>
        </div>
      );
    });
  };

  return (
    <div 
      className={`camera-container ${status.failed ? 'flashing-border' : ''}`}
      onClick={() => onSelect && onSelect(id, status)}
      id={`camera-${id}-container`}
    >
      <div className="camera-header">
        <div>Camera {id}</div>
        <div className="status-icon">
          {status.imageType === 'good' ? (
            <CheckCircle className="status-icon-success" size={16} />
          ) : (
            <X className="status-icon-error" size={16} />
          )}
        </div>
      </div>
      
      <div className="camera-image-container">
        <img
          src={imageUrl || `/sample-images/${status.imageType}.jpg`}
          alt={`Camera ${id}`}
          className="camera-image"
          onError={(e) => {
            e.target.src = '/sample-images/default.jpg';
            setStatus(prev => ({ ...prev, failed: true }));
          }}
        />
        
        {status.imageType === 'bad' && (
          <div className="detection-overlay">
            {renderDetections()}
          </div>
        )}
      </div>
      
      <div className="camera-footer">
        <div>Last update: {status.timestamp}</div>
      </div>
    </div>
  );
};

export default Camera; 