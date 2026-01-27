import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Icons from '../ui/Icons'
import { Avatar } from '../ui/Avatar'
import { StatusChip } from '../ui/Chip'
import { formatCurrency, formatSmartDate } from '../../lib/utils'
import { useOrganization } from '../../lib/SettingsContext'

export default function GlobalSearch({ isOpen, onClose }) {
  const router = useRouter()
  const organization = useOrganization()
  const currency = organization?.currency || 'USD'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ contacts: [], deals: [], tasks: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setQuery('')
      setResults({ contacts: [], deals: [], tasks: [] })
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Search on query change
  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults({ contacts: [], deals: [], tasks: [] })
        return
      }

      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
        setSelectedIndex(0)
      } catch (error) {
        console.error('Search error:', error)
      }
      setIsLoading(false)
    }

    const debounce = setTimeout(search, 200)
    return () => clearTimeout(debounce)
  }, [query])

  // All results as flat array
  const allResults = [
    ...results.contacts.map(c => ({ ...c, type: 'contact' })),
    ...results.deals.map(d => ({ ...d, type: 'deal' })),
    ...results.tasks.map(t => ({ ...t, type: 'task' })),
  ]

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault()
      navigateToResult(allResults[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const navigateToResult = (result) => {
    onClose()
    if (result.type === 'contact') {
      router.push(`/?contact=${result.id}`)
    } else if (result.type === 'deal') {
      router.push(`/deals?deal=${result.id}`)
    } else if (result.type === 'task') {
      router.push(`/tasks?task=${result.id}`)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
      <div className="flex justify-center pt-24 px-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl">
          {/* Search input */}
          <div className="flex items-center px-4 border-b border-gray-200">
            <Icons.search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar contactos, oportunidades, tareas..."
              className="flex-1 px-4 py-4 text-base outline-none"
            />
            {isLoading && (
              <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-primary-600 rounded-full" />
            )}
            <kbd className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded border border-gray-200">
              ESC
            </kbd>
          </div>

          {/* Results */}
          {allResults.length > 0 && (
            <div className="max-h-96 overflow-y-auto py-2">
              {/* Contacts */}
              {results.contacts.length > 0 && (
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Contactos
                  </p>
                  {results.contacts.map((contact, index) => (
                    <button
                      key={contact.id}
                      onClick={() => navigateToResult({ ...contact, type: 'contact' })}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        allResults.findIndex(r => r.type === 'contact' && r.id === contact.id) === selectedIndex
                          ? 'bg-primary-50 text-primary-900'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <Avatar firstName={contact.firstName} lastName={contact.lastName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {contact.email} {contact.company && `• ${contact.company}`}
                        </p>
                      </div>
                      <Icons.chevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}

              {/* Deals */}
              {results.deals.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Oportunidades
                  </p>
                  {results.deals.map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => navigateToResult({ ...deal, type: 'deal' })}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        allResults.findIndex(r => r.type === 'deal' && r.id === deal.id) === selectedIndex
                          ? 'bg-primary-50 text-primary-900'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Icons.deals className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{deal.title}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {formatCurrency(deal.value, currency)} • {deal.contact?.firstName} {deal.contact?.lastName}
                        </p>
                      </div>
                      <StatusChip status={deal.stage} />
                    </button>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Tareas
                  </p>
                  {results.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => navigateToResult({ ...task, type: 'task' })}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                        allResults.findIndex(r => r.type === 'task' && r.id === task.id) === selectedIndex
                          ? 'bg-primary-50 text-primary-900'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Icons.tasks className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-gray-500">
                          {task.dueDate ? formatSmartDate(task.dueDate) : 'Sin fecha'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {query.length >= 2 && allResults.length === 0 && !isLoading && (
            <div className="py-12 text-center">
              <Icons.search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron resultados para "{query}"</p>
            </div>
          )}

          {/* Hints */}
          {query.length < 2 && (
            <div className="py-8 px-4 text-center">
              <p className="text-sm text-gray-500 mb-4">
                Busca por nombre, email, empresa o ID de oportunidad
              </p>
              <div className="flex justify-center gap-4 text-xs text-gray-400">
                <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑↓</kbd> navegar</span>
                <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↵</kbd> seleccionar</span>
                <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">esc</kbd> cerrar</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
