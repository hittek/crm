import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

// Format date for display
export function formatDate(date, formatStr = 'PP') {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr, { locale: es })
}

// Format date relative (e.g., "hace 2 horas")
export function formatRelative(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

// Format date for display with smart labels
export function formatSmartDate(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(d)) return 'Hoy'
  if (isYesterday(d)) return 'Ayer'
  if (isTomorrow(d)) return 'Mañana'
  
  return format(d, 'dd MMM yyyy', { locale: es })
}

// Format currency
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format phone number (MX format)
export function formatPhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

// Get initials from name
export function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return `${first}${last}` || '?'
}

// Get full name
export function getFullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ')
}

// Task date filters
export function getTaskDateFilters() {
  const today = new Date()
  return {
    today: {
      start: startOfDay(today),
      end: endOfDay(today),
    },
    thisWeek: {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(today, { weekStartsOn: 1 }),
    },
    overdue: {
      end: startOfDay(today),
    },
    upcoming: {
      start: addDays(today, 1),
      end: addDays(today, 7),
    },
  }
}

// Parse natural language date (simple implementation)
export function parseNaturalDate(text) {
  const lower = text.toLowerCase()
  const today = new Date()
  
  if (lower.includes('hoy') || lower.includes('today')) {
    return today
  }
  if (lower.includes('mañana') || lower.includes('tomorrow')) {
    return addDays(today, 1)
  }
  if (lower.includes('próxima semana') || lower.includes('next week')) {
    return addDays(today, 7)
  }
  
  // Try to extract date patterns
  const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (dateMatch) {
    const [, day, month, year] = dateMatch
    return new Date(year ? parseInt(year) : today.getFullYear(), parseInt(month) - 1, parseInt(day))
  }
  
  return null
}

// Stage configuration
export const DEAL_STAGES = [
  { id: 'lead', label: 'Lead', color: 'gray', probability: 10 },
  { id: 'qualified', label: 'Calificado', color: 'blue', probability: 25 },
  { id: 'proposal', label: 'Propuesta', color: 'indigo', probability: 50 },
  { id: 'negotiation', label: 'Negociación', color: 'purple', probability: 75 },
  { id: 'won', label: 'Ganado', color: 'green', probability: 100 },
  { id: 'lost', label: 'Perdido', color: 'red', probability: 0 },
]

export const TASK_PRIORITIES = [
  { id: 'low', label: 'Baja', color: 'gray' },
  { id: 'medium', label: 'Media', color: 'yellow' },
  { id: 'high', label: 'Alta', color: 'red' },
]

export const ACTIVITY_TYPES = [
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'call', label: 'Llamada', icon: 'phone' },
  { id: 'meeting', label: 'Reunión', icon: 'calendar' },
  { id: 'note', label: 'Nota', icon: 'file-text' },
  { id: 'task_completed', label: 'Tarea', icon: 'check' },
]

export const CONTACT_STATUSES = [
  { id: 'active', label: 'Activo', color: 'green' },
  { id: 'inactive', label: 'Inactivo', color: 'gray' },
  { id: 'lead', label: 'Lead', color: 'blue' },
  { id: 'prospect', label: 'Prospecto', color: 'yellow' },
]
