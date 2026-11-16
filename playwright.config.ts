import { defineConfig, devices } from '@playwright/test';

// Browser smoke tests against the production build (npm run build first).
// They catch what unit tests cannot: layout overflow, broken flows, console errors.
const base = process.env.BASE_PATH ?? '/woodshed/';
const port = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // Locally, WebKit starves when every core runs a browser; CI machines are small enough already.
  ...(process.env.CI ? {} : { workers: 4 }),
  // WebKit on Windows is slow when every worker is busy; the longest test flips 16 cards.
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${port}${base}`,
    // The service worker would cache across tests and hide a fresh build.
    serviceWorkers: 'block',
    trace: 'off',
  },
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}${base}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    // The two target devices (PRD section 3): Android phone on Chrome, iPad on Safari (WebKit).
    {
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        // A fake microphone, granted without a prompt, for the mic check test.
        permissions: ['microphone'],
        launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
      },
    },
    { name: 'ipad-portrait', use: { ...devices['iPad Pro 11'] } },
    { name: 'ipad-landscape', use: { ...devices['iPad Pro 11 landscape'] } },
  ],
});
