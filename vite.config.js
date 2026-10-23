import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// L'API est servie par `npm run server` (port 3001).
// En développement, Vite relaie /api vers cette API : le frontend et le
// backend partagent ainsi la même origine, comme en production.
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
