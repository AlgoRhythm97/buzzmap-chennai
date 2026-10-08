import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Species photos are read from the repository-level pictures/ folder
    fs: { allow: ['..'] },
  },
  build: {
    // Three.js (~580 kB) ships in its own lazily loaded chunk for the 3D mosquito views
    chunkSizeWarningLimit: 650,
  },
})
