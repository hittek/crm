import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import Icons from '../ui/Icons'
import { parseNaturalDate } from '../../lib/utils'

export default function TaskForm({ isOpen, onClose, onSave, task = null, contactId = null, dealId = null }) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pending',
    priority: task?.priority || 'medium',
    type: task?.type || 'task',
    dueDate: task?.dueDate 
      ? new Date(task.dueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    dueTime: task?.dueTime || '',
    contactId: task?.contactId || contactId || '',
    dealId: task?.dealId || dealId || '',
    assignedToId: task?.assignedToId || '',
    visibility: task?.visibility || 'org',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Fetch users for assignment dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const res = await fetch('/api/users?activeOnly=true')
        const data = await res.json()
        setUsers(data.data || [])
      } catch (error) {
        console.error('Error fetching users:', error)
      }
      setLoadingUsers(false)
    }
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = task ? 'PUT' : 'POST'
      
      const data = {
        ...formData,
        contactId: formData.contactId ? parseInt(formData.contactId) : null,
        dealId: formData.dealId ? parseInt(formData.dealId) : null,
        assignedToId: formData.assignedToId ? parseInt(formData.assignedToId) : null,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) throw new Error('Error saving task')
      
      const saved = await res.json()
      onSave(saved)
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      setErrors({ submit: 'Error al guardar la tarea' })
    }
    setIsSubmitting(false)
  }

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: null })
    }
  }

  // Parse natural language in title for date
  const handleTitleChange = (value) => {
    handleChange('title', value)
    const parsedDate = parseNaturalDate(value)
    if (parsedDate) {
      handleChange('dueDate', parsedDate.toISOString().split('T')[0])
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Editar tarea' : 'Nueva tarea'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder='Ej: "Llamar a Juan mañana a las 10am"'
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Tip: Escribe "mañana", "próxima semana" o una fecha y la detectamos automáticamente
            </p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <div className="flex gap-2">
              {[
                { id: 'task', label: 'Tarea', icon: Icons.tasks },
                { id: 'call', label: 'Llamada', icon: Icons.phone },
                { id: 'email', label: 'Email', icon: Icons.mail },
                { id: 'meeting', label: 'Reunión', icon: Icons.calendar },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleChange('type', type.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    formData.type === type.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <type.icon className="w-4 h-4" />
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Due date and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de vencimiento
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="input"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          {/* Assigned To and Visibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asignado a
              </label>
              <select
                value={formData.assignedToId}
                onChange={(e) => handleChange('assignedToId', e.target.value)}
                className="input"
                disabled={loadingUsers}
              >
                <option value="">Sin asignar</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibilidad
              </label>
              <select
                value={formData.visibility}
                onChange={(e) => handleChange('visibility', e.target.value)}
                className="input"
              >
                <option value="org">Toda la organización</option>
                <option value="assignee">Solo asignado</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Detalles de la tarea..."
            />
          </div>
        </div>

        {/* Error message */}
        {errors.submit && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Guardando...' : task ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
