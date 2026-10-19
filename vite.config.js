import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for Docker
    allowedHosts: ['dev.etspoint.it', 'app.nonprofitgest.it', 'app.gestionalenonprofit.it'],
    proxy: {
      '/auth': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
        xfwd: true, // inoltra l'IP del visitatore (X-Forwarded-For) ai servizi
      },
      '/users': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
        xfwd: true, // inoltra l'IP del visitatore (X-Forwarded-For) ai servizi
      },
      '/documents': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
        xfwd: true, // inoltra l'IP del visitatore (X-Forwarded-For) ai servizi
      },
      '/products': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
        xfwd: true, // inoltra l'IP del visitatore (X-Forwarded-For) ai servizi
      },
      '/payments': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
        xfwd: true, // inoltra l'IP del visitatore (X-Forwarded-For) ai servizi
      },
      '/activities': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
        xfwd: true, // inoltra l'IP del visitatore (X-Forwarded-For) ai servizi
      },
    },
  },
})
