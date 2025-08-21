import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

//manually build the path (workaround with node.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests/e2e/', // Specifies the directory where your test files are located
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Forbid `.only` in CI
  retries: process.env.CI ? 2 : 0, // Number of retries on CI
  workers: process.env.CI ? 1 : undefined, // Number of workers on CI
  reporter: 'html', // Use the 'html' reporter
  use: {
    //baseURL: process.env.BASE_URL, // Use the BASE_URL from the .env file
    baseURL: process.env.NUXT_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});