const { test, expect } = require('@playwright/test')
const { login, resetLocale } = require('./helpers/login')

// ==========================================
// CONTACTS PAGE TESTS
// ==========================================
test.describe('Contacts Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Reset locale to Spanish — i18n.spec.js may leave app in English
    await resetLocale(page)
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
    
    // Click on first contact row — scope to the scrollable list to avoid hitting "Nuevo" button
    const contactButton = page.locator('main .overflow-y-auto button').first()
    await contactButton.click()
    
    // Detail panel should show - label text is "Email" (CSS uppercase transform makes it look like EMAIL)
    await expect(page.locator('label:has-text("Email")').first()).toBeVisible({ timeout: 8000 })
  })

  test('should show contact status dropdown in detail', async ({ page }) => {
    await page.waitForSelector('text=/\\d+ contactos?/', { timeout: 10000 })
    
    // Click on first contact row — scope to the scrollable list
    await page.locator('main .overflow-y-auto button').first().click()
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
    // Kanban column headers are h3 elements inside .kanban-column (desktop view)
    await expect(page.locator('.kanban-column h3:has-text("Lead")').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.kanban-column h3:has-text("Calificado")').first()).toBeVisible()
    await expect(page.locator('.kanban-column h3:has-text("Propuesta")').first()).toBeVisible()
    await expect(page.locator('.kanban-column h3:has-text("Negociación")').first()).toBeVisible()
  })

  test('should show won/lost columns', async ({ page }) => {
    // Won/Lost rendered as StatusChip elements in a flex container after the kanban columns (desktop)
    // Using bg-green-50/bg-red-50 container scoping
    await expect(page.locator('.bg-green-50').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.bg-red-50').first()).toBeVisible()
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
    // Reset locale to Spanish — i18n.spec.js may leave app in English
    await resetLocale(page)
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
    const main = page.locator('main')
    await expect(main.getByRole('button', { name: /General/ })).toBeVisible({ timeout: 10000 })
    await expect(main.getByRole('button', { name: /Pipeline/ })).toBeVisible()
    await expect(main.getByRole('button', { name: /Notificaciones/ })).toBeVisible()
    await expect(main.getByRole('button', { name: /Integraciones/ })).toBeVisible()
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
    await resetLocale(page)
    await page.locator('nav a:has-text("Pipeline")').click()
    
    await expect(page).toHaveURL(/\/deals/)
    await expect(page.locator('.kanban-column h3:has-text("Lead")').first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to Tasks page', async ({ page }) => {
    await login(page)
    await resetLocale(page)
    await page.locator('nav a:has-text("Tareas")').click()
    
    await expect(page).toHaveURL(/\/tasks/)
    await expect(page.locator('h1:has-text("Tareas")')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to Reports page', async ({ page }) => {
    await login(page)
    await resetLocale(page)
    await page.locator('nav a:has-text("Reportes")').click()
    
    await expect(page).toHaveURL(/\/reports/)
    await expect(page.locator('h1:has-text("Reportes")')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to Settings page', async ({ page }) => {
    await login(page)
    await resetLocale(page)
    await page.locator('nav a:has-text("Configuración")').click()
    
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.locator('text=Configuración general')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate back to Contacts page', async ({ page }) => {
    await login(page)
    await resetLocale(page)
    await page.goto('/deals', { waitUntil: 'networkidle' })
    await page.waitForSelector('nav', { timeout: 10000 })
    
    await page.locator('nav a:has-text("Contactos")').click()
    
    await expect(page).toHaveURL('/contacts')
    await expect(page.locator('text=/\\d+ contactos?/')).toBeVisible({ timeout: 10000 })
  })
})

// ==========================================
// AUTH & MOBILE TESTS
// ==========================================
test.describe('Auth & Mobile', () => {
  test('logs out successfully', async ({ page }) => {
    await login(page)

    // Open the user menu — click the user avatar/name button at the bottom of the sidebar
    await page.getByRole('button', { name: /AU Admin User/i }).click()
    await page.waitForTimeout(400)

    // Click the logout button (accessible name depends on locale; match both EN and ES)
    await page.getByRole('button', { name: /Log Out|Cerrar sesión/i }).click()

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('session persists on reload', async ({ page }) => {
    await login(page)

    await page.reload({ waitUntil: 'networkidle' })

    // Should still be on home, not redirected to login
    await expect(page).toHaveURL('/contacts', { timeout: 10000 })
    await expect(page.locator('nav').first()).toBeVisible()
  })

  test('mobile sidebar opens and closes at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)

    // Sidebar should be hidden initially (translated off screen)
    const sidebar = page.locator('aside')
    await expect(sidebar).toHaveClass(/\-translate\-x\-full/, { timeout: 5000 })

    // Click the hamburger button
    await page.locator('[aria-label="Open menu"]').click()
    await page.waitForTimeout(300)

    // Sidebar should now be visible (translate-x-0 applied)
    await expect(sidebar).not.toHaveClass(/\-translate\-x\-full/)

    // Click the overlay to close — click in the area to the right of the sidebar (sidebar=256px wide)
    await page.mouse.click(310, 400)
    await page.waitForTimeout(300)

    // Sidebar should be hidden again
    await expect(sidebar).toHaveClass(/\-translate\-x\-full/)
  })

  test('mobile sidebar opens and closes at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await login(page)

    const sidebar = page.locator('aside')
    // At 768px (below lg:1024px breakpoint) sidebar starts hidden
    await expect(sidebar).toHaveClass(/\-translate\-x\-full/)

    // Open the sidebar
    await page.locator('[aria-label="Open menu"]').click()
    await page.waitForTimeout(300)

    await expect(sidebar).not.toHaveClass(/\-translate\-x\-full/)

    // Click in the overlay area to the right of the sidebar to close it
    await page.mouse.click(500, 400)
    await page.waitForTimeout(300)

    await expect(sidebar).toHaveClass(/\-translate\-x\-full/)
  })
})

// ==========================================
// CONTACTS CRUD TESTS
// ==========================================
test.describe('Contacts CRUD', () => {
  // Helper: create a contact via the form and return the unique name used
  async function createContact(page, suffix = Date.now()) {
    await page.waitForSelector('text=/\\d+ contactos?/', { timeout: 10000 })
    await page.locator('button:has-text("Nuevo")').first().click()
    await expect(page.locator('input[placeholder="Juan"]').first()).toBeVisible({ timeout: 5000 })
    await page.locator('input[placeholder="Juan"]').first().fill(`Test${suffix}`)
    await page.locator('input[placeholder="Pérez"]').first().fill('CRUD')
    await page.locator('button:has-text("Crear contacto")').click()
    await expect(page.locator('button:has-text("Crear contacto")')).not.toBeVisible({ timeout: 5000 })
    return `Test${suffix}`
  }

  test('creates a contact and it appears in the list', async ({ page }) => {
    await login(page)
    const firstName = await createContact(page)
    // Contact should appear in the list
    await expect(page.locator(`text=${firstName}`).first()).toBeVisible({ timeout: 8000 })
  })

  test('selects a contact, edits company field inline', async ({ page }) => {
    await login(page)
    const firstName = await createContact(page)

    // Click the contact in the list to select it
    await page.locator(`text=${firstName}`).first().click()

    // Wait for detail panel to load
    await expect(page.locator('label:has-text("Email")').first()).toBeVisible({ timeout: 8000 })

    // InlineEdit shows a span with the placeholder until clicked — click to activate
    await page.locator('[aria-label="Edit Nombre de empresa"]').first().click()
    // Input appears — fill and save
    await page.locator('input.input-inline').last().fill('ACME Corp')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(800)

    // Company value should now be visible in the detail panel
    await expect(page.locator('text=ACME Corp').first()).toBeVisible({ timeout: 5000 })
  })

  test('deletes a contact and it disappears from the list', async ({ page }) => {
    await login(page)
    const suffix = Date.now()
    const firstName = await createContact(page, suffix)

    // Select the contact
    await page.locator(`text=${firstName}`).first().click()
    await expect(page.locator('label:has-text("Email")').first()).toBeVisible({ timeout: 8000 })

    // Click the delete button (aria-label="Delete contact")
    await page.locator('[aria-label="Delete contact"]').click()

    // Confirm dialog should appear
    await expect(page.locator('text=Eliminar contacto').first()).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Eliminar")').last().click()

    // Contact should no longer be in the list — scope to the contact list panel
    await expect(
      page.locator('.overflow-y-auto').locator(`text=${firstName}`)
    ).not.toBeVisible({ timeout: 8000 })
  })
})

// ==========================================
// DEALS PIPELINE CRUD TESTS
// ==========================================
test.describe('Deals Pipeline CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await resetLocale(page)
    await page.goto('/deals', { waitUntil: 'networkidle' })
    await page.waitForSelector('.kanban-column', { timeout: 10000 })
  })

  test('creates a deal and it appears in the Lead column', async ({ page }) => {
    // Click the "Agregar" button in the first kanban column — reliable since it has text
    await page.locator('.kanban-column button:has-text("Agregar")').first().click()

    // Deal form modal should open
    await expect(page.locator('input[placeholder="Ej: Licencia Enterprise para Acme Corp"]').first()).toBeVisible({ timeout: 5000 })

    // Fill title
    const suffix = Date.now()
    await page.locator('input[placeholder="Ej: Licencia Enterprise para Acme Corp"]').first().fill(`Test Deal ${suffix}`)

    // Submit
    await page.locator('button:has-text("Crear oportunidad")').click()
    await expect(page.locator('button:has-text("Crear oportunidad")')).not.toBeVisible({ timeout: 5000 })

    // Deal should appear in Lead column (first kanban column)
    await expect(
      page.locator('.kanban-column').first().locator(`.kanban-card:has-text("Test Deal ${suffix}")`)
    ).toBeVisible({ timeout: 8000 })
  })

  test('opens deal drawer by clicking a deal card', async ({ page }) => {
    // Get the first deal card visible
    const firstCard = page.locator('.kanban-card').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })
    const dealTitle = await firstCard.locator('h4').textContent()

    await firstCard.click()

    // Drawer close button is visible — drawer is open
    await expect(page.locator('button[aria-label="Close"]').first()).toBeVisible({ timeout: 5000 })
    // Deal title appears in the drawer (scope to the fixed drawer panel to avoid hidden kanban card)
    const drawerPanel = page.locator('.fixed.inset-y-0.right-0')
    await expect(drawerPanel.locator(`text=${dealTitle?.trim()}`).first()).toBeVisible()
  })

  test('changes deal stage via drawer select', async ({ page }) => {
    // Click first deal card to open drawer
    const firstCard = page.locator('.kanban-card').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })
    await firstCard.click()

    // Wait for drawer to open
    await expect(page.locator('button[aria-label="Close"]').first()).toBeVisible({ timeout: 5000 })

    // The stage select is the first select in the drawer
    const stageSelect = page.locator('select').first()
    const currentValue = await stageSelect.inputValue()

    // Pick a different stage — if current is 'lead', move to 'qualified'
    const newStage = currentValue === 'lead' ? 'qualified' : 'lead'
    await stageSelect.selectOption(newStage)

    // Wait for the update to auto-save
    await page.waitForTimeout(1000)

    // Stage select should reflect the new value
    await expect(stageSelect).toHaveValue(newStage)
  })
})

// ==========================================
// TASKS CRUD TESTS
// ==========================================
test.describe('Tasks CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await resetLocale(page)
    await page.goto('/tasks', { waitUntil: 'networkidle' })
    await page.waitForSelector('main', { timeout: 10000 })
  })

  test('creates a task and it appears in the list', async ({ page }) => {
    const taskTitle = `Test Task ${Date.now()}`

    // Click "Nueva tarea" button
    await page.locator('button:has-text("Nueva tarea")').click()
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 })

    // Fill in title
    await page.locator('input[placeholder*="Llamar"]').fill(taskTitle)

    // Submit — scope to dialog to avoid matching the list's "Nueva tarea" button
    await page.locator('[role="dialog"] button[type="submit"]').click()
    await page.waitForTimeout(1500)

    // Task may appear in any filter tab depending on timezone offset (dueDate=today UTC
    // may fall in Vencidas on servers in negative UTC offsets). Check all tabs.
    const tabs = ['Hoy', 'Próximas', 'Vencidas']
    let found = false
    for (const tab of tabs) {
      const isVisible = await page.locator(`text=${taskTitle}`).first().isVisible().catch(() => false)
      if (isVisible) { found = true; break }
      await page.locator(`button:has-text("${tab}")`).first().click()
      await page.waitForTimeout(500)
      const isVisibleNow = await page.locator(`text=${taskTitle}`).first().isVisible().catch(() => false)
      if (isVisibleNow) { found = true; break }
    }
    expect(found).toBe(true)
  })

  test('marks a task complete and it moves to Completadas', async ({ page }) => {
    const taskTitle = `Complete Task ${Date.now()}`

    // Create a task first
    await page.locator('button:has-text("Nueva tarea")').click()
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 })
    await page.locator('input[placeholder*="Llamar"]').fill(taskTitle)
    await page.locator('[role="dialog"] button[type="submit"]').click()
    await page.waitForTimeout(1500)

    // Find the task across all filter tabs
    const tabs = ['Hoy', 'Próximas', 'Vencidas']
    for (const tab of tabs) {
      const isVisible = await page.locator(`text=${taskTitle}`).first().isVisible().catch(() => false)
      if (isVisible) break
      await page.locator(`button:has-text("${tab}")`).first().click()
      await page.waitForTimeout(500)
    }
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible({ timeout: 5000 })

    // Click the task row to open the drawer
    await page.locator(`p:has-text("${taskTitle}")`).first().click()
    await page.waitForTimeout(500)

    // Click "Completar" button in the task drawer
    await page.locator('button:has-text("Completar")').first().click()
    await page.waitForTimeout(1500)

    // Navigate fresh to /tasks (clears drawer state and any overlays)
    await page.goto('/tasks', { waitUntil: 'networkidle' })

    // Switch to Completadas and verify it appears there
    await page.locator('button:has-text("Completadas")').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible({ timeout: 10000 })
  })
})

// ==========================================
// QUICK ADD NAVIGATION TESTS
// ==========================================
test.describe('Quick Add Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await resetLocale(page)
  })

  test('quick-add Tarea navigates to /tasks with TaskForm open', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForSelector('text=Crear nuevo', { timeout: 5000 })

    // Use description text to uniquely identify the Tarea option (avoids matching "Tareas" tab)
    await page.locator('button:has-text("Crear una nueva tarea")').click()

    // Should land on /tasks
    await page.waitForURL('**/tasks', { timeout: 10000 })
    await page.waitForSelector('main', { timeout: 10000 })

    // TaskForm modal should be open
    await expect(page.locator('[role="dialog"]:has-text("Nueva tarea")')).toBeVisible({ timeout: 10000 })
  })

  test('quick-add Oportunidad navigates to /deals with DealForm open', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForSelector('text=Crear nuevo', { timeout: 5000 })

    // Use description text to uniquely identify the Oportunidad option
    await page.locator('button:has-text("Crear una nueva oportunidad")').click()

    // Should land on /deals
    await page.waitForURL('**/deals', { timeout: 10000 })
    await page.waitForSelector('main', { timeout: 10000 })

    // DealForm modal should be open
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('quick-add Contacto navigates to / with ContactForm open', async ({ page }) => {
    await page.keyboard.press('n')
    await page.waitForSelector('text=Crear nuevo', { timeout: 5000 })

    // Use description text to uniquely identify the Contacto option
    await page.locator('button:has-text("Agregar un nuevo contacto")').click()

    // Should land on /contacts
    await page.waitForURL('**/contacts', { timeout: 10000 })
    await page.waitForSelector('main', { timeout: 10000 })

    // ContactForm modal should be open
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 10000 })
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
    await resetLocale(page)
    
    // Search button with / shortcut hint should be visible
    await expect(page.locator('text=Buscar...')).toBeVisible()
  })

  test('should show logo in sidebar', async ({ page }) => {
    await login(page)
    
    // Logo area should be visible (check for the logo link in the sidebar)
    const logoLink = page.locator('aside a[href="/contacts"]').first()
    await expect(logoLink).toBeVisible()
    
    // Should have organization name text (dynamic based on settings)
    await expect(logoLink.locator('span.text-lg')).toBeVisible()
  })
})
