import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import TaskList from '../components/tasks/TaskList'
import TaskForm from '../components/tasks/TaskForm'
import CalendarView from '../components/tasks/CalendarView'
import Icons from '../components/ui/Icons'
import { Drawer } from '../components/ui/Modal'
import { getFullName } from '../lib/utils'
import { useI18n } from '../lib/i18n'

export default function TasksPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [showForm, setShowForm]     = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [view, setView]             = useState('list') // 'list' | 'calendar'
  const [calendarTask, setCalendarTask] = useState(null) // task opened from calendar

  const handleFormSave = useCallback(() => {
    setShowForm(false)
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleNewTask = useCallback(() => {
    setShowForm(true)
  }, [])

  // Auto-open form when navigated here via quick-add (?new=task)
  useEffect(() => {
    if (router.query.new === 'task') {
      handleNewTask()
      router.replace({ pathname: '/tasks' }, undefined, { shallow: true })
    }
  }, [router.query.new, handleNewTask, router])

  // Listen for global add task event
  useEffect(() => {
    const handleAddTask = () => handleNewTask()
    window.addEventListener('add:task', handleAddTask)
    return () => window.removeEventListener('add:task', handleAddTask)
  }, [handleNewTask])

  return (
    <>
      <Head>
        <title>{t('tasks.title')} | CRM</title>
      </Head>

      {/* View toggle — rendered above whichever view is active */}
      <div className="flex items-center gap-1 px-4 lg:px-6 pt-3 pb-0 bg-white border-b border-transparent">
        <button
          onClick={() => setView('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            view === 'list'
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Icons.list className="w-4 h-4" />
          Lista
        </button>
        <button
          onClick={() => setView('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            view === 'calendar'
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Icons.calendar className="w-4 h-4" />
          Calendario
        </button>
      </div>

      {view === 'list' ? (
        <TaskList
          key={refreshKey}
          onNewTask={handleNewTask}
        />
      ) : (
        <CalendarView
          key={refreshKey}
          onNewTask={handleNewTask}
          onTaskSelect={(task) => setCalendarTask(task)}
        />
      )}

      {/* New task form */}
      <TaskForm
        isOpen={showForm}
        onSave={handleFormSave}
        onClose={() => setShowForm(false)}
      />

      {/* Task detail drawer opened from calendar */}
      {calendarTask && (
        <CalendarTaskDrawer
          task={calendarTask}
          onClose={() => setCalendarTask(null)}
          onUpdate={(updated) => {
            setCalendarTask(updated)
            setRefreshKey(k => k + 1)
          }}
          onDelete={() => {
            setCalendarTask(null)
            setRefreshKey(k => k + 1)
          }}
        />
      )}
    </>
  )
}

// ── Thin task detail drawer for calendar ─────────────────────────────────────

function CalendarTaskDrawer({ task, onClose, onUpdate, onDelete }) {
  const [local, setLocal]   = useState(task)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setLocal(task) }, [task])

  const updateField = async (field, value) => {
    setSaving(true)
    setLocal(prev => ({ ...prev, [field]: value }))
    try {
      const r = await fetch(`/api/tasks/${local.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [field]: value }),
      })
      const data = await r.json()
      onUpdate?.(data)
    } catch (e) {
      console.error(e)
      setLocal(task)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    await fetch(`/api/tasks/${local.id}`, { method: 'DELETE' })
    onDelete?.()
  }

  const TYPE_COLORS = {
    meeting: 'bg-purple-100 text-purple-700',
    call:    'bg-blue-100   text-blue-700',
    email:   'bg-cyan-100   text-cyan-700',
    task:    'bg-gray-100   text-gray-700',
  }

  return (
    <Drawer isOpen title="Detalle de tarea" onClose={onClose} width="md">
      <div className="space-y-5">
        {/* Title */}
        <input
          type="text"
          value={local.title}
          onChange={e => setLocal(p => ({ ...p, title: e.target.value }))}
          onBlur={e => updateField('title', e.target.value)}
          className="text-base font-semibold w-full border-0 p-0 focus:ring-0 text-gray-900"
        />

        {/* Type badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[local.type] || TYPE_COLORS.task}`}>
          {local.type === 'meeting' && <Icons.calendar className="w-3 h-3" />}
          {local.type === 'call'    && <Icons.phone    className="w-3 h-3" />}
          {local.type === 'email'   && <Icons.mail     className="w-3 h-3" />}
          {local.type === 'task'    && <Icons.tasks    className="w-3 h-3" />}
          <span className="capitalize">{local.type}</span>
        </span>

        {/* Status + Priority */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Estado</label>
            <select value={local.status} onChange={e => updateField('status', e.target.value)} className="input">
              <option value="pending">Pendiente</option>
              <option value="in-progress">En progreso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Prioridad</label>
            <select value={local.priority} onChange={e => updateField('priority', e.target.value)} className="input">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Fecha</label>
          <input
            type="date"
            value={local.dueDate ? new Date(local.dueDate).toISOString().split('T')[0] : ''}
            onChange={e => updateField('dueDate', e.target.value ? new Date(e.target.value) : null)}
            className="input"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Descripción</label>
          <textarea
            value={local.description || ''}
            onChange={e => setLocal(p => ({ ...p, description: e.target.value }))}
            onBlur={e => updateField('description', e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Agregar descripción…"
          />
        </div>

        {/* Related */}
        {(local.contact || local.deal) && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase block">Relacionado</label>
            {local.contact && (
              <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
                <Icons.user className="w-4 h-4 text-gray-400 shrink-0" />
                {getFullName(local.contact.firstName, local.contact.lastName)}
              </div>
            )}
            {local.deal && (
              <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
                <Icons.deals className="w-4 h-4 text-gray-400 shrink-0" />
                {local.deal.title}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {local.status !== 'completed' && (
            <button onClick={() => updateField('status', 'completed')} className="btn-success flex-1">
              <Icons.check className="w-4 h-4 mr-2" /> Marcar completada
            </button>
          )}
          <button onClick={handleDelete} className="btn-danger">
            <Icons.delete className="w-4 h-4" />
          </button>
        </div>

        {saving && <p className="text-xs text-center text-gray-400">Guardando…</p>}
      </div>
    </Drawer>
  )
}
