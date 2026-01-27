import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import TaskList from '../components/tasks/TaskList'
import TaskForm from '../components/tasks/TaskForm'

export default function TasksPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleFormSave = useCallback((savedTask) => {
    setShowForm(false)
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleNewTask = useCallback(() => {
    setShowForm(true)
  }, [])

  // Listen for global add task event
  useEffect(() => {
    const handleAddTask = () => handleNewTask()
    window.addEventListener('add:task', handleAddTask)
    return () => window.removeEventListener('add:task', handleAddTask)
  }, [handleNewTask])

  return (
    <>
      <Head>
        <title>Tareas | CRM</title>
      </Head>

      <TaskList
        key={refreshKey}
        onNewTask={handleNewTask}
      />

      <TaskForm
        isOpen={showForm}
        onSave={handleFormSave}
        onClose={() => setShowForm(false)}
      />
    </>
  )
}
