import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import Icons from '../ui/Icons'
import { parseNaturalDate, getFullName } from '../../lib/utils'
import { useI18n } from '../../lib/i18n'
import { useTaskTypes } from '../../lib/SettingsContext'

export default function TaskForm({ isOpen, onClose, onSave, task = null, contactId = null, dealId = null }) {
  const { t } = useI18n()
  const taskTypes = useTaskTypes()
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
  const [contacts, setContacts] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const [loadingContacts, setLoadingContacts] = useState(false)

  // Derive whether the selected type requires a contact / maps link
  const selectedTypeObj = taskTypes.find(t => t.id === formData.type)
  const requiresContact = selectedTypeObj?.requiresContact
  const showMapsLink    = selectedTypeObj?.showMapsLink

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

  // Fetch contacts for search (debounced)
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(async () => {
      setLoadingContacts(true)
      try {
        const q = contactSearch ? `&search=${encodeURIComponent(contactSearch)}` : ''
        const res = await fetch(`/api/contacts?limit=20${q}`)
        const data = await res.json()
        setContacts(data.contacts || [])
      } catch (e) { console.error('contact search:', e) }
      setLoadingContacts(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [isOpen, contactSearch])

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) {
      newErrors.title = t('errors.validationError')
    }
    if (requiresContact && !formData.contactId) {
      newErrors.contactId = t('tasks.contactRequired')
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
      setErrors({ submit: t('errors.generic') })
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
      title={task ? t('tasks.editTask') : t('tasks.newTask')}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.taskTitle')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder={t('tasks.titlePlaceholder')}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {t('tasks.titleTip')}
            </p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.type')}
            </label>
            <div className="flex flex-wrap gap-2">
              {taskTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleChange('type', type.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors text-sm ${
                    formData.type === type.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>{type.emoji}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact picker — shown always, but required when type.requiresContact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.relatedContact')} {requiresContact && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={contactSearch}
              onChange={e => { setContactSearch(e.target.value); if (!e.target.value) handleChange('contactId', '') }}
              placeholder={t('tasks.searchContact')}
              className="input"
            />
            {loadingContacts && <p className="text-xs text-gray-400 mt-1">{t('tasks.searching')}</p>}
            {contacts.length > 0 && contactSearch && (
              <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto divide-y divide-gray-50 shadow-sm">
                {contacts.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      handleChange('contactId', c.id)
                      setContactSearch(getFullName(c.firstName, c.lastName))
                      setContacts([])
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      formData.contactId === c.id ? 'bg-primary-50 text-primary-700' : ''
                    }`}
                  >
                    <span className="font-medium">{getFullName(c.firstName, c.lastName)}</span>
                    {c.company && <span className="text-gray-400 ml-1.5 text-xs">{c.company}</span>}
                  </button>
                ))}
              </div>
            )}
            {formData.contactId && (
              <div className="flex items-center justify-between mt-1 px-2 py-1 bg-primary-50 rounded text-xs text-primary-700">
                <span>{t('tasks.contactLinked')}</span>
                <button type="button" onClick={() => { handleChange('contactId', ''); setContactSearch('') }}
                  className="text-primary-400 hover:text-primary-600">✕</button>
              </div>
            )}
            {errors.contactId && <p className="text-xs text-red-500 mt-1">{errors.contactId}</p>}
          </div>

          {/* Due date and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.dueDate')}
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
                {t('tasks.priority')}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="input"
              >
                <option value="low">{t('tasks.priorities.low')}</option>
                <option value="medium">{t('tasks.priorities.medium')}</option>
                <option value="high">{t('tasks.priorities.high')}</option>
              </select>
            </div>
          </div>

          {/* Assigned To and Visibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.assignTo')}
              </label>
              <select
                value={formData.assignedToId}
                onChange={(e) => handleChange('assignedToId', e.target.value)}
                className="input"
                disabled={loadingUsers}
              >
                <option value="">{t('tasks.unassigned')}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.visibility')}
              </label>
              <select
                value={formData.visibility}
                onChange={(e) => handleChange('visibility', e.target.value)}
                className="input"
              >
                <option value="org">{t('tasks.visibilityOrg')}</option>
                <option value="assignee">{t('tasks.visibilityAssignee')}</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder={t('tasks.descriptionPlaceholder')}
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
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? t('common.saving') : task ? t('common.save') : t('tasks.newTask')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
