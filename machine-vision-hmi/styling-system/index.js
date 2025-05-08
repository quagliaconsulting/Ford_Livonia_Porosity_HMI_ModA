/**
 * Machine Vision HMI Styling System
 * Main entry point for the styling system
 */

// Export theme configuration
export { default as theme } from './config/theme';

// Export sample components
export { default as Camera } from './components/Camera';

// Import CSS files in a way that works with bundlers
import './css/index.css';

/**
 * Apply the styling system to a React application
 * @param {Object} options Configuration options
 * @param {boolean} options.includeBase Whether to include base styles (default: true)
 * @param {boolean} options.includeComponents Whether to include component styles (default: true)
 */
export const applyStyles = (options = {}) => {
  const { includeBase = true, includeComponents = true } = options;
  
  // Base styles are always required and imported via index.css
  
  // This function mostly serves as documentation - the CSS is imported above
  // and will be bundled with the application by tools like webpack or vite
  
  console.log('Machine Vision HMI styling system applied');
  return {
    baseStyles: includeBase,
    componentStyles: includeComponents
  };
};

// Export styling functions
export default {
  theme,
  applyStyles
}; 