/**
 * Theme configuration for the machine-vision-hmi styling system
 * This file exports theme values to be used in JavaScript
 */

export const colors = {
  primary: '#646cff',
  primaryHover: '#535bf2',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#ffffff',
  surface: '#f0f0f0',
  border: '#cccccc',
  shadow: 'rgba(0, 0, 0, 0.2)',
  text: {
    primary: '#000000',
    secondary: '#888888',
  },
  gray: {
    300: '#d1d5db',
    400: '#9ca3af',
    800: '#1f2937',
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
};

export const fontSizes = {
  xs: '12px',
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '24px',
};

export const animations = {
  durations: {
    short: '300ms',
    medium: '600ms',
    long: '1000ms',
  },
  keyframes: {
    flashBorder: [
      { 
        borderColor: 'rgba(255, 0, 0, 1)',
        boxShadow: '0 0 8px rgba(255, 0, 0, 0.8)',
      },
      { 
        borderColor: 'rgba(255, 0, 0, 0.3)',
        boxShadow: '0 0 0px rgba(255, 0, 0, 0.3)',
      },
      { 
        borderColor: 'rgba(255, 0, 0, 1)',
        boxShadow: '0 0 8px rgba(255, 0, 0, 0.8)',
      },
    ],
  },
};

export const zIndices = {
  base: 1,
  overlay: 100,
  modal: 200,
  tooltip: 300,
  max: 1000,
};

export default {
  colors,
  spacing,
  borderRadius,
  fontSizes,
  animations,
  zIndices,
}; 