import config from '../config/config';

/**
 * Base API service for making HTTP requests to the backend
 */
const API_BASE_URL = config.api.baseUrl;

// Custom error class for API errors
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Fetch with error handling
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - The response JSON
 * @throws {ApiError} - If the response is not ok
 */
async function fetchWithError(url, options = {}) {
  if (config.debug.logApiCalls) {
    console.log(`API ${options.method || 'GET'} request to ${url}`);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || `API Error: ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network errors or other fetch errors
    throw new ApiError(
      `Network error: ${error.message}`,
      0,
      { originalError: error.message }
    );
  }
}

/**
 * Core API service with CRUD operations
 */
export const ApiService = {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>} - Response data
   */
  get: (endpoint) => fetchWithError(`${API_BASE_URL}${endpoint}`),
  
  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request payload
   * @returns {Promise<any>} - Response data
   */
  post: (endpoint, data) => fetchWithError(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }),
  
  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request payload
   * @returns {Promise<any>} - Response data
   */
  put: (endpoint, data) => fetchWithError(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }),
  
  /**
   * Make a PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request payload
   * @returns {Promise<any>} - Response data
   */
  patch: (endpoint, data) => fetchWithError(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }),
  
  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>} - Response data
   */
  delete: (endpoint) => fetchWithError(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
  }),
  
  /**
   * Get the URL for an image
   * @param {number} imageId - Image ID
   * @returns {string} - Image URL
   */
  getImageUrl: (imageId) => `${API_BASE_URL}/images/${imageId}/file`,
};