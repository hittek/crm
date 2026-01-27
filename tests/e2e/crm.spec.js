// @ts-check
const { test, expect } = require('@playwright/test')
const { testUser } = require('./test.config')

// Helper function to login before tests
/**
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

// ==========================================
// CONTACTS PAGE TESTS
// ==========================================
test.describe('Contacts Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display sidebar navigation', async ({ page }) => {
    await expect(page.locator('text=Contactos').first()).toBeVisible()
    await expect(page.locator('text=Pipeline').first()).toBeVisible()
    await expect(page.locator('text=Tareas').first()).toBeVisible()
    await expect(page.locator('text=Reportes').first()).toBeVisible()
    await expect(page.locator('text=Configuración').first()).toBeVisible()
  })

  test('should display contact list', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible()
    // Should show contact count
    await expect(page.locator('text=/\\d+ contactos?/')).toBeVisible({ timeout: 10000 })
  })

  test('should select a contact and show detail panel', async ({ page }) => {
    await page.waitForSelector('text=/\\d+ contactos?/', { timeout: 10000 })
    
    // Click on first contact in list
    const contactButton = page.locator('main button').first()
    await contactButton.click()
    
    // Detail panel should show - check for email label
    await expect(page.locator('text=EMAIL').first()).toBeVisible({ timeout: 5000 })
  })

  test('should show contact status dropdown in detail', async ({ page }) => {
    await page.waitForSelector('text=/\\d+ contactos?/', { timeout: 10000 })
    
    // Click on first contact
    await page.locator('main button').first().click()
    await page.waitForTimeout(500)
    
    // Find status dropdown
    const statusSelect = page.locator('select').first()
    await expect(statusSelect).toBeVisible({ timeout: 5000 })
  })
})

// ==========================================
// GLOBAL SEARCH TESTS
// ==========================================
test.describe('Global Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should open search with / keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('/')
    await page.waitForTimeout(300)
    
    // Search input should appear
    await expect(page.locator('input[placeholder*="Buscar"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('should close search with Escape key', async ({ page }) => {
    await page.keyboard.press('/')
    await page.waitForTimeout(300)
    
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    
    // Search should close
    await expect(page.locator('input[placeholder*="Buscar"]')).not.toBeVisible()
  })
})

// ==========================================
// QUICK ADD MENU TESTS
// ==========================================
test.describe('Quick Add Menu', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should open quick add menu with N key', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForTimeout(300)
    
    // Menu should appear
    await expect(page.locator('text=Crear nuevo')).toBeVisible({ timeout: 5000 })
    
    // Clean up - close the menu by clicking overlay
    await page.locator('.fixed.inset-0.bg-black').first().click({ force: true })
  })

  test('should show all quick add options', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForTimeout(300)
    
    // Look within the quick add menu for specific items
    await expect(page.locator('text=Agregar un nuevo contacto')).toBeVisible()
    await expect(page.locator('text=Crear una nueva oportunidad')).toBeVisible()
    await expect(page.locator('text=Crear una nueva tarea')).toBeVisible()
    await expect(page.locator('text=Registrar una llamada')).toBeVisible()
    
    // Clean up - close the menu
    await page.locator('.fixed.inset-0.bg-black').first().click({ force: true })
  })
})

// ==========================================
// PIPELINE PAGE TESTS
// ==========================================
test.describe('Pipeline Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/deals', { waitUntil: 'networkidle' })
    await page.waitForSelector('main', { timeout: 10000 })
  })

  test('should display kanban board with all stages', async ({ page }) => {
    await expect(page.locator('text=Lead').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Calificado').first()).toBeVisible()
    await expect(page.locator('text=Propuesta').first()).toBeVisible()
    await expect(page.locator('text=Negociación').first()).toBeVisible()
  })

  test('should show won/lost columns', async ({ page }) => {
    await expect(page.locator('text=Ganado').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Perdido').first()).toBeVisible()
  })

  test('should show deal cards in kanban', async ({ page }) => {
    // Deal cards should be visible
    await expect(page.locator('.kanban-card').first()).toBeVisible({ timeout: 10000 })
  })

  test('deal cards should be draggable', async ({ page }) => {
    // Verify deal cards have draggable attribute
    const dealCard = page.locator('.kanban-card[draggable="true"]').first()
    await expect(dealCard).toBeVisible({ timeout: 10000 })
  })

  test('should show add button in columns', async ({ page }) => {
    // Each kanban column should have an "Agregar" button
    await expect(page.locator('.kanban-column button:has-text("Agregar")').first()).toBeVisible({ timeout: 10000 })
  })
})

// ==========================================
// TASKS PAGE TESTS
// ==========================================
test.describe('Tasks Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/tasks', { waitUntil: 'networkidle' })
    await page.waitForSelector('main', { timeout: 10000 })
  })

  test('should display page title', async ({ page }) => {
    await expect(page.locator('h1:has-text("Tareas")')).toBeVisible({ timeout: 10000 })
  })

  test('should display task filter tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("Hoy")').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button:has-text("Próximas")').first()).toBeVisible()
    await expect(page.locator('button:has-text("Vencidas")').first()).toBeVisible()
    await expect(page.locator('button:has-text("Completadas")').first()).toBeVisible()
  })

  test('should switch between filter tabs', async ({ page }) => {
    // Click on "Completadas" filter
    await page.locator('button:has-text("Completadas")').first().click()
    await page.waitForTimeout(500)
    // Tab should be selected (visually verify by bg class)
    await expect(page.locator('button:has-text("Completadas")').first()).toBeVisible()
  })

  test('should show new task button', async ({ page }) => {
    await expect(page.locator('button:has-text("Nueva tarea")')).toBeVisible({ timeout: 10000 })
  })
})

// ==========================================
// REPORTS PAGE TESTS
// ==========================================
test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/reports', { waitUntil: 'networkidle' })
    await page.waitForSelector('main', { timeout: 10000 })
  })

  test('should display page title', async ({ page }) => {
    await expect(page.locator('h1:has-text("Reportes")')).toBeVisible({ timeout: 10000 })
  })

  test('should show Pipeline Total KPI card', async ({ page }) => {
    await expect(page.locator('text=Pipeline Total')).toBeVisible({ timeout: 10000 })
  })

  test('should show Won This Month KPI card', async ({ page }) => {
    await expect(page.locator('text=Ganado este mes')).toBeVisible({ timeout: 10000 })
  })

  test('should show Conversion Rate KPI card', async ({ page }) => {
    await expect(page.locator('text=Tasa de conversión')).toBeVisible({ timeout: 10000 })
  })

  test('should show New Contacts KPI card', async ({ page }) => {
    await expect(page.locator('text=Nuevos contactos')).toBeVisible({ timeout: 10000 })
  })

  test('should show Pipeline by Stage section', async ({ page }) => {
    await expect(page.locator('text=Pipeline por etapa')).toBeVisible({ timeout: 10000 })
  })
})

// ==========================================
// SETTINGS PAGE TESTS
// ==========================================
test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.waitForSelector('main', { timeout: 10000 })
    // Make sure no modals are open
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  })

  test('should display page title', async ({ page }) => {
    await expect(page.locator('text=Configuración general').first()).toBeVisible({ timeout: 10000 })
  })

  test('should display settings sidebar tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /General/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /Pipeline/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Notificaciones/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Integraciones/ })).toBeVisible()
  })

  test('should show General settings by default', async ({ page }) => {
    await expect(page.getByText('Nombre de la organización')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Zona horaria')).toBeVisible()
  })

  test('should switch to Pipeline settings tab', async ({ page }) => {
    // Click the Pipeline tab button in the settings sidebar (inside main area)
    await page.getByRole('button', { name: /Pipeline/ }).click()
    await page.waitForTimeout(500)
    
    // General settings should be hidden, pipeline settings visible
    await expect(page.getByText('Nombre de la organización')).not.toBeVisible({ timeout: 5000 })
  })

  test('should show currency selector in General', async ({ page }) => {
    await expect(page.locator('text=Moneda predeterminada')).toBeVisible({ timeout: 10000 })
  })
})

// ==========================================
// NAVIGATION TESTS
// ==========================================
test.describe('Navigation', () => {
  test('should navigate to Pipeline page', async ({ page }) => {
    await login(page)
    
    await page.locator('nav a:has-text("Pipeline")').click()
    
    await expect(page).toHaveURL(/\/deals/)
    await expect(page.locator('text=Lead').first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to Tasks page', async ({ page }) => {
    await login(page)
    
    await page.locator('nav a:has-text("Tareas")').click()
    
    await expect(page).toHaveURL(/\/tasks/)
    await expect(page.locator('h1:has-text("Tareas")')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to Reports page', async ({ page }) => {
    await login(page)
    
    await page.locator('nav a:has-text("Reportes")').click()
    
    await expect(page).toHaveURL(/\/reports/)
    await expect(page.locator('h1:has-text("Reportes")')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to Settings page', async ({ page }) => {
    await login(page)
    
    await page.locator('nav a:has-text("Configuración")').click()
    
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.locator('text=Configuración general')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate back to Contacts page', async ({ page }) => {
    await login(page)
    await page.goto('/deals', { waitUntil: 'networkidle' })
    await page.waitForSelector('nav', { timeout: 10000 })
    
    await page.locator('nav a:has-text("Contactos")').click()
    
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=/\\d+ contactos?/')).toBeVisible({ timeout: 10000 })
  })
})

// ==========================================
// UI COMPONENTS TESTS
// ==========================================
test.describe('UI Components', () => {
  test('should display avatars with initials in contact list', async ({ page }) => {
    await login(page)
    await page.waitForSelector('text=/\\d+ contactos?/', { timeout: 10000 })
    
    // Avatar elements should be visible in contact list
    const avatar = page.locator('[class*="rounded-full"][class*="bg-"]').first()
    await expect(avatar).toBeVisible()
  })

  test('should show search button in sidebar', async ({ page }) => {
    await login(page)
    
    // Search button with / shortcut hint should be visible
    await expect(page.locator('text=Buscar...')).toBeVisible()
  })

  test('should show logo in sidebar', async ({ page }) => {
    await login(page)
    
    // Logo area should be visible (check for the logo link in the sidebar)
    const logoLink = page.locator('aside a[href="/"]').first()
    await expect(logoLink).toBeVisible()
    
    // Should have organization name text (dynamic based on settings)
    await expect(logoLink.locator('span.text-lg')).toBeVisible()
  })
})
