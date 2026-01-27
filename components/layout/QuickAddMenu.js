import { useRouter } from 'next/router'
import Icons from '../ui/Icons'

const quickAddItems = [
  { 
    id: 'contact', 
    name: 'Contacto', 
    description: 'Agregar un nuevo contacto',
    icon: Icons.contacts,
    color: 'blue',
    href: '/?new=contact'
  },
  { 
    id: 'deal', 
    name: 'Oportunidad', 
    description: 'Crear una nueva oportunidad',
    icon: Icons.deals,
    color: 'indigo',
    href: '/deals?new=deal'
  },
  { 
    id: 'task', 
    name: 'Tarea', 
    description: 'Crear una nueva tarea',
    icon: Icons.tasks,
    color: 'green',
    href: '/tasks?new=task'
  },
  { 
    id: 'activity', 
    name: 'Actividad', 
    description: 'Registrar una llamada, email o reunión',
    icon: Icons.activity,
    color: 'yellow',
    href: '/?new=activity'
  },
]

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
}

export default function QuickAddMenu({ isOpen, onClose }) {
  const router = useRouter()

  const handleSelect = (item) => {
    onClose()
    router.push(item.href)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
      <div className="flex justify-center pt-24 px-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-2">
          <div className="px-3 py-2 border-b border-gray-100 mb-2">
            <h3 className="text-sm font-medium text-gray-900">Crear nuevo</h3>
          </div>
          <div className="space-y-1">
            {quickAddItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[item.color]}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <Icons.chevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 px-3 pb-2">
            <div className="flex justify-center gap-4 text-xs text-gray-400">
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">N</kbd> abrir menú</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">ESC</kbd> cerrar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
