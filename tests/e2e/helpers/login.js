// Shared login helper for all E2E specs
// Import once here so every spec gets consistent credentials and flow
const { testUser } = require('../test.config')

/**
 * Log in as the default test user and wait for the main nav to be visible.
 * @param {import("@playwright/test").Page} page
 */
async function login(page) {
  await page.goto('/login', { waitUntil: 'networkidle' })

  // Fill in login form using test configuration
  await page.fill('input[name="email"], input[type="email"]', testUser.email)
  await page.fill('input[name="password"], input[type="password"]', testUser.password)

  // Click login button
  await page.click('button[type="submit"]')

  // Wait for navigation to complete
  await page.waitForURL('/', { timeout: 10000 })
  await page.waitForSelector('nav', { timeout: 10000 })
}

module.exports = { login }
