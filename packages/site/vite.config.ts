import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5300, strictPort: true, host: '127.0.0.1' },
  // Preview is exposed through a Cloudflare quick tunnel; allow its hostname.
  preview: { port: 5310, strictPort: true, host: '127.0.0.1', allowedHosts: true },
});
