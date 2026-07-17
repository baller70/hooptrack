import { chromium } from 'playwright'

;(async () => {
  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    const testEmail = `trainer-${Date.now()}@example.com`
    console.log('Navigating to register page...')
    await page.goto('https://hooptrack.194-146-12-139.sslip.io/register')
    
    console.log('Registering new trainer account:', testEmail)
    await page.fill('input[id="name"]', 'Test Trainer')
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', 'password123')
    await page.selectOption('select[id="role"]', 'trainer')
    
    await page.click('button:has-text("Create Account")')
    
    await page.waitForURL('**/dashboard**')
    console.log('Registration successful! Navigating to Profile...')
    
    await page.goto('https://hooptrack.194-146-12-139.sslip.io/dashboard/profile')
    
    console.log('Waiting for App Settings to load...')
    await page.waitForSelector('h3:has-text("App Settings")')
    
    console.log('Updating AI Engine to "Codex CLI"...')
    await page.selectOption('select', 'Codex CLI')
    
    console.log('Entering dummy Codex path...')
    await page.fill('input[placeholder="/usr/local/bin/codex"]', '/usr/bin/custom-codex')
    
    console.log('Saving settings...')
    await page.click('button:has-text("Save Settings")')
    
    // Wait for the save operation
    await page.waitForTimeout(2000)
    
    console.log('Reloading page to verify persistence...')
    await page.reload()
    await page.waitForSelector('h3:has-text("App Settings")')
    
    const selectedModel = await page.$eval('select', el => el.value)
    if (selectedModel !== 'Codex CLI') {
      throw new Error(`Expected selected model to be Codex CLI, but got ${selectedModel}`)
    }
    
    const apiInputValue = await page.$eval('input[placeholder="/usr/local/bin/codex"]', el => el.value)
    if (apiInputValue !== '/usr/bin/custom-codex') {
      throw new Error(`Expected input value to be "/usr/bin/custom-codex", but got "${apiInputValue}"`)
    }
    
    console.log('✅ Playwright test passed successfully! Settings persisted on the live production server.')
    
  } catch (error) {
    console.error('❌ Playwright test failed:', error)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
})()
