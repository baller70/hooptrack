import { chromium } from 'playwright'

;(async () => {
  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    console.log('Navigating to login page...')
    await page.goto('https://hooptrack.194-146-12-139.sslip.io/login')
    
    console.log('Logging in...')
    await page.fill('input[type="email"]', 'khouston721@gmail.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Sign in")')
    
    await page.waitForURL('**/dashboard**')
    console.log('Login successful! Navigating to Profile...')
    
    await page.goto('https://hooptrack.194-146-12-139.sslip.io/dashboard/profile')
    
    console.log('Waiting for App Settings to load...')
    await page.waitForSelector('h3:has-text("App Settings")')
    
    console.log('Updating AI Engine to "MiniMax"...')
    await page.selectOption('select', 'MiniMax')
    
    console.log('Entering dummy API Key...')
    await page.fill('input[placeholder="Paste MiniMax key here"]', 'test-minimax-key-123')
    
    console.log('Saving settings...')
    await page.click('button:has-text("Save Settings")')
    
    // Wait for the save operation
    await page.waitForTimeout(2000)
    
    console.log('Reloading page to verify persistence...')
    await page.reload()
    await page.waitForSelector('h3:has-text("App Settings")')
    
    const selectedModel = await page.$eval('select', el => el.value)
    if (selectedModel !== 'MiniMax') {
      throw new Error(`Expected selected model to be MiniMax, but got ${selectedModel}`)
    }
    
    const apiInputValue = await page.$eval('input[placeholder="Paste MiniMax key here"]', el => el.value)
    if (apiInputValue !== 'test-minimax-key-123') {
      throw new Error(`Expected input value to be "test-minimax-key-123", but got "${apiInputValue}"`)
    }
    
    console.log('✅ Playwright test passed successfully! Settings persisted on the live production server.')
    
  } catch (error) {
    console.error('❌ Playwright test failed:', error)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
})()
