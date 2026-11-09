import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Express server (../server.js) serves the built files from ./dist and the /api routes.
// During `npm run dev`, API calls are proxied to that server on port 3100.
// `npm run build:static` builds the GitHub Pages demo instead: VITE_STATIC=1 makes src/api.ts read the JSON
// written by ../scripts/export-static.js, VITE_BASE sets the sub-path the site is served from.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:3100' },
  },
  build: {
    outDir: process.env.VITE_OUT ?? 'dist',
    chunkSizeWarningLimit: 1500,
  },
})
