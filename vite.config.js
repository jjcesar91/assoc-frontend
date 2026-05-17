import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for Docker
    allowedHosts: ['dev.etspoint.it'],
    proxy: {
      '/auth': {
        target: process.env.VITE_API_TARGET || 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: process.env.VITE_API_TARGET || 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
      '/documents': {
        target: process.env.VITE_API_TARGET || 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
      '/products': {
        target: process.env.VITE_API_TARGET || 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
      '/payments': {
        target: process.env.VITE_API_TARGET || 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
      '/activities': {
        target: process.env.VITE_API_TARGET || 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
