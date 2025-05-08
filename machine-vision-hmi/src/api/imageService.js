import { ApiService } from './api';
import config from '../config/config';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Service for image-related API operations
 */
export const ImageService = {
  /**
   * Get the latest images for all cameras
   * @returns {Promise<Array>} - List of latest images
   */
  getLatestImages: () => ApiService.get('/images/latest'),
  
  /**
   * Get details for a specific image
   * @param {number} imageId - Image ID
   * @returns {Promise<Object>} - Image details
   */
  getImage: (imageId) => ApiService.get(`/images/${imageId}`),
  
  /**
   * Get images for a specific trigger
   * @param {number} triggerId - Trigger ID
   * @returns {Promise<Array>} - List of images
   */
  getImagesForTrigger: (triggerId) => ApiService.get(`/images?trigger_id=${triggerId}`),
  
  /**
   * Get the URL for an image file
   * @param {number} imageId - Image ID
   * @returns {string} - Image URL
   */
  getImageUrl: (imageId) => `${API_BASE_URL}/images/${imageId}/file`,
  
  /**
   * Get a fallback image URL
   * @param {string} cameraId - Camera serial number
   * @param {string} imageType - Image type (good, bad)
   * @returns {string} - Fallback image URL
   */
  getFallbackImageUrl: (cameraId, imageType = 'good') => 
    `${config.imageAccess.fallbackPath}/camera${cameraId}_${imageType}.jpg`,
    
  /**
   * Preload an image to ensure it's cached by the browser
   * @param {string} imageUrl - Image URL to preload
   * @returns {Promise<HTMLImageElement>} - Promise resolving to the loaded image
   */
  preloadImage: (imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (error) => reject(error);
      img.src = imageUrl;
    });
  }
};