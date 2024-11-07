import { defineConfig } from 'astro/config';

import netlify from '@astrojs/netlify';

import jopSoftwarecookieconsent from '@jop-software/astro-cookieconsent';

export default defineConfig({
  // Path to source files
  srcDir: './src',

  // Path to public assets (e.g., images, styles)
  publicDir: './public',

  // Output directory for Netlify to deploy
  outDir: './dist',

  output: 'server',
  adapter: netlify(),
  integrations: [jopSoftwarecookieconsent()]
});