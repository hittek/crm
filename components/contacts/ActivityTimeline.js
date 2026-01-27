import { useState } from 'react'
import Icons from '../ui/Icons'
import { formatRelative, ACTIVITY_TYPES } from '../../lib/utils'

const activityIcons = {
  email: Icons.mail,
  call: Icons.phone,
  meeting: Icons.calendar,
  note: Icons.note,
  task_completed: Icons.check,
  deal_updated: Icons.trending,
}

const activityColors = {
  email: 'bg-blue-100 text-blue-600',
  call: 'bg-green-100 text-green-600',
  meeting: 'bg-purple-100 text-purple-600',
  note: 'bg-yellow-100 text-yellow-600',
  task_completed: 'bg-gray-100 text-gray-600',
  deal_updated: 'bg-indigo-100 text-indigo-600',
}

export default function ActivityTimeline({ contactId, dealId, activities = [], onActivityAdded }) {
  const [isAdding, setIsAdding] = useState(false)
  const [newActivity, setNewActivity] = useState({
    type: 'note',
    subject: '',
    content: '',
    createFollowUp: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newActivity.subject.trim()) return

    setIsSubmitting(true)
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newActivity,
          contactId,
          dealId,
        }),
      })
      
      setNewActivity({ type: 'note', subject: '', content: '', createFollowUp: false })
      setIsAdding(false)
      onActivityAdded?.()
    } catch (error) {
      console.error('Error creating activity:', error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="p-4">
      {/* Quick add activity */}
      {!isAdding ? (
        <div className="flex gap-2 mb-6">
          {ACTIVITY_TYPES.slice(0, 4).map((type) => {
            const Icon = activityIcons[type.id]
            return (
              <button
                key={type.id}
                onClick={() => {
                  setNewActivity({ ...newActivity, type: type.id })
                  setIsAdding(true)
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            )
          })}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex gap-2 mb-3">
            {ACTIVITY_TYPES.slice(0, 4).map((type) => {
              const Icon = activityIcons[type.id]
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setNewActivity({ ...newActivity, type: type.id })}
                  className={`flex items-center gap-2 py-1.5 px-3 text-sm font-medium rounded-full transition-colors ${
                    newActivity.type === type.id
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </button>
              )
            })}
          </div>
          
          <input
            type="text"
            value={newActivity.subject}
            onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
            placeholder="Asunto (ej: Llamada de seguimiento)"
            className="input mb-2"
            autoFocus
          />
          
          <textarea
            value={newActivity.content}
            onChange={(e) => setNewActivity({ ...newActivity, content: e.target.value })}
            placeholder="Notas adicionales..."
            className="input resize-none mb-3"
            rows={3}
          />
          
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={newActivity.createFollowUp}
                onChange={(e) => setNewActivity({ ...newActivity, createFollowUp: e.target.checked })}
                className="rounded border-gray-300"
              />
              Crear tarea de seguimiento
            </label>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newActivity.subject.trim()}
                className="btn-primary btn-sm"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Icons.activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No hay actividad registrada</p>
          <p className="text-sm mt-1">Registra una llamada, email o nota para comenzar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type] || Icons.activity
            const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-600'
            
            return (
              <div key={activity.id} className="timeline-item">
                <div className={`timeline-dot ${colorClass}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="ml-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {activity.subject}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatRelative(activity.createdAt)}
                    </span>
                  </div>
                  {activity.content && (
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {activity.content}
                    </p>
                  )}
                  {activity.createdBy && (
                    <p className="text-xs text-gray-400 mt-1">
                      por {activity.createdBy}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
