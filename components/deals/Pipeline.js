import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Icons from '../ui/Icons'
import { StatusChip } from '../ui/Chip'
import { Avatar } from '../ui/Avatar'
import { Drawer } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { DealsEmptyState } from '../ui/EmptyState'
import DealDrawer from './DealDrawer'
import { formatCurrency, formatSmartDate } from '../../lib/utils'
import { useDealStages, useOrganization } from '../../lib/SettingsContext'

export default function Pipeline({ onNewDeal }) {
  const router = useRouter()
  const dealStages = useDealStages()
  const organization = useOrganization()
  const currency = organization?.currency || 'USD'
  const [deals, setDeals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [draggingDeal, setDraggingDeal] = useState(null)

  const fetchDeals = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/deals?limit=100&sortBy=updatedAt&sortOrder=desc')
      const data = await res.json()
      setDeals(data.data)
    } catch (error) {
      console.error('Error fetching deals:', error)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  // Sync selectedDeal with URL query parameter
  useEffect(() => {
    const { id } = router.query
    if (id && deals.length > 0) {
      const dealId = parseInt(id)
      const deal = deals.find(d => d.id === dealId)
      if (deal) {
        setSelectedDeal(deal)
      } else {
        // Deal not in current list, fetch it directly
        fetch(`/api/deals/${dealId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) setSelectedDeal(data)
          })
          .catch(() => {})
      }
    }
  }, [router.query, deals])

  const handleDealSelect = useCallback((deal) => {
    setSelectedDeal(deal)
    router.replace({ pathname: '/deals', query: deal ? { id: deal.id } : {} }, undefined, { shallow: true })
  }, [router])

  const handleDealClose = useCallback(() => {
    setSelectedDeal(null)
    router.replace({ pathname: '/deals' }, undefined, { shallow: true })
  }, [router])

  const handleDragStart = (e, deal) => {
    setDraggingDeal(deal)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, stage) => {
    e.preventDefault()
    if (!draggingDeal || draggingDeal.stage === stage) {
      setDraggingDeal(null)
      return
    }

    // Optimistic update
    setDeals(prev => prev.map(d => 
      d.id === draggingDeal.id ? { ...d, stage } : d
    ))

    try {
      await fetch(`/api/deals/${draggingDeal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
    } catch (error) {
      console.error('Error updating deal:', error)
      fetchDeals() // Revert on error
    }
    
    setDraggingDeal(null)
  }

  const getStageDeals = (stageId) => {
    return deals.filter(d => d.stage === stageId)
  }

  const getStageTotal = (stageId) => {
    return getStageDeals(stageId).reduce((acc, d) => acc + d.value, 0)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (deals.length === 0) {
    return <DealsEmptyState onAdd={onNewDeal} />
  }

  // Filter out won/lost for main board
  const activeStages = dealStages.filter(s => !['won', 'lost'].includes(s.id))

  return (
    <>
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 min-w-max">
          {activeStages.map((stage) => {
            const stageDeals = getStageDeals(stage.id)
            const stageTotal = getStageTotal(stage.id)
            
            return (
              <div
                key={stage.id}
                className="kanban-column p-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{stage.label}</h3>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatCurrency(stageTotal, currency)}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                      onClick={() => handleDealSelect(deal)}
                      className={`kanban-card ${draggingDeal?.id === deal.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate pr-2">
                          {deal.title}
                        </h4>
                        <button 
                          className="text-gray-400 hover:text-gray-600"
                          onClick={(e) => { e.stopPropagation(); handleDealSelect(deal) }}
                        >
                          <Icons.more className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <p className="text-lg font-semibold text-gray-900 mb-2">
                        {formatCurrency(deal.value, currency)}
                      </p>

                      {deal.contact && (
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar 
                            firstName={deal.contact.firstName}
                            lastName={deal.contact.lastName}
                            size="xs"
                          />
                          <span className="text-xs text-gray-600 truncate">
                            {deal.contact.firstName} {deal.contact.lastName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        {deal.expectedClose && (
                          <span className="flex items-center gap-1">
                            <Icons.calendar className="w-3 h-3" />
                            {formatSmartDate(deal.expectedClose)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: `hsl(${deal.probability * 1.2}, 70%, 50%)` }}
                          />
                          {deal.probability}%
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Add card button */}
                  <button
                    onClick={onNewDeal}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Icons.add className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
              </div>
            )
          })}

          {/* Won/Lost columns (collapsed) */}
          <div className="flex flex-col gap-4 min-w-[200px]">
            {['won', 'lost'].map((stageId) => {
              const stage = dealStages.find(s => s.id === stageId)
              const stageDeals = getStageDeals(stageId)
              const stageTotal = getStageTotal(stageId)
              
              return (
                <div
                  key={stageId}
                  className={`p-3 rounded-lg ${stageId === 'won' ? 'bg-green-50' : 'bg-red-50'}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stageId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusChip status={stageId} />
                      <span className="text-xs text-gray-500">{stageDeals.length}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(stageTotal, currency)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Deal drawer */}
      <DealDrawer
        deal={selectedDeal}
        isOpen={!!selectedDeal}
        onClose={handleDealClose}
        onUpdate={(updated) => {
          setDeals(prev => prev.map(d => d.id === updated.id ? updated : d))
          setSelectedDeal(updated)
        }}
        onDelete={(id) => {
          setDeals(prev => prev.filter(d => d.id !== id))
          handleDealClose()
        }}
      />
    </>
  )
}
