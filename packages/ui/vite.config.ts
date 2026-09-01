import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  server: { port: 5199, strictPort: true },
  preview: { port: 5199, strictPort: true },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
  },
});
