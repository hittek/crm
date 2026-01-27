import { test, expect } from '@playwright/test'
const { testUser } = require('./test.config')

// Helper function to login before tests
async function login(page) {
  await page.goto('/login', { waitUntil: 'networkidle' })
  
  await page.fill('input[name="email"], input[type="email"]', testUser.email)
  await page.fill('input[name="password"], input[type="password"]', testUser.password)
  
  await page.click('button[type="submit"]')
  
  await page.waitForURL('/', { timeout: 10000 })
  await page.waitForSelector('nav', { timeout: 10000 })
}

// Helper to ensure Spanish locale is set
async function ensureSpanishLocale(page) {
  await page.goto('/profile')
  await page.waitForSelector('select')
  const localeSelect = page.locator('select').nth(1)
  await localeSelect.selectOption('es-MX')
  await page.getByRole('button', { name: /Guardar|Save/ }).click()
  await expect(page.getByText(/Perfil actualizado|Profile updated/)).toBeVisible({ timeout: 10000 })
}

test.describe('Language Switching (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Ensure Spanish is set at the start of each test to avoid state leakage
    await ensureSpanishLocale(page)
    await page.goto('/')
  })

  test('should display navigation in Spanish by default', async ({ page }) => {
    // Check sidebar navigation items are in Spanish
    await expect(page.getByRole('link', { name: 'Contactos' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pipeline' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tareas' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Reportes' })).toBeVisible()
  })

  test('should have language selector on profile page', async ({ page }) => {
    await page.goto('/profile')
    
    // Check language selector exists (it's the second select)
    const localeSelect = page.locator('select').nth(1)
    await expect(localeSelect).toBeVisible()
    
    // Verify it has the expected options by checking the select value can be set
    await expect(localeSelect).toHaveValue(/es-|en-/)
  })

  test('should switch to English and update UI', async ({ page }) => {
    await page.goto('/profile')
    
    // Change to English
    const localeSelect = page.locator('select').nth(1)
    await localeSelect.selectOption('en-US')
    
    // Save changes
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    
    // Wait for success message (in English after switch)
    await expect(page.getByText(/Profile updated|Perfil actualizado/)).toBeVisible({ timeout: 10000 })
    
    // After save, UI should be in English - check for English headings
    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible()
  })

  test('should show navigation in English after language switch', async ({ page }) => {
    await page.goto('/profile')
    
    // Change to English
    const localeSelect = page.locator('select').nth(1)
    await localeSelect.selectOption('en-US')
    
    // Save changes
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Profile updated|Perfil actualizado/)).toBeVisible({ timeout: 10000 })
    
    // Check sidebar navigation is now in English
    await expect(page.getByRole('link', { name: 'Contacts' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('should switch back to Spanish', async ({ page }) => {
    // First set to English, then back to Spanish
    await page.goto('/profile')
    
    const localeSelect = page.locator('select').nth(1)
    
    // Ensure we're in English first
    await localeSelect.selectOption('en-US')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Profile updated|Perfil actualizado/)).toBeVisible({ timeout: 10000 })
    
    // Now switch back to Spanish
    await page.reload()
    await page.waitForSelector('select')
    const localeSelectAfterReload = page.locator('select').nth(1)
    await localeSelectAfterReload.selectOption('es-MX')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Perfil actualizado|Profile updated/)).toBeVisible({ timeout: 10000 })
    
    // Check UI is back in Spanish
    await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Información Básica' })).toBeVisible()
  })

  test('should persist language preference after page reload', async ({ page }) => {
    // First ensure we're in Spanish
    await page.goto('/profile')
    const localeSelect = page.locator('select').nth(1)
    await localeSelect.selectOption('es-MX')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Perfil actualizado|Profile updated/)).toBeVisible({ timeout: 10000 })
    
    // Now change to English
    await page.reload()
    await page.waitForSelector('select')
    await page.locator('select').nth(1).selectOption('en-US')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Profile updated|Perfil actualizado/)).toBeVisible({ timeout: 10000 })
    
    // Reload page and verify English persists
    await page.reload()
    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible({ timeout: 10000 })
    
    // Navigation should still be in English
    await expect(page.getByRole('link', { name: 'Contacts' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible()
    
    // Restore to Spanish for other tests
    const localeSelectAfterReload = page.locator('select').nth(1)
    await localeSelectAfterReload.selectOption('es-MX')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Perfil actualizado|Profile updated/)).toBeVisible({ timeout: 10000 })
  })

  test('should show user menu items in selected language', async ({ page }) => {
    // Start fresh on home page
    await page.goto('/')
    
    // Now change to English via profile
    await page.goto('/profile')
    await page.waitForSelector('select')
    await page.locator('select').nth(1).selectOption('en-US')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Profile updated|Perfil actualizado/)).toBeVisible({ timeout: 10000 })
    
    // Go to home and open user menu
    await page.goto('/')
    await page.waitForTimeout(500)
    
    // Click on user area to open menu (the last button in sidebar)
    await page.locator('aside button').last().click()
    await page.waitForTimeout(300)
    
    // User menu should have English text
    await expect(page.getByText('Connected as')).toBeVisible()
    await expect(page.getByText('Log Out')).toBeVisible()
    
    // Close menu by clicking on the overlay (the fixed inset-0 div)
    await page.locator('.fixed.inset-0').click()
    await page.waitForTimeout(300)
  })
})

test.describe('Language-specific content', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Ensure Spanish is set at the start of each test
    await page.goto('/profile')
    const localeSelect = page.locator('select').nth(1)
    await localeSelect.selectOption('es-MX')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Perfil actualizado|Profile updated/)).toBeVisible({ timeout: 10000 })
    await page.goto('/')
  })

  test('should show Add button in current language', async ({ page }) => {
    // Should be in Spanish now
    await expect(page.getByRole('button', { name: /Agregar/ })).toBeVisible()
    
    // Switch to English
    await page.goto('/profile')
    const localeSelect = page.locator('select').nth(1)
    await localeSelect.selectOption('en-US')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Profile updated|Perfil actualizado/)).toBeVisible({ timeout: 10000 })
    
    // Go back to home
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Add/ })).toBeVisible()
    
    // Restore Spanish
    await page.goto('/profile')
    await page.locator('select').nth(1).selectOption('es-MX')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Perfil actualizado|Profile updated/)).toBeVisible({ timeout: 10000 })
  })

  test('should show Search placeholder in current language', async ({ page }) => {
    // Should be in Spanish - search button should have "Buscar..."
    await expect(page.getByText('Buscar...')).toBeVisible()
    
    // Switch to English
    await page.goto('/profile')
    const localeSelect = page.locator('select').nth(1)
    await localeSelect.selectOption('en-US')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Profile updated|Perfil actualizado/)).toBeVisible({ timeout: 10000 })
    
    // Go back to home
    await page.goto('/')
    await expect(page.getByText('Search...')).toBeVisible()
    
    // Restore Spanish
    await page.goto('/profile')
    await page.locator('select').nth(1).selectOption('es-MX')
    await page.getByRole('button', { name: /Guardar|Save/ }).click()
    await expect(page.getByText(/Perfil actualizado|Profile updated/)).toBeVisible({ timeout: 10000 })
  })
})
