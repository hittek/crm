import prisma from '../../../lib/prisma'
import { getSession, hasMinRole } from '../../../lib/auth'

// Default settings - used when no database settings exist
const DEFAULT_SETTINGS = {
  organization: {
    name: 'Mi CRM',
    logo: null,
    favicon: null,
    primaryColor: '#4F46E5',
    timezone: 'America/Mexico_City',
    currency: 'MXN',
    dateFormat: 'dd/MM/yyyy',
    locale: 'es-MX',
  },
  dealStages: [
    { id: 'lead', label: 'Lead', color: 'gray', probability: 10 },
    { id: 'qualified', label: 'Calificado', color: 'blue', probability: 25 },
    { id: 'proposal', label: 'Propuesta', color: 'indigo', probability: 50 },
    { id: 'negotiation', label: 'Negociación', color: 'purple', probability: 75 },
    { id: 'won', label: 'Ganado', color: 'green', probability: 100 },
    { id: 'lost', label: 'Perdido', color: 'red', probability: 0 },
  ],
  contactStatuses: [
    { id: 'active', label: 'Activo', color: 'green' },
    { id: 'inactive', label: 'Inactivo', color: 'gray' },
    { id: 'lead', label: 'Lead', color: 'blue' },
    { id: 'prospect', label: 'Prospecto', color: 'yellow' },
  ],
  taskPriorities: [
    { id: 'low', label: 'Baja', color: 'gray' },
    { id: 'medium', label: 'Media', color: 'yellow' },
    { id: 'high', label: 'Alta', color: 'red' },
  ],
  notifications: {
    emailEnabled: true,
    taskReminders: true,
    dealUpdates: true,
    dailyDigest: false,
  },
}

export default async function handler(req, res) {
  // Check authentication
  const session = await getSession(req, res)
  if (!session.user) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  
  const organizationId = session.user.organizationId
  if (!organizationId) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  if (req.method === 'GET') {
    return getSettings(req, res, organizationId)
  } else if (req.method === 'PUT') {
    // Only admins can update settings
    if (!hasMinRole(session.user.role, 'admin')) {
      return res.status(403).json({ error: 'No tienes permisos para modificar configuración' })
    }
    return updateSettings(req, res, session.user, organizationId)
  } else {
    res.setHeader('Allow', ['GET', 'PUT'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}

async function getSettings(req, res, organizationId) {
  try {
    // Get organization data including orgSettings
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        logo: true,
        favicon: true,
        primaryColor: true,
        timezone: true,
        currency: true,
        locale: true,
        orgSettings: true,
      }
    })

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' })
    }

    // Parse orgSettings JSON
    let orgSettings = {}
    if (organization.orgSettings) {
      try {
        orgSettings = JSON.parse(organization.orgSettings)
      } catch {
        orgSettings = {}
      }
    }

    // Merge with defaults
    const settings = { ...DEFAULT_SETTINGS }
    
    // Override with organization-level settings
    settings.organization = {
      ...settings.organization,
      name: organization.name,
      logo: organization.logo,
      favicon: organization.favicon,
      primaryColor: organization.primaryColor,
      timezone: organization.timezone,
      currency: organization.currency,
      locale: organization.locale,
    }
    
    // Override with custom settings from orgSettings JSON
    if (orgSettings.dealStages) settings.dealStages = orgSettings.dealStages
    if (orgSettings.contactStatuses) settings.contactStatuses = orgSettings.contactStatuses
    if (orgSettings.taskPriorities) settings.taskPriorities = orgSettings.taskPriorities
    if (orgSettings.notifications) settings.notifications = orgSettings.notifications

    return res.status(200).json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return res.status(500).json({ error: 'Error fetching settings' })
  }
}

async function updateSettings(req, res, currentUser, organizationId) {
  try {
    const updates = req.body

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid settings data' })
    }

    // Get current organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { orgSettings: true }
    })

    // Parse existing orgSettings
    let orgSettings = {}
    if (organization?.orgSettings) {
      try {
        orgSettings = JSON.parse(organization.orgSettings)
      } catch {
        orgSettings = {}
      }
    }

    // Prepare organization-level updates
    const orgUpdate = {}

    // Handle organization-level settings (stored in Organization columns)
    if (updates.organization) {
      const { name, logo, favicon, primaryColor, timezone, currency, locale } = updates.organization
      if (name !== undefined) orgUpdate.name = name
      if (logo !== undefined) orgUpdate.logo = logo
      if (favicon !== undefined) orgUpdate.favicon = favicon
      if (primaryColor !== undefined) orgUpdate.primaryColor = primaryColor
      if (timezone !== undefined) orgUpdate.timezone = timezone
      if (currency !== undefined) orgUpdate.currency = currency
      if (locale !== undefined) orgUpdate.locale = locale
    }

    // Handle custom settings (stored in orgSettings JSON)
    if (updates.dealStages) orgSettings.dealStages = updates.dealStages
    if (updates.contactStatuses) orgSettings.contactStatuses = updates.contactStatuses
    if (updates.taskPriorities) orgSettings.taskPriorities = updates.taskPriorities
    if (updates.notifications) orgSettings.notifications = updates.notifications

    // Update organization with both column updates and orgSettings JSON
    orgUpdate.orgSettings = JSON.stringify(orgSettings)
    
    await prisma.organization.update({
      where: { id: organizationId },
      data: orgUpdate
    })

    // Return updated settings
    return getSettings(req, res, organizationId)
  } catch (error) {
    console.error('Error updating settings:', error)
    return res.status(500).json({ error: 'Error updating settings' })
  }
}
