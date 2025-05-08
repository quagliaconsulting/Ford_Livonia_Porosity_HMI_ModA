import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow requests from this specific hostname
    allowedHosts: ['james-office-2.tailbf173.ts.net'],
    // You might also want to expose it on the network if needed
    // host: true, 
  },
})
