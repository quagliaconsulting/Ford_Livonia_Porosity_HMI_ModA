import { ApiService } from './api';

/**
 * Service for defect-related API operations
 */
export const DefectService = {
  /**
   * Get all defects for a specific image
   * @param {number} imageId - Image ID
   * @returns {Promise<Array>} - List of defects with normalized coordinates
   */
  getDefectsForImage: (imageId) => ApiService.get(`/defects/image/${imageId}`),
  
  /**
   * Get details for a specific defect
   * @param {number} defectId - Defect ID
   * @returns {Promise<Object>} - Defect details
   */
  getDefect: (defectId) => ApiService.get(`/defects/${defectId}`),
  
  /**
   * Update the disposition for a defect
   * @param {number} defectId - Defect ID
   * @param {string} disposition - Disposition decision (e.g., "Scrap", "Part Okay")
   * @param {string} notes - Optional notes about the disposition
   * @returns {Promise<Object>} - Updated defect
   */
  updateDefectDisposition: (defectId, disposition, notes) => 
    ApiService.patch(`/defects/${defectId}`, { 
      disposition, 
      notes // Ensure your backend schema for DefectUpdate includes notes
    }),
  
  /**
   * Get defect statistics
   * @returns {Promise<Object>} - Defect statistics
   */
  getDefectStatistics: () => ApiService.get('/defects/statistics/summary'),
  
  /**
   * Convert YOLO format text to defect objects with normalized coordinates
   * @param {string} yoloText - YOLO format defect data
   * @param {number} imageWidth - Image width in pixels
   * @param {number} imageHeight - Image height in pixels
   * @returns {Array} - Array of defect objects with normalized coordinates
   */
  parseYoloDetections: (yoloText, imageWidth, imageHeight) => {
    if (!yoloText || yoloText.trim() === '') return [];
    
    return yoloText.trim().split('\n').map((line, index) => {
      const parts = line.trim().split(' ').map(Number);
      const classId = parts[0]; 
      const x_center_norm = parts[1];
      const y_center_norm = parts[2];
      const width_norm = parts[3];
      const height_norm = parts[4];
      
      // Calculate absolute coordinates for legacy compatibility
      const x_abs = (x_center_norm - width_norm/2) * imageWidth;
      const y_abs = (y_center_norm - height_norm/2) * imageHeight;
      const width_abs = width_norm * imageWidth;
      const height_abs = height_norm * imageHeight;
      
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
  },
  
  /**
   * Calculate if a defect is a failure based on region criteria
   * @param {Object} defect - Defect with dimensions
   * @param {number} pixelDensity - Pixels per millimeter
   * @param {number} sizeThreshold - Size threshold in millimeters
   * @returns {Object} - Analysis result with failure status
   */
  analyzeDefect: (defect, pixelDensity, sizeThreshold) => {
    // Convert dimensions to millimeters
    const widthMm = defect.width / pixelDensity;
    const heightMm = defect.height / pixelDensity;
    
    // Check if defect exceeds size threshold
    const maxDimension = Math.max(widthMm, heightMm);
    const isSizeFail = maxDimension >= sizeThreshold;
    
    return {
      ...defect,
      widthMm,
      heightMm,
      areaMm: widthMm * heightMm,
      isTrueFail: isSizeFail,
      failReason: isSizeFail ? 'Size' : null
    };
  }
};