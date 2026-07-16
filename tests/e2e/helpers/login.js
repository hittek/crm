// Shared login helper for all E2E specs
// Import once here so every spec gets consistent credentials and flow
const { testUser } = require('../test.config')

/**
 * Log in as the default test user and wait for the main nav to be visible.
 *
 * Uses 'load' (not 'networkidle') throughout because the SSE stream at
 * /api/notifications/stream keeps a persistent connection open — networkidle
 * never resolves while that connection is alive.
 *
 * @param {import("@playwright/test").Page} page
 */
async function login(page) {
  await page.goto('/login', { waitUntil: 'load' })

  await page.fill('input[name="email"], input[type="email"]', testUser.email)
  await page.fill('input[name="password"], input[type="password"]', testUser.password)
  await page.click('button[type="submit"]')

  await page.waitForURL('/contacts', { timeout: 20000 })
  await page.waitForSelector('nav', { timeout: 15000 })
}

/**
 * Reset the app locale to Spanish by updating the user profile via API.
 * The app reads locale from user?.locale (priority over localStorage), so
 * localStorage alone isn't enough when i18n tests have saved a different locale.
 *
 * Uses 'load' (not 'networkidle') — see note above.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} locale - locale code, defaults to 'es-MX'
 */
async function resetLocale(page, locale = 'es-MX') {
  await page.evaluate(async (loc) => {
    await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: loc }),
      credentials: 'include',
    })
    localStorage.setItem('crm_locale', loc)
  }, locale)
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('nav', { timeout: 15000 })
}

module.exports = { login, resetLocale }
