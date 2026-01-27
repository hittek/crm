import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Pipeline from '../components/deals/Pipeline'
import DealForm from '../components/deals/DealForm'

export default function DealsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleFormSubmit = useCallback(async (data) => {
    try {
      const url = editingDeal
        ? `/api/deals/${editingDeal.id}`
        : '/api/deals'

      const res = await fetch(url, {
        method: editingDeal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setShowForm(false)
        setEditingDeal(null)
        setRefreshKey(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error saving deal:', error)
    }
  }, [editingDeal])

  const handleNewDeal = useCallback(() => {
    setEditingDeal(null)
    setShowForm(true)
  }, [])

  // Listen for global add deal event
  useEffect(() => {
    const handleAddDeal = () => handleNewDeal()
    window.addEventListener('add:deal', handleAddDeal)
    return () => window.removeEventListener('add:deal', handleAddDeal)
  }, [handleNewDeal])

  return (
    <>
      <Head>
        <title>Pipeline | CRM</title>
      </Head>

      <div className="flex h-full">
        <Pipeline
          key={refreshKey}
          onNewDeal={handleNewDeal}
        />
      </div>

      {showForm && (
        <DealForm
          deal={editingDeal}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false)
            setEditingDeal(null)
          }}
        />
      )}
    </>
  )
}
