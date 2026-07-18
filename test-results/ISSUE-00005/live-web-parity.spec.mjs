import { expect, test } from '@playwright/test'

const baseURL = new URL(process.env.HOOPTRACK_LIVE_BASE_URL ?? 'https://hooptrack.194-146-12-139.sslip.io').origin
const trainerEmail = process.env.HOOPTRACK_TRAINER_EMAIL
const trainerPassword = process.env.HOOPTRACK_TRAINER_PASSWORD
const playerEmail = process.env.HOOPTRACK_PLAYER_EMAIL
const playerPassword = process.env.HOOPTRACK_PLAYER_PASSWORD

function requireCredential(name, value) {
  expect(value, `Missing ${name}; live parity must use seeded shared-backend credentials`).toBeTruthy()
  return value
}

async function login(page, email, password) {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await Promise.all([
    page.waitForURL(url => url.origin === baseURL && url.pathname !== '/login'),
    page.getByRole('button', { name: /sign in/i }).click(),
  ])
}

test.describe('HoopTrack Coach live web parity', () => {
  test('redirects unauthenticated coach users to login', async ({ page }) => {
    await page.goto(`${baseURL}/coach`)
    await expect(page).toHaveURL(new RegExp(`${baseURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/login`))
  })

  test('allows authenticated trainer into HoopTrack Coach shell', async ({ page }) => {
    const email = requireCredential('HOOPTRACK_TRAINER_EMAIL', trainerEmail)
    const password = requireCredential('HOOPTRACK_TRAINER_PASSWORD', trainerPassword)

    await login(page, email, password)
    await page.goto(`${baseURL}/coach`)

    await expect(page.getByRole('heading', { name: 'HoopTrack Coach' })).toBeVisible()
    await expect(page.getByText('Shared Backend')).toBeVisible()
  })

  test('blocks player-role auth from coach shell', async ({ page }) => {
    const email = requireCredential('HOOPTRACK_PLAYER_EMAIL', playerEmail)
    const password = requireCredential('HOOPTRACK_PLAYER_PASSWORD', playerPassword)

    await login(page, email, password)
    await page.goto(`${baseURL}/coach`)

    await expect(page).toHaveURL(new RegExp(`${baseURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/player`))
    await expect(page.getByRole('heading', { name: 'HoopTrack Coach' })).toHaveCount(0)
  })
})
