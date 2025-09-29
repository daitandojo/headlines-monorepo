'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input, Textarea } from '@/components/shared'
import { Edit } from 'lucide-react'

export const EditableCell = ({
  initialValue,
  onSave,
  placeholder = 'N/A',
  useTextarea = false, // Add this prop back if needed for headlines
}) => {
  const [isEditing, setIsEditing] = useState(false)
  // Handle case where initialValue is null or undefined
  const [value, setValue] = useState(initialValue ?? '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleSave = () => {
    // Only save if the value has actually changed
    if (String(value).trim() !== String(initialValue ?? '').trim()) {
      onSave(String(value).trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !useTextarea) {
      handleSave()
    } else if (e.key === 'Escape') {
      setValue(initialValue ?? '')
      setIsEditing(false)
    }
  }

  if (isEditing) {
    const Component = useTextarea ? Textarea : Input // Allow Textarea again
    return (
      <Component
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-7 text-xs p-1 bg-secondary border-primary/50"
      />
    )
  }

  // --- START OF THE FIX for displaying '0' ---
  // Check if initialValue is null or undefined, not just falsy
  const displayValue = initialValue ?? null
  // --- END OF THE FIX ---

  return (
    <div
      className="group flex items-center cursor-pointer p-1 -m-1 rounded-md hover:bg-secondary/50 min-h-[28px]"
      onClick={() => setIsEditing(true)}
    >
      <span className="truncate">
        {displayValue !== null ? (
          displayValue
        ) : (
          <span className="text-muted-foreground italic">{placeholder}</span>
        )}
      </span>
      <Edit className="h-3 w-3 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
    </div>
  )
}
