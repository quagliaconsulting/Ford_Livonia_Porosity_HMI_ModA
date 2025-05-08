/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#646cff',
          hover: '#535bf2',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        surface: '#f0f0f0',
        gray: {
          300: '#d1d5db',
          400: '#9ca3af',
          800: '#1f2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      animation: {
        'flash-border': 'flashBorder 1.5s infinite',
      },
      keyframes: {
        flashBorder: {
          '0%': { 
            borderColor: 'rgba(255, 0, 0, 1)',
            boxShadow: '0 0 8px rgba(255, 0, 0, 0.8)',
          },
          '50%': { 
            borderColor: 'rgba(255, 0, 0, 0.3)',
            boxShadow: '0 0 0px rgba(255, 0, 0, 0.3)',
          },
          '100%': { 
            borderColor: 'rgba(255, 0, 0, 1)',
            boxShadow: '0 0 8px rgba(255, 0, 0, 0.8)',
          },
        },
      },
    },
  },
  plugins: [],
} 