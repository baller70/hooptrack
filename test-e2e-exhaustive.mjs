import { chromium } from 'playwright'

const BASE_URL = 'https://hooptrack.194-146-12-139.sslip.io'

async function run() {
  console.log('Launching browser for exhaustive E2E test...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  let errors = []
  page.on('pageerror', err => {
    console.error(`❌ PAGE ERROR CAUGHT: ${err.message}`)
    errors.push(err.message)
  })

  page.on('console', msg => {
    console.log(`PAGE LOG: [${msg.type()}] ${msg.text()}`)
  })

  try {
    // 1. Register Trainer
    const trainerEmail = `trainer-e2e-${Date.now()}@example.com`
    console.log(`\n--- TRAINER E2E TEST ---`)
    console.log(`Registering Trainer: ${trainerEmail}`)

    await page.goto(`${BASE_URL}/register`)
    await page.fill('input[name="name"]', 'E2E Trainer')
    await page.fill('input[name="email"]', trainerEmail)
    await page.fill('input[name="password"]', 'password123')
    await page.selectOption('select[name="role"]', 'trainer')

    // Take a screenshot before submitting to make sure everything looks correct
    await page.screenshot({ path: 'before-submit-trainer.png' })

    await page.click('button[type="submit"]')

    await page.waitForURL('**/dashboard/workouts', { timeout: 15000 })
    console.log('✅ Trainer Registration Successful')

    // List of Trainer tabs
    const trainerTabs = [
      '/dashboard/workouts',
      '/dashboard/calendar',
      '/dashboard/progress',
      '/dashboard/record',
      '/dashboard/moves',
      '/dashboard/classroom',
      '/dashboard/players',
      '/dashboard/activity',
      '/dashboard/chat',
      '/dashboard/comparison',
      '/dashboard/profile'
    ]

    for (const tab of trainerTabs) {
      console.log(`Navigating to Trainer Tab: ${tab}`)
      await page.goto(`${BASE_URL}${tab}`)
      await page.waitForLoadState('networkidle')

      // Check if the page is completely blank (no content inside body)
      const content = await page.innerHTML('body')
      if (content.trim() === '' || content.includes('Application error: a client-side exception has occurred')) {
         console.error(`❌ BLANK SCREEN DETECTED ON ${tab}`)
         errors.push(`Blank screen on ${tab}`)
      }
    }

    // Log out Trainer
    console.log('\nLogging out Trainer...')
    await page.goto(`${BASE_URL}/dashboard/profile`)
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("Sign Out")')
    await page.waitForURL('**/login')

    // 2. Register Player
    const playerEmail = `player-e2e-${Date.now()}@example.com`
    console.log(`\n--- PLAYER E2E TEST ---`)
    console.log(`Registering Player: ${playerEmail}`)

    await page.goto(`${BASE_URL}/register`)
    await page.fill('input[name="name"]', 'E2E Player')
    await page.fill('input[name="email"]', playerEmail)
    await page.fill('input[name="password"]', 'password123')
    await page.selectOption('select[name="role"]', 'player')
    await page.click('button[type="submit"]')

    await page.waitForURL('**/dashboard/workouts', { timeout: 15000 })
    console.log('✅ Player Registration Successful')

    const playerTabs = [
      '/dashboard/workouts',
      '/dashboard/calendar',
      '/dashboard/progress',
      '/dashboard/record',
      '/dashboard/moves',
      '/dashboard/classroom',
      '/dashboard/chat',
      '/dashboard/profile'
    ]

    for (const tab of playerTabs) {
      console.log(`Navigating to Player Tab: ${tab}`)
      await page.goto(`${BASE_URL}${tab}`)
      await page.waitForLoadState('networkidle')

      // Check if the page is completely blank
      const content = await page.innerHTML('body')
      if (content.trim() === '' || content.includes('Application error: a client-side exception has occurred')) {
         console.error(`❌ BLANK SCREEN DETECTED ON ${tab}`)
         errors.push(`Blank screen on ${tab} (Player Mode)`)
      }
    }

  } catch (err) {
    console.error('❌ E2E TEST CRASHED:', err)
    await page.screenshot({ path: 'failure-screenshot.png' })
    console.log('Saved failure-screenshot.png')
    throw err
  } finally {
    await browser.close()
  }

  if (errors.length > 0) {
    console.error('\n❌ Exhaustive Test FAILED. Errors detected:')
    console.error(errors.join('\n'))
    process.exit(1)
  } else {
    console.log('\n✅ Exhaustive Test PASSED! All tabs rendered without client-side crashes.')
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
