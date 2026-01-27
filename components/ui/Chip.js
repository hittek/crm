const variantClasses = {
  gray: 'chip-gray',
  blue: 'chip-blue',
  green: 'chip-green',
  yellow: 'chip-yellow',
  red: 'chip-red',
  indigo: 'chip-indigo',
  purple: 'chip-purple',
}

const statusVariants = {
  active: 'green',
  inactive: 'gray',
  lead: 'blue',
  prospect: 'yellow',
  pending: 'yellow',
  'in-progress': 'blue',
  completed: 'green',
  cancelled: 'gray',
  qualified: 'blue',
  proposal: 'indigo',
  negotiation: 'purple',
  won: 'green',
  lost: 'red',
}

const priorityVariants = {
  low: 'gray',
  medium: 'yellow',
  high: 'red',
}

export function Chip({ children, variant = 'gray', className = '' }) {
  return (
    <span className={`chip ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function StatusChip({ status, className = '' }) {
  const labels = {
    active: 'Activo',
    inactive: 'Inactivo',
    lead: 'Lead',
    prospect: 'Prospecto',
    pending: 'Pendiente',
    'in-progress': 'En progreso',
    completed: 'Completado',
    cancelled: 'Cancelado',
    qualified: 'Calificado',
    proposal: 'Propuesta',
    negotiation: 'Negociación',
    won: 'Ganado',
    lost: 'Perdido',
  }

  return (
    <Chip variant={statusVariants[status] || 'gray'} className={className}>
      {labels[status] || status}
    </Chip>
  )
}

export function PriorityChip({ priority, className = '' }) {
  const labels = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
  }

  return (
    <Chip variant={priorityVariants[priority] || 'gray'} className={className}>
      {labels[priority] || priority}
    </Chip>
  )
}

export function TagChip({ tag, onRemove, className = '' }) {
  return (
    <span className={`chip chip-blue flex items-center gap-1 ${className}`}>
      {tag}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(tag) }}
          className="hover:text-blue-900 -mr-1"
          aria-label={`Remove tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
