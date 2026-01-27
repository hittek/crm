import { useState, useRef, useEffect } from 'react'

export function InlineEdit({ value, onSave, placeholder, type = 'text', className = '' }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(value || '')
  }, [value])

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(value || '')
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`input-inline w-full ${className}`}
        placeholder={placeholder}
      />
    )
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded -mx-2 ${!value ? 'text-gray-400 italic' : ''} ${className}`}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setIsEditing(true)}
      role="button"
      aria-label={`Edit ${placeholder || 'field'}`}
    >
      {value || placeholder || 'Click to edit'}
    </span>
  )
}

export function InlineTextarea({ value, onSave, placeholder, rows = 3, className = '' }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(value || '')
  }, [value])

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditValue(value || '')
      setIsEditing(false)
    }
    // Allow Cmd/Ctrl + Enter to save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave()
    }
  }

  if (isEditing) {
    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`input w-full resize-none ${className}`}
          placeholder={placeholder}
          rows={rows}
        />
        <span className="absolute bottom-2 right-2 text-xs text-gray-400">
          ⌘↵ para guardar
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-gray-100 p-2 rounded whitespace-pre-wrap ${!value ? 'text-gray-400 italic' : ''} ${className}`}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setIsEditing(true)}
      role="button"
      aria-label={`Edit ${placeholder || 'text'}`}
    >
      {value || placeholder || 'Click to add note...'}
    </div>
  )
}
