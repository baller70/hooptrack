import { chromium } from 'playwright'

const BASE_URL = 'https://hooptrack.194-146-12-139.sslip.io'

async function run() {
  console.log('Launching browser for exhaustive click test...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  let errors = []
  page.on('pageerror', err => {
    console.error(`❌ PAGE ERROR CAUGHT: ${err.message}`)
    errors.push(err.message)
  })

  const trainerEmail = `trainer-e2e-${Date.now()}@example.com`
  console.log(`Registering Trainer: ${trainerEmail}`)
  
  await page.goto(`${BASE_URL}/register`)
  await page.fill('input[name="name"]', 'E2E Trainer')
  await page.fill('input[name="email"]', trainerEmail)
  await page.fill('input[name="password"]', 'password123')
  await page.selectOption('select[name="role"]', 'trainer')
  await page.click('button[type="submit"]')
  
  await page.waitForURL('**/dashboard/workouts')
  console.log('✅ Trainer Registration Successful')

  // Find all links in the NavTabs
  console.log('Clicking all NavTabs at the bottom...')
  const navLinks = await page.$$('nav.fixed.bottom-0 a')
  for (let i = 0; i < navLinks.length; i++) {
    const text = await navLinks[i].innerText()
    console.log(`Clicking NavTab: ${text}`)
    await navLinks[i].click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const content = await page.innerHTML('body')
    if (content.trim() === '' || content.includes('Application error')) {
      console.error(`❌ BLANK SCREEN AFTER CLICKING ${text}`)
      errors.push(`Blank screen clicking ${text}`)
    }
  }

  // Find all links in the LibraryTabs
  console.log('Clicking all LibraryTabs...')
  await page.goto(`${BASE_URL}/dashboard/workouts`)
  await page.waitForLoadState('networkidle')
  const libLinks = await page.$$('.grid.grid-cols-4 a')
  for (let i = 0; i < libLinks.length; i++) {
    const text = await libLinks[i].innerText()
    console.log(`Clicking LibraryTab: ${text}`)
    await libLinks[i].click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const content = await page.innerHTML('body')
    if (content.trim() === '' || content.includes('Application error')) {
      console.error(`❌ BLANK SCREEN AFTER CLICKING ${text}`)
      errors.push(`Blank screen clicking ${text}`)
    }
  }

  // Check the notification bell
  console.log('Clicking notification bell...')
  await page.click('button[aria-label="Notifications"]')
  await page.waitForTimeout(500)
  
  // Check the View As toggle
  console.log('Clicking View As Toggle...')
  await page.click('button[title="Switch to player view"]')
  await page.waitForTimeout(500)

  await browser.close()
  console.log('Errors:', errors)
}

run().catch(console.error)
