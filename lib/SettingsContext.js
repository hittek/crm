import { createContext, useContext, useState, useEffect } from 'react'
import { DEAL_STAGES as DEFAULT_DEAL_STAGES, CONTACT_STATUSES as DEFAULT_CONTACT_STATUSES, TASK_PRIORITIES as DEFAULT_TASK_PRIORITIES } from './utils'

const SettingsContext = createContext(null)

export const DEFAULT_TASK_TYPES = [
  { id: 'task',    label: 'Tarea',    emoji: '✅', color: 'gray',   requiresContact: false, showMapsLink: false, builtIn: true },
  { id: 'call',    label: 'Llamada',  emoji: '📞', color: 'blue',   requiresContact: false, showMapsLink: false, builtIn: true },
  { id: 'email',   label: 'Correo',   emoji: '✉️', color: 'cyan',   requiresContact: false, showMapsLink: false, builtIn: true },
  { id: 'meeting', label: 'Reunión',  emoji: '📅', color: 'purple', requiresContact: false, showMapsLink: false, builtIn: true },
]

const DEFAULT_ORGANIZATION = {
  name: 'Mi CRM',
  logo: null,
  favicon: null,
  primaryColor: '#2563eb',
  secondaryColor: '#7c3aed',
  currency: 'MXN',
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    dealStages: DEFAULT_DEAL_STAGES,
    contactStatuses: DEFAULT_CONTACT_STATUSES,
    taskPriorities: DEFAULT_TASK_PRIORITIES,
    taskTypes: DEFAULT_TASK_TYPES,
    organization: DEFAULT_ORGANIZATION,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  // Apply primary color as CSS variable when settings change
  useEffect(() => {
    if (settings.organization?.primaryColor) {
      const hex = settings.organization.primaryColor
      document.documentElement.style.setProperty('--primary-color', hex)
      document.documentElement.style.setProperty('--primary-600', hex)
      document.documentElement.style.setProperty('--primary-700', adjustColor(hex, -20))
      document.documentElement.style.setProperty('--primary-500', adjustColor(hex, 20))
      document.documentElement.style.setProperty('--primary-100', adjustColor(hex, 80))
      document.documentElement.style.setProperty('--primary-50',  adjustColor(hex, 92))
    }
  }, [settings.organization?.primaryColor])

  // Apply secondary color as CSS variable when settings change
  useEffect(() => {
    const hex = settings.organization?.secondaryColor || '#7c3aed'
    document.documentElement.style.setProperty('--secondary-color', hex)
    document.documentElement.style.setProperty('--secondary-600', hex)
    document.documentElement.style.setProperty('--secondary-700', adjustColor(hex, -20))
    document.documentElement.style.setProperty('--secondary-500', adjustColor(hex, 20))
    document.documentElement.style.setProperty('--secondary-100', adjustColor(hex, 80))
    document.documentElement.style.setProperty('--secondary-50',  adjustColor(hex, 92))
  }, [settings.organization?.secondaryColor])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(prev => ({
          ...prev,
          ...data,
          // Ensure dealStages has required format
          dealStages: data.dealStages || DEFAULT_DEAL_STAGES,
          contactStatuses: data.contactStatuses || DEFAULT_CONTACT_STATUSES,
          taskPriorities: data.taskPriorities || DEFAULT_TASK_PRIORITIES,
          taskTypes: data.taskTypes || DEFAULT_TASK_TYPES,
          organization: { ...DEFAULT_ORGANIZATION, ...data.organization },
        }))
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      // Keep defaults on error
    }
    setIsLoading(false)
  }

  const refreshSettings = async () => {
    await fetchSettings()
  }

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

// Helper function to adjust hex color brightness
function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, Math.max(0, (num >> 16) + amt))
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt))
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt))
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// Convenience hook for organization settings
export function useOrganization() {
  const { settings } = useSettings()
  return settings.organization
}

// Convenience hook for deal stages
export function useDealStages() {
  const { settings } = useSettings()
  return settings.dealStages
}

// Convenience hook for contact statuses
export function useContactStatuses() {
  const { settings } = useSettings()
  return settings.contactStatuses
}

// Convenience hook for task priorities
export function useTaskPriorities() {
  const { settings } = useSettings()
  return settings.taskPriorities
}

// Convenience hook for task types (built-in + custom)
export function useTaskTypes() {
  const { settings } = useSettings()
  return settings.taskTypes || DEFAULT_TASK_TYPES
}
