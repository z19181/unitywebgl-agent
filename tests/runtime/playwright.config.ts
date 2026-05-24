import { defineConfig, devices } from '@playwright/test';

/**
 * PartyGameSDK Runtime Automation — Playwright Configuration
 * v1.1.0
 *
 * Targets:
 * - Runtime Visual (Gate 4)
 * - Runtime E2E (Gate 5)
 */

export default defineConfig({
  testDir: './',
  timeout: 120000,               // 2 min per test (Unity wasm load can be slow)
  expect: { timeout: 30000 },    // 30s for assertions
  fullyParallel: false,          // Sequential — screen + controller share state
  retries: 1,                    // 1 retry for flaky WebGL loads
  reporter: [
    ['html', { outputFolder: 'artifacts/html-report' }],
    ['json', { outputFile: 'artifacts/test-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.RUNTIME_BASE_URL || 'http://localhost:8081',
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    // Ignore expected Unity WebGL startup noise
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'artifacts/test-output',
});
