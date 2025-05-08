/**
 * Frontend configuration for Ford Livonia Porosity HMI
 * This mirrors the backend configuration for consistency
 */

const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    pollingInterval: 30000, // 30 seconds between status updates
  },

  // UI Configuration
  ui: {
    client: 'Ford',
    site: 'Livonia Transmission',
    line: 'Mod A',
    maxZoom: 6.0,
    appTitle: 'Ford Livonia Porosity HMI',
    clientLogo: '/images/Ford.png',
    serviceLogo: '/images/USS.png',
    logoSize: 65,
  },

  // Image Access Fallback
  // This is used if the API cannot serve images
  imageAccess: {
    fallbackPath: '/images',
  },

  // Region Analysis Defaults
  regionAnalysis: {
    defaultPixelDensity: 95.0 / 7.9375, // Matches backend
    defaultSizeThreshold: 1.0, // mm
    defaultDensityThreshold: 3, // count  
    defaultProximityThreshold: 5.0, // mm
  },

  // Debug Settings
  debug: {
    enabled: import.meta.env.DEV || false,
    logApiCalls: import.meta.env.DEV || false,
  }
};

export default config;