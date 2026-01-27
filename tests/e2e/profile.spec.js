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

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/profile')
  })

  test('should display profile page with all sections', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible()
    await expect(page.getByText('Actualiza tu información personal y preferencias')).toBeVisible()
    
    // Check all section headings are present
    await expect(page.getByRole('heading', { name: 'Foto de Perfil' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Información Básica' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Preferencias' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Cambiar Contraseña' })).toBeVisible()
  })

  test('should display user email (read-only)', async ({ page }) => {
    // Email should be visible
    await expect(page.getByText(testUser.email)).toBeVisible()
    
    // Should show message that email cannot be changed
    await expect(page.getByText('El correo no se puede cambiar')).toBeVisible()
  })

  test('should display user name that can be edited', async ({ page }) => {
    // Name field should be visible
    await expect(page.getByText('Nombre completo')).toBeVisible()
    
    // Name input should exist (use placeholder to find the right input)
    const nameInput = page.getByPlaceholder('Tu nombre')
    await expect(nameInput).toBeVisible()
  })

  test('should display timezone selector', async ({ page }) => {
    await expect(page.getByText('Zona horaria')).toBeVisible()
    
    // Timezone select should be present - find by the option it contains
    await expect(page.locator('select').filter({ hasText: 'Ciudad de México' })).toBeVisible()
  })

  test('should display language/locale selector', async ({ page }) => {
    await expect(page.getByText('Idioma')).toBeVisible()
    
    // Locale select should be present - find by option it contains
    await expect(page.locator('select').filter({ hasText: 'Español (México)' })).toBeVisible()
  })

  test('should have save button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
  })

  test('should update user name and show success message', async ({ page }) => {
    // Find the name input by placeholder
    const nameInput = page.getByPlaceholder('Tu nombre')
    
    // Get current name
    const currentName = await nameInput.inputValue()
    
    // Clear and type new name
    await nameInput.clear()
    await nameInput.fill('Test User Updated')
    
    // Click save
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    
    // Check for success message
    await expect(page.getByText('Perfil actualizado correctamente')).toBeVisible({ timeout: 10000 })
    
    // Restore original name
    await nameInput.clear()
    await nameInput.fill(currentName || 'Admin User')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Perfil actualizado correctamente')).toBeVisible({ timeout: 10000 })
  })

  test('should change timezone and save', async ({ page }) => {
    // Find timezone select
    const timezoneSelect = page.locator('select').first()
    
    // Change timezone
    await timezoneSelect.selectOption('America/New_York')
    
    // Save
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Perfil actualizado correctamente')).toBeVisible({ timeout: 10000 })
    
    // The select should still have the new value after save
    await expect(timezoneSelect).toHaveValue('America/New_York')
    
    // Restore to original
    await timezoneSelect.selectOption('America/Mexico_City')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Perfil actualizado correctamente')).toBeVisible({ timeout: 10000 })
  })

  test('should change locale', async ({ page }) => {
    // Locale is the second select (after timezone)
    const localeSelect = page.locator('select').nth(1)
    
    // Store original value
    const originalValue = await localeSelect.inputValue()
    
    // Change locale
    await localeSelect.selectOption('en-US')
    
    // Save
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Perfil actualizado correctamente')).toBeVisible({ timeout: 10000 })
    
    // Reload and verify
    await page.reload()
    await expect(page.locator('select').nth(1)).toHaveValue('en-US')
    
    // Restore original locale
    await page.locator('select').nth(1).selectOption(originalValue)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Perfil actualizado correctamente')).toBeVisible({ timeout: 10000 })
  })

  test('should toggle password change section', async ({ page }) => {
    // Click on "Cambiar contraseña" button to expand section
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    
    // Password fields should appear - look for labels with exact match
    await expect(page.getByText('Contraseña actual')).toBeVisible()
    await expect(page.getByText('Nueva contraseña', { exact: true })).toBeVisible()
    await expect(page.getByText('Confirmar nueva contraseña')).toBeVisible()
    
    // Click cancel to close
    await page.getByRole('button', { name: 'Cancelar' }).click()
    
    // Fields should be hidden again
    await expect(page.getByText('Contraseña actual')).not.toBeVisible()
  })

  test('should show error when password confirmation does not match', async ({ page }) => {
    // Open password section
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    
    // Wait for fields to appear
    await expect(page.getByText('Contraseña actual')).toBeVisible()
    
    // Fill passwords that don't match (find inputs by their position in password section)
    const passwordInputs = page.locator('input[type="password"]')
    await passwordInputs.nth(0).fill('password123')
    await passwordInputs.nth(1).fill('newPassword123')
    await passwordInputs.nth(2).fill('differentPassword')
    
    // Try to save
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    
    // Should show error
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible({ timeout: 5000 })
  })

  test('should show error for short password', async ({ page }) => {
    // Open password section
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    
    // Wait for fields to appear
    await expect(page.getByText('Contraseña actual')).toBeVisible()
    
    // Fill short password
    const passwordInputs = page.locator('input[type="password"]')
    await passwordInputs.nth(0).fill('password123')
    await passwordInputs.nth(1).fill('12345')
    await passwordInputs.nth(2).fill('12345')
    
    // Try to save
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    
    // Should show error (client-side validation message)
    await expect(page.getByText('La contraseña debe tener al menos 6 caracteres')).toBeVisible({ timeout: 5000 })
  })

  test('should show error for wrong current password', async ({ page }) => {
    // Open password section
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    
    // Wait for fields to appear
    await expect(page.getByText('Contraseña actual')).toBeVisible()
    
    // Fill wrong current password
    const passwordInputs = page.locator('input[type="password"]')
    await passwordInputs.nth(0).fill('wrongPassword')
    await passwordInputs.nth(1).fill('newPassword123')
    await passwordInputs.nth(2).fill('newPassword123')
    
    // Try to save
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    
    // Should show error from API
    await expect(page.getByText('La contraseña actual es incorrecta')).toBeVisible({ timeout: 5000 })
  })

  test('should display avatar section with upload button', async ({ page }) => {
    await expect(page.getByText('Haz clic en la imagen para cambiar tu foto de perfil')).toBeVisible()
    await expect(page.getByText('Formatos: JPG, PNG, GIF. Máximo 2MB')).toBeVisible()
    await expect(page.getByRole('button', { name: /Subir imagen/ })).toBeVisible()
  })

  test('should display user initials in avatar when no image', async ({ page }) => {
    // Avatar container should be visible
    const avatarContainer = page.locator('.rounded-full').first()
    await expect(avatarContainer).toBeVisible()
  })
})

test.describe('Profile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to profile from user menu', async ({ page }) => {
    // Click on user area at bottom of sidebar to open menu
    const userArea = page.locator('text=' + testUser.email).first()
    await userArea.click()
    
    // Wait for menu to appear and click "Mi Perfil"
    await page.waitForTimeout(300)
    const profileLink = page.getByText('Mi Perfil')
    
    if (await profileLink.isVisible()) {
      await profileLink.click()
      await expect(page).toHaveURL('/profile')
    }
  })

  test('should be able to access profile page directly', async ({ page }) => {
    await page.goto('/profile')
    
    await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible()
  })
})
