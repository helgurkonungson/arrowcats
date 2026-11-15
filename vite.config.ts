import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000, rollupOptions: { input: { main: 'index.html', lab: 'lab.html' } } },
});
