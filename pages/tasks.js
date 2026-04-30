import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import TaskList from '../components/tasks/TaskList'
import TaskForm from '../components/tasks/TaskForm'

export default function TasksPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleFormSave = useCallback((savedTask) => {
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
