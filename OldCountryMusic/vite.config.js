import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures assets link correctly inside the Rabbit WebView
  build: {
    outDir: 'dist',
    minify: 'esbuild'
  }
});