import { ApiService } from './api';
import config from '../config/config';

/**
 * Service for region-related API operations
 */
export const RegionService = {
  /**
   * Get all regions for a specific camera
   * @param {string} cameraId - Camera serial number
   * @param {boolean} activeOnly - Only return active regions
   * @returns {Promise<Array>} - List of regions
   */
  getRegionsForCamera: (cameraId, activeOnly = true) => 
    ApiService.get(`/regions/camera/${cameraId}?active_only=${activeOnly}`),
  
  /**
   * Get a specific region by ID
   * @param {number} regionId - Region ID
   * @returns {Promise<Object>} - Region details
   */
  getRegion: (regionId) => ApiService.get(`/regions/${regionId}`),
  
  /**
   * Create a new region
   * @param {Object} regionData - Region data
   * @returns {Promise<Object>} - Created region
   */
  createRegion: (regionData) => ApiService.post('/regions', regionData),
  
  /**
   * Update an existing region
   * @param {number} regionId - Region ID
   * @param {Object} regionData - Updated region data
   * @returns {Promise<Object>} - Updated region
   */
  updateRegion: (regionId, regionData) => ApiService.put(`/regions/${regionId}`, regionData),
  
  /**
   * Delete a region
   * @param {number} regionId - Region ID
   * @returns {Promise<boolean>} - Success status
   */
  deleteRegion: (regionId) => ApiService.delete(`/regions/${regionId}`),

  /**
   * Convert frontend region format to backend format
   * @param {Object} frontendRegion - Region in frontend format
   * @returns {Object} - Region in backend format
   */
  toBackendFormat: (frontendRegion, cameraId, regionId) => ({
    camera_id: cameraId,
    region_id: regionId,
    size_threshold: frontendRegion.sizeThreshold,
    density_threshold: frontendRegion.densityThreshold,
    proximity_threshold: frontendRegion.proximityThreshold,
    polygon: frontendRegion.polygon || [],
    part_number: frontendRegion.partNumber || null,
    description: frontendRegion.description || null,
    active: frontendRegion.active !== false  // Default to true if not specified
  }),

  /**
   * Convert backend region format to frontend format
   * @param {Object} backendRegion - Region in backend format
   * @returns {Object} - Region in frontend format
   */
  toFrontendFormat: (backendRegion) => ({
    id: backendRegion.id,
    regionId: backendRegion.region_id,
    cameraId: backendRegion.camera_id,
    sizeThreshold: backendRegion.size_threshold,
    densityThreshold: backendRegion.density_threshold,
    proximityThreshold: backendRegion.proximity_threshold,
    polygon: backendRegion.polygon,
    partNumber: backendRegion.part_number || null,
    lastUpdated: backendRegion.updated_at,
    active: backendRegion.active
  })
};