import { useState, useEffect, useCallback } from 'react'
import Icons from '../ui/Icons'
import { Avatar } from '../ui/Avatar'
import { StatusChip } from '../ui/Chip'
import { Spinner } from '../ui/Spinner'
import { ContactsEmptyState } from '../ui/EmptyState'
import { getFullName } from '../../lib/utils'

export default function ContactList({ 
  selectedId, 
  onSelect, 
  onNewContact,
  searchQuery = '',
  statusFilter = '' 
}) {
  const [contacts, setContacts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 })

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 50,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      })
      
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts || data.data || [])
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
    setIsLoading(false)
  }, [pagination.page, searchQuery, statusFilter])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  if (isLoading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (contacts.length === 0) {
    return <ContactsEmptyState onAdd={onNewContact} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* List header with count and add button */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {pagination.total} contacto{pagination.total !== 1 ? 's' : ''}
        </p>
        <button
          onClick={onNewContact}
          className="btn-primary btn-sm"
          title="Nuevo contacto"
        >
          <Icons.add className="w-4 h-4 mr-1" />
          Nuevo
        </button>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onSelect(contact)}
            className={`w-full flex items-center gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
              selectedId === contact.id ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''
            }`}
          >
            <Avatar 
              firstName={contact.firstName} 
              lastName={contact.lastName}
              src={contact.avatar}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getFullName(contact.firstName, contact.lastName)}
                </p>
                {contact.status !== 'active' && (
                  <StatusChip status={contact.status} />
                )}
              </div>
              {contact.role && contact.company ? (
                <p className="text-xs text-gray-500 truncate">
                  {contact.role} en {contact.company}
                </p>
              ) : (
                <p className="text-xs text-gray-500 truncate">
                  {contact.email || contact.company || 'Sin información'}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {contact._count && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {contact._count.deals > 0 && (
                    <span className="flex items-center gap-1">
                      <Icons.deals className="w-3 h-3" />
                      {contact._count.deals}
                    </span>
                  )}
                  {contact._count.tasks > 0 && (
                    <span className="flex items-center gap-1">
                      <Icons.tasks className="w-3 h-3" />
                      {contact._count.tasks}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            disabled={pagination.page === 1}
            className="btn-ghost btn-sm disabled:opacity-50"
          >
            <Icons.chevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Página {pagination.page} de {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page === pagination.pages}
            className="btn-ghost btn-sm disabled:opacity-50"
          >
            <Icons.chevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
