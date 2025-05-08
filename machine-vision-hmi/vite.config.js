import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow requests from this specific hostname
    allowedHosts: ['james-office-2.tailbf173.ts.net'],
    // You might also want to expose it on the network if needed
    // host: true,
    
    // Proxy API requests (/api/...) to the backend server
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // Your backend server address
        changeOrigin: true, // Recommended for virtual hosted sites
        secure: false,      // Set to false if backend is HTTP, true for HTTPS
        // rewrite: (path) => path.replace(/^\/api/, '') // Optional: remove /api prefix if backend doesn't expect it
      },
      // IMPORTANT: Do NOT proxy requests for static assets like /images/
      // Vite automatically serves files from the 'public' directory at the root.
      // Remove any proxy rule for '/images' if it exists.
    },
  },
})
