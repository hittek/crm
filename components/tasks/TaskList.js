import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Icons from '../ui/Icons'
import { PriorityChip } from '../ui/Chip'
import { Avatar } from '../ui/Avatar'
import { Spinner } from '../ui/Spinner'
import { TasksEmptyState } from '../ui/EmptyState'
import { Drawer } from '../ui/Modal'
import { formatSmartDate, getFullName, parseNaturalDate } from '../../lib/utils'
import { useAuth } from '../../lib/AuthContext'

const filters = [
  { id: 'today', label: 'Hoy', icon: Icons.calendar },
  { id: 'upcoming', label: 'Próximas', icon: Icons.clock },
  { id: 'overdue', label: 'Vencidas', icon: Icons.alert },
  { id: 'completed', label: 'Completadas', icon: Icons.check },
]

export default function TaskList({ onNewTask }) {
  const router = useRouter()
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('today')
  const [counts, setCounts] = useState({ today: 0, upcoming: 0, overdue: 0 })
  const [selectedTask, setSelectedTask] = useState(null)
  const [quickAddText, setQuickAddText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Sync selectedTask with URL query parameter
  useEffect(() => {
    const { id } = router.query
    if (id && tasks.length > 0) {
      const taskId = parseInt(id)
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setSelectedTask(task)
      } else {
        // Task not in current list, fetch it directly
        fetch(`/api/tasks/${taskId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) setSelectedTask(data)
          })
          .catch(() => {})
      }
    }
  }, [router.query, tasks])

  const handleTaskSelect = useCallback((task) => {
    setSelectedTask(task)
    router.replace({ pathname: '/tasks', query: task ? { id: task.id } : {} }, undefined, { shallow: true })
  }, [router])

  const handleTaskClose = useCallback(() => {
    setSelectedTask(null)
    router.replace({ pathname: '/tasks' }, undefined, { shallow: true })
  }, [router])

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/tasks?filter=${activeFilter}&sortBy=dueDate&sortOrder=asc`)
      const data = await res.json()
      setTasks(data.data)
      setCounts(data.counts)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
    setIsLoading(false)
  }, [activeFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const toggleTaskComplete = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: newStatus } : t
    ))

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchTasks() // Refresh to update counts
    } catch (error) {
      console.error('Error updating task:', error)
      fetchTasks() // Revert on error
    }
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!quickAddText.trim()) return

    setIsAdding(true)
    try {
      // Parse natural language for date
      const parsedDate = parseNaturalDate(quickAddText)
      
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickAddText,
          dueDate: parsedDate || new Date(),
          status: 'pending',
          priority: 'medium',
        }),
      })
      
      setQuickAddText('')
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
    setIsAdding(false)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <button onClick={onNewTask} className="btn-primary">
            <Icons.add className="w-4 h-4 mr-2" />
            Nueva tarea
          </button>
        </div>

        {/* Quick add */}
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <div className="flex-1 relative">
            <Icons.add className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              placeholder='Agregar tarea rápida... (ej: "Llamar a Juan mañana")'
              className="input pl-10"
              disabled={isAdding}
            />
          </div>
          <button 
            type="submit" 
            disabled={isAdding || !quickAddText.trim()}
            className="btn-secondary"
          >
            {isAdding ? <Spinner size="sm" /> : 'Agregar'}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex gap-2">
        {filters.map((filter) => {
          const count = counts[filter.id] || 0
          const isActive = activeFilter === filter.id
          
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`filter-pill ${isActive ? 'filter-pill-active' : ''}`}
            >
              <filter.icon className="w-4 h-4" />
              {filter.label}
              {count > 0 && filter.id !== 'completed' && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  isActive ? 'bg-primary-200' : 'bg-gray-200'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : tasks.length === 0 ? (
          <TasksEmptyState onAdd={onNewTask} />
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                  task.status === 'completed' ? 'opacity-60' : ''
                }`}
                onClick={() => handleTaskSelect(task)}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTaskComplete(task)
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    task.status === 'completed'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-primary-500'
                  }`}
                >
                  {task.status === 'completed' && (
                    <Icons.check className="w-3 h-3" />
                  )}
                </button>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {task.contact && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Avatar 
                          firstName={task.contact.firstName}
                          lastName={task.contact.lastName}
                          size="xs"
                        />
                        {getFullName(task.contact.firstName, task.contact.lastName)}
                      </span>
                    )}
                    {task.deal && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Icons.deals className="w-3 h-3" />
                        {task.deal.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Due date */}
                <div className="text-right">
                  {task.dueDate && (
                    <span className={`text-sm ${
                      new Date(task.dueDate) < new Date() && task.status !== 'completed'
                        ? 'text-red-600 font-medium'
                        : 'text-gray-500'
                    }`}>
                      {formatSmartDate(task.dueDate)}
                    </span>
                  )}
                </div>

                {/* Priority */}
                <PriorityChip priority={task.priority} />

                {/* Type icon */}
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  {task.type === 'call' && <Icons.phone className="w-4 h-4 text-gray-500" />}
                  {task.type === 'email' && <Icons.mail className="w-4 h-4 text-gray-500" />}
                  {task.type === 'meeting' && <Icons.calendar className="w-4 h-4 text-gray-500" />}
                  {task.type === 'task' && <Icons.tasks className="w-4 h-4 text-gray-500" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={handleTaskClose}
          onUpdate={(updated) => {
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
            setSelectedTask(updated)
          }}
          onDelete={(id) => {
            setTasks(prev => prev.filter(t => t.id !== id))
            handleTaskClose()
          }}
        />
      )}
    </div>
  )
}

function TaskDrawer({ task, isOpen, onClose, onUpdate, onDelete }) {
  const [localTask, setLocalTask] = useState(task)
  const [isSaving, setIsSaving] = useState(false)
  const { user, permissions } = useAuth()

  // Check if current user can delete this task
  const canDelete = localTask && (
    permissions?.isManager || // Managers and admins can delete anything
    localTask.ownerId === user?.id || // Owner can delete
    localTask.assignedToId === user?.id || // Assignee can delete
    localTask.createdBy === user?.name || localTask.createdBy === user?.email // Creator can delete
  )

  useEffect(() => {
    setLocalTask(task)
  }, [task])

  const updateField = async (field, value) => {
    setIsSaving(true)
    const updated = { ...localTask, [field]: value }
    setLocalTask(updated)

    try {
      const res = await fetch(`/api/tasks/${localTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      onUpdate?.(data)
    } catch (error) {
      console.error('Error updating task:', error)
      setLocalTask(task)
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    try {
      await fetch(`/api/tasks/${localTask.id}`, { method: 'DELETE' })
      onDelete?.(localTask.id)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Detalle de tarea" width="md">
      <div className="space-y-6">
        {/* Title */}
        <div>
          <input
            type="text"
            value={localTask.title}
            onChange={(e) => setLocalTask({ ...localTask, title: e.target.value })}
            onBlur={(e) => updateField('title', e.target.value)}
            className="text-lg font-semibold w-full border-0 p-0 focus:ring-0"
            placeholder="Título de la tarea"
          />
        </div>

        {/* Status and Priority */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase">Estado</label>
            <select
              value={localTask.status}
              onChange={(e) => updateField('status', e.target.value)}
              className="input mt-1"
            >
              <option value="pending">Pendiente</option>
              <option value="in-progress">En progreso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase">Prioridad</label>
            <select
              value={localTask.priority}
              onChange={(e) => updateField('priority', e.target.value)}
              className="input mt-1"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Fecha de vencimiento</label>
          <input
            type="date"
            value={localTask.dueDate ? new Date(localTask.dueDate).toISOString().split('T')[0] : ''}
            onChange={(e) => updateField('dueDate', e.target.value ? new Date(e.target.value) : null)}
            className="input mt-1"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Tipo</label>
          <div className="flex gap-2 mt-1">
            {['task', 'call', 'email', 'meeting'].map((type) => (
              <button
                key={type}
                onClick={() => updateField('type', type)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  localTask.type === type
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type === 'task' && <Icons.tasks className="w-4 h-4" />}
                {type === 'call' && <Icons.phone className="w-4 h-4" />}
                {type === 'email' && <Icons.mail className="w-4 h-4" />}
                {type === 'meeting' && <Icons.calendar className="w-4 h-4" />}
                <span className="text-sm capitalize">{type === 'task' ? 'Tarea' : type === 'call' ? 'Llamada' : type === 'email' ? 'Email' : 'Reunión'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Descripción</label>
          <textarea
            value={localTask.description || ''}
            onChange={(e) => setLocalTask({ ...localTask, description: e.target.value })}
            onBlur={(e) => updateField('description', e.target.value)}
            className="input mt-1 resize-none"
            rows={4}
            placeholder="Agregar descripción..."
          />
        </div>

        {/* Related items */}
        {(localTask.contact || localTask.deal) && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Relacionado con</label>
            <div className="space-y-2 mt-2">
              {localTask.contact && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Icons.user className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">
                    {getFullName(localTask.contact.firstName, localTask.contact.lastName)}
                  </span>
                </div>
              )}
              {localTask.deal && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Icons.deals className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{localTask.deal.title}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          {localTask.status !== 'completed' && (
            <button
              onClick={() => updateField('status', 'completed')}
              className="btn-success flex-1"
            >
              <Icons.check className="w-4 h-4 mr-2" />
              Completar
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="btn-danger"
            >
              <Icons.delete className="w-4 h-4" />
            </button>
          )}
        </div>

        {isSaving && (
          <p className="text-xs text-gray-500 text-center">Guardando...</p>
        )}
      </div>
    </Drawer>
  )
}
