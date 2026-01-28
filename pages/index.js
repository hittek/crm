import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import ContactList from '../components/contacts/ContactList'
import ContactDetail from '../components/contacts/ContactDetail'
import ContactForm from '../components/contacts/ContactForm'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        include: 'deals,tasks',
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      
      setContacts(data.contacts)
      setTotalPages(data.pagination.pages)
      
      // Select first contact if none selected (desktop only)
      // On mobile, we want to show the list first
      if (!selectedContact && data.contacts.length > 0 && window.innerWidth >= 1024) {
        setSelectedContact(data.contacts[0])
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
    setIsLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Sync selectedContact with URL query parameter
  useEffect(() => {
    const { id } = router.query
    if (id && contacts.length > 0) {
      const contactId = parseInt(id)
      const contact = contacts.find(c => c.id === contactId)
      if (contact) {
        setSelectedContact(contact)
      } else {
        // Contact not in current list, fetch it directly
        fetch(`/api/contacts/${contactId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) setSelectedContact(data)
          })
          .catch(() => {})
      }
    }
  }, [router.query, contacts])

  const handleContactSelect = useCallback((contact) => {
    setSelectedContact(contact)
    router.replace({ pathname: '/', query: contact ? { id: contact.id } : {} }, undefined, { shallow: true })
  }, [router])

  const handleContactUpdate = useCallback(async (updatedContact) => {
    // Update in list
    setContacts(prev => prev.map(c => 
      c.id === updatedContact.id ? { ...c, ...updatedContact } : c
    ))
    // Update selected
    if (selectedContact?.id === updatedContact.id) {
      setSelectedContact(prev => ({ ...prev, ...updatedContact }))
    }
    // Refresh list to ensure sync
    setRefreshKey(k => k + 1)
  }, [selectedContact])

  const handleContactDelete = useCallback(async () => {
    setSelectedContact(null)
    setRefreshKey(k => k + 1)
    fetchContacts()
  }, [fetchContacts])

  // Handle when ContactForm successfully saves a contact
  // ContactForm does the API call, this just updates local state
  const handleFormSubmit = useCallback((savedContact) => {
    if (editingContact) {
      handleContactUpdate(savedContact)
    } else {
      // New contact was created
      setContacts(prev => [savedContact, ...prev])
      setSelectedContact(savedContact)
      setRefreshKey(k => k + 1)
    }
    setShowForm(false)
    setEditingContact(null)
  }, [editingContact, handleContactUpdate])

  const handleNewContact = useCallback(() => {
    setEditingContact(null)
    setShowForm(true)
  }, [])

  // Listen for global add contact event
  useEffect(() => {
    const handleAddContact = () => handleNewContact()
    window.addEventListener('add:contact', handleAddContact)
    return () => window.removeEventListener('add:contact', handleAddContact)
  }, [handleNewContact])

  return (
    <>
      <Head>
        <title>Contactos | CRM</title>
      </Head>

      <div className="flex flex-col lg:flex-row h-full">
        {/* Left: Contact List */}
        <div className={`w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col ${selectedContact ? 'hidden lg:flex' : 'flex'}`}>
          <ContactList
            contacts={contacts}
            selectedId={selectedContact?.id}
            onSelect={handleContactSelect}
            onNewContact={handleNewContact}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            isLoading={isLoading}
            refreshKey={refreshKey}
          />
        </div>

        {/* Right: Contact Detail */}
        <div className={`flex-1 flex flex-col min-w-0 ${selectedContact ? 'flex' : 'hidden lg:flex'}`}>
          {isLoading && !selectedContact ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : selectedContact ? (
            <ContactDetail
              contactId={selectedContact.id}
              onUpdate={handleContactUpdate}
              onDelete={handleContactDelete}
              onClose={() => {
                setSelectedContact(null)
                router.replace({ pathname: '/' }, undefined, { shallow: true })
              }}
              onEdit={() => {
                setEditingContact(selectedContact)
                setShowForm(true)
              }}
              showBackButton={true}
            />
          ) : (
            <EmptyState
              variant="contacts"
              onAction={handleNewContact}
            />
          )}
        </div>
      </div>

      {/* Contact Form Modal */}
      {showForm && (
        <ContactForm
          isOpen={showForm}
          contact={editingContact}
          onSave={handleFormSubmit}
          onClose={() => {
            setShowForm(false)
            setEditingContact(null)
          }}
        />
      )}
    </>
  )
}
