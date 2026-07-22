import { defineConfig, devices } from '@playwright/test'

const systemBrowser = process.env.KCLOUD_SYSTEM_BROWSER
const browserLaunchOptions = systemBrowser
  ? { executablePath: systemBrowser, args: process.getuid?.() === 0 ? ['--no-sandbox'] : [] }
  : undefined

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['line']] : 'line',
  use: {
    baseURL: process.env.APP_REVIEW_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: browserLaunchOptions,
  },
  webServer: {
    command: 'npm run dev',
    env: {
      ...process.env,
      JWT_SECRET: process.env.JWT_SECRET || 'playwright-local-secret-at-least-32-characters',
    },
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], launchOptions: browserLaunchOptions } },
    {
      name: 'mobile-chromium',
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        launchOptions: browserLaunchOptions,
      },
    },
  ],
})
