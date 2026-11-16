/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the site at https://<user>.github.io/woodshed/.
// Override with BASE_PATH=/ for a root-hosted deploy.
const base = process.env.BASE_PATH ?? '/woodshed/';

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from src/main.tsx
      pwaAssets: { config: true }, // icons from pwa-assets.config.ts
      manifest: {
        id: base,
        name: 'Woodshed',
        short_name: 'Woodshed',
        description: 'Practice scales, key signatures, intervals and chords.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f6f1ea',
        theme_color: '#6b4226',
        categories: ['music', 'education'],
      },
      workbox: {
        // Precache everything the build emits so the app runs fully offline (PRD section 8).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2,wav,mp3,json}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
  },
});
