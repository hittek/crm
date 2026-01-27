import Icons from './Icons'

export function EmptyState({ 
  icon: IconComponent = Icons.contacts,
  title,
  description,
  action,
  actionLabel,
  showSampleData = false,
}) {
  return (
    <div className="empty-state">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <IconComponent className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      )}
      {action && actionLabel && (
        <button onClick={action} className="btn-primary">
          <Icons.add className="w-4 h-4 mr-2" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function ContactsEmptyState({ onAdd, onImport }) {
  return (
    <div className="empty-state">
      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
        <Icons.contacts className="w-8 h-8 text-primary-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No hay contactos</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        Comienza agregando tu primer contacto o importa desde un archivo CSV.
      </p>
      <div className="flex gap-3">
        <button onClick={onAdd} className="btn-primary">
          <Icons.add className="w-4 h-4 mr-2" />
          Agregar contacto
        </button>
        {onImport && (
          <button onClick={onImport} className="btn-secondary">
            <Icons.upload className="w-4 h-4 mr-2" />
            Importar CSV
          </button>
        )}
      </div>
      
      {/* Sample data preview */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-md text-left">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Vista previa</p>
        <div className="space-y-2">
          {[
            { name: 'María García', company: 'Tech Solutions', role: 'CEO' },
            { name: 'Carlos López', company: 'Innovate MX', role: 'CTO' },
          ].map((sample, i) => (
            <div key={i} className="flex items-center gap-3 opacity-50">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                {sample.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{sample.name}</div>
                <div className="text-xs text-gray-500">{sample.role} en {sample.company}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DealsEmptyState({ onAdd }) {
  return (
    <EmptyState
      icon={Icons.deals}
      title="No hay oportunidades"
      description="Crea tu primera oportunidad para comenzar a rastrear tu pipeline de ventas."
      action={onAdd}
      actionLabel="Crear oportunidad"
    />
  )
}

export function TasksEmptyState({ onAdd }) {
  return (
    <EmptyState
      icon={Icons.tasks}
      title="No hay tareas"
      description="¡Excelente! No tienes tareas pendientes. Crea una nueva tarea para mantenerte organizado."
      action={onAdd}
      actionLabel="Crear tarea"
    />
  )
}
