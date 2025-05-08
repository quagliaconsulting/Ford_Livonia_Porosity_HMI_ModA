import { ApiService } from './api';
import config from '../config/config';

/**
 * Service for camera-related API operations
 */
export const CameraService = {
  /**
   * Get all cameras
   * @returns {Promise<Array>} - List of cameras
   */
  getAllCameras: () => ApiService.get('/cameras'),
  
  /**
   * Get a specific camera by serial number
   * @param {string} serialNumber - Camera serial number
   * @returns {Promise<Object>} - Camera details
   */
  getCamera: (serialNumber) => ApiService.get(`/cameras/${serialNumber}`),
  
  /**
   * Get the latest status for a specific camera
   * @param {string} serialNumber - Camera serial number
   * @returns {Promise<Object>} - Camera status with latest image and defect info
   */
  getCameraLatest: (serialNumber) => ApiService.get(`/cameras/${serialNumber}/latest`),
  
  /**
   * Start polling for camera updates
   * @param {string} serialNumber - Camera serial number
   * @param {Function} callback - Callback function to handle updates
   * @param {number} interval - Polling interval in milliseconds
   * @returns {number} - Interval ID for stopping the polling
   */
  startPolling: (serialNumber, callback, interval = config.api.pollingInterval) => {
    // Initial fetch
    CameraService.getCameraLatest(serialNumber)
      .then(callback)
      .catch(error => console.error(`Error polling camera ${serialNumber}:`, error));
    
    // Set up polling
    const intervalId = setInterval(() => {
      CameraService.getCameraLatest(serialNumber)
        .then(callback)
        .catch(error => console.error(`Error polling camera ${serialNumber}:`, error));
    }, interval);
    
    return intervalId;
  },
  
  /**
   * Stop polling for camera updates
   * @param {number} intervalId - Interval ID returned from startPolling
   */
  stopPolling: (intervalId) => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
};