import { defineConfig, devices } from '@playwright/test';

// Browser smoke tests against the production build (npm run build first).
// They catch what unit tests cannot: layout overflow, broken flows, console errors.
const base = process.env.BASE_PATH ?? '/woodshed/';
const port = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
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
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'ipad-portrait', use: { ...devices['iPad Pro 11'] } },
    { name: 'ipad-landscape', use: { ...devices['iPad Pro 11 landscape'] } },
  ],
});
