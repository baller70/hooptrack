import { expect, test, type Page } from '@playwright/test'

function captureRuntimeFailures(page: Page) {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`)
  })
  return failures
}

test('public surfaces load without runtime failures or dead legal links', async ({ page }) => {
  const failures = captureRuntimeFailures(page)
  for (const path of ['/', '/login', '/register', '/privacy', '/terms', '/support', '/film/index.html']) {
    const response = await page.goto(path)
    expect(response?.status(), path).toBeLessThan(400)
    await expect(page.locator('body'), path).not.toBeEmpty()
  }
  for (const path of ['/suite/branding.css', '/coachai-design-system.css', '/calendar/styles.css']) {
    expect((await page.request.get(path)).status(), path).toBe(200)
  }
  expect(failures).toEqual([])
})

test('player can register, navigate core surfaces, and sign out', async ({ page }) => {
  test.setTimeout(120_000)
  const failures = captureRuntimeFailures(page)
  const email = `playwright-${Date.now()}-${test.info().project.name}@example.test`
  await page.goto('/register')
  await page.getByLabel('Full Name').fill('Playwright Player')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('safe-test-password')
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page.getByRole('heading', { name: 'HoopTrack Player' })).toBeVisible()

  for (const path of ['/player', '/player/workouts', '/player/calendar', '/player/moves', '/player/progress', '/player/capture', '/dashboard/profile', '/calendar/index.html']) {
    await page.goto(path)
    const body = await page.locator('body').innerText()
    expect(body.trim(), path).not.toBe('')
    expect(body, path).not.toContain('Application error')
  }

  await page.goto('/dashboard/profile')
  await page.getByRole('button', { name: 'Sign Out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(failures).toEqual([])
})

test('login reports invalid credentials and offline registration failure', async ({ page, context }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('missing@example.test')
  await page.getByLabel('Password').fill('incorrect-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByText('Invalid credentials')).toBeVisible()

  await page.goto('/register')
  await page.getByLabel('Full Name').fill('Offline Player')
  await page.getByLabel('Email').fill(`offline-${Date.now()}@example.test`)
  await page.getByLabel('Password').fill('safe-test-password')
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page.getByText('Something went wrong')).toBeVisible()
  await context.setOffline(false)
})
