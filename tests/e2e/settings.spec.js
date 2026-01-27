import { test, expect } from '@playwright/test'
const { testUser } = require('./test.config')

// Helper function to login before tests
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

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings')
  })

  test('should display settings page with tabs', async ({ page }) => {
    // Check all tabs are present
    await expect(page.getByRole('button', { name: 'General' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pipeline' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Contactos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Notificaciones' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Integraciones' })).toBeVisible()
  })

  test('should display general settings by default', async ({ page }) => {
    // General tab content should be visible
    await expect(page.getByRole('heading', { name: 'Configuración general' })).toBeVisible()
    await expect(page.getByText('Nombre de la organización')).toBeVisible()
    await expect(page.getByText('Moneda predeterminada')).toBeVisible()
    await expect(page.getByText('Zona horaria')).toBeVisible()
  })

  test('should allow editing organization name', async ({ page }) => {
    const nameInput = page.locator('input[placeholder="Mi Empresa"]')
    await nameInput.clear()
    await nameInput.fill('Mi Empresa Test')
    
    // Click save
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    
    // Check for success message
    await expect(page.getByText('Cambios guardados')).toBeVisible({ timeout: 10000 })
    
    // Reload and verify persistence
    await page.reload()
    await expect(nameInput).toHaveValue('Mi Empresa Test')
  })

  test('should switch to Pipeline tab and display deal stages', async ({ page }) => {
    await page.getByRole('button', { name: 'Pipeline' }).click()
    
    await expect(page.getByRole('heading', { name: 'Configuración del pipeline' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Etapas del pipeline' })).toBeVisible()
    
    // Check default stages are visible (they're in input fields)
    await expect(page.locator('input[value="Lead"]')).toBeVisible()
    await expect(page.locator('input[value="Ganado"]')).toBeVisible()
    await expect(page.locator('input[value="Perdido"]')).toBeVisible()
  })

  test('should add new deal stage', async ({ page }) => {
    await page.getByRole('button', { name: 'Pipeline' }).click()
    
    // Click add stage button
    await page.getByText('Agregar etapa').click()
    
    // New stage should appear with default name (use first() in case there are multiple)
    await expect(page.locator('input[value="Nueva etapa"]').first()).toBeVisible()
    
    // Save
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Cambios guardados')).toBeVisible({ timeout: 10000 })
  })

  test('should switch to Contactos tab and display statuses', async ({ page }) => {
    await page.getByRole('button', { name: 'Contactos' }).click()
    
    await expect(page.getByRole('heading', { name: 'Estados de contactos' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Estados disponibles' })).toBeVisible()
    
    // Check default statuses are visible (they're in input fields)
    await expect(page.locator('input[value="Lead"]')).toBeVisible()
    await expect(page.locator('input[value="Prospecto"]')).toBeVisible()
    await expect(page.locator('input[value="Activo"]')).toBeVisible()
  })

  test('should switch to Notificaciones tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Notificaciones' }).click()
    
    await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
    await expect(page.getByText('Recordatorios de tareas')).toBeVisible()
    await expect(page.getByText('Nuevos contactos')).toBeVisible()
    await expect(page.getByText('Negocios ganados')).toBeVisible()
  })

  test('should toggle notification settings', async ({ page }) => {
    await page.getByRole('button', { name: 'Notificaciones' }).click()
    
    // Find the toggle for "Nuevos contactos"
    const toggle = page.locator('input[type="checkbox"]').nth(1)
    
    // Click the toggle (use force since the actual input is hidden)
    await toggle.click({ force: true })
    
    // Save
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Cambios guardados')).toBeVisible({ timeout: 10000 })
  })

  test('should switch to Integraciones tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Integraciones' }).click()
    
    await expect(page.getByRole('heading', { name: 'Integraciones' })).toBeVisible()
    await expect(page.getByText('Google Calendar', { exact: true })).toBeVisible()
    await expect(page.getByText('Slack', { exact: true })).toBeVisible()
    await expect(page.getByText('Zapier', { exact: true })).toBeVisible()
    await expect(page.getByText('WhatsApp Business')).toBeVisible()
  })

  test('should select currency from dropdown', async ({ page }) => {
    // Find the currency select
    const currencySelect = page.locator('select').first()
    await currencySelect.selectOption('EUR')
    
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Cambios guardados')).toBeVisible({ timeout: 10000 })
    
    await page.reload()
    await expect(currencySelect).toHaveValue('EUR')
  })

  test('should change primary color', async ({ page }) => {
    const colorInput = page.locator('input[type="color"]')
    await colorInput.fill('#ff5500')
    
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Cambios guardados')).toBeVisible({ timeout: 10000 })
    
    await page.reload()
    await expect(colorInput).toHaveValue('#ff5500')
  })
})
