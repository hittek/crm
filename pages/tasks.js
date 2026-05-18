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
import { useTaskTypes } from '../lib/SettingsContext'

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
          {t('tasks.listView')}
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
          {t('tasks.calendarView')}
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
  const { t } = useI18n()
  const taskTypes = useTaskTypes()

  const typeObj      = taskTypes.find(tp => tp.id === local?.type)
  const showMapsLink = typeObj?.showMapsLink

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
    <Drawer isOpen title={t('tasks.taskDetail')} onClose={onClose} width="md">
      <div className="space-y-5">
        {/* Title */}
        <input
          type="text"
          value={local.title}
          onChange={e => setLocal(p => ({ ...p, title: e.target.value }))}
          onBlur={e => updateField('title', e.target.value)}
          className="text-base font-semibold w-full border-0 p-0 focus:ring-0 text-gray-900"
        />

        {/* Type badge — shows emoji + label from settings */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[local.type] || 'bg-gray-100 text-gray-700'}`}>
          <span>{typeObj?.emoji || '✅'}</span>
          <span>{typeObj?.label || local.type}</span>
        </span>

        {/* Status + Priority */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase block mb-1">{t('tasks.statusLabel')}</label>
            <select value={local.status} onChange={e => updateField('status', e.target.value)} className="input">
              <option value="pending">{t('tasks.status.pending')}</option>
              <option value="in-progress">{t('tasks.status.inProgress')}</option>
              <option value="completed">{t('tasks.status.completed')}</option>
              <option value="cancelled">{t('tasks.status.cancelled')}</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase block mb-1">{t('tasks.priority')}</label>
            <select value={local.priority} onChange={e => updateField('priority', e.target.value)} className="input">
              <option value="low">{t('tasks.priorities.low')}</option>
              <option value="medium">{t('tasks.priorities.medium')}</option>
              <option value="high">{t('tasks.priorities.high')}</option>
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase block mb-1">{t('tasks.dueDate')}</label>
          <input
            type="date"
            value={local.dueDate ? new Date(local.dueDate).toISOString().split('T')[0] : ''}
            onChange={e => updateField('dueDate', e.target.value ? new Date(e.target.value) : null)}
            className="input"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase block mb-1">{t('tasks.description')}</label>
          <textarea
            value={local.description || ''}
            onChange={e => setLocal(p => ({ ...p, description: e.target.value }))}
            onBlur={e => updateField('description', e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder={t('tasks.descriptionPlaceholderShort')}
          />
        </div>

        {/* Google Maps link — when type.showMapsLink and contact has address */}
        {showMapsLink && local.contact && (() => {
          const c = local.contact
          const addr = [c.address, c.city, c.state, c.country].filter(Boolean).join(', ')
          if (!addr) return null
          return (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase block mb-1">{t('tasks.address')}</label>
              <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm text-blue-800 flex-1 truncate">{addr}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                >
                  <Icons.external className="w-3.5 h-3.5" />
                  {t('tasks.openInMaps')}
                </a>
              </div>
            </div>
          )
        })()}

        {/* Related contact / deal */}
        {(local.contact || local.deal) && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase block">{t('tasks.related')}</label>
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
              <Icons.check className="w-4 h-4 mr-2" /> {t('tasks.markComplete')}
            </button>
          )}
          <button onClick={handleDelete} className="btn-danger">
            <Icons.delete className="w-4 h-4" />
          </button>
        </div>

        {saving && <p className="text-xs text-center text-gray-400">{t('common.saving')}</p>}
      </div>
    </Drawer>
  )
}
