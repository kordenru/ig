import { defineConfig } from 'astro/config';

export default defineConfig({
  srcDir: './src',        // Path to source files
  publicDir: './public',  // Path to public assets (e.g., images, styles)
  outDir: './dist',       // Output directory for Netlify to deploy
});