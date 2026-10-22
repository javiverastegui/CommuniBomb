import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: 'client',
  resolve: { alias: { '@shared': path.resolve('shared') } },
  server: {
    port: 5173,
    host: true,
    fs: { allow: ['..'] },
    proxy: { '/socket.io': { target: 'http://localhost:3000', ws: true } },
  },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
});
