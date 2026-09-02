import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { port: 5200, strictPort: true },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
  },
  build: {
    rollupOptions: {
      output: {
        // One shared chunk for the WebGL stack so the eleven lazy boards do not each carry it.
        manualChunks(id) {
          if (/node_modules\/(three|@react-three|postprocessing|maath|zustand|suspend-react|its-fine)\//.test(id)) {
            return 'three';
          }
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
