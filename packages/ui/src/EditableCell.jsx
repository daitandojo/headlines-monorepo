// packages/ui/src/EditableCell.jsx (version 1.0.0)
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from './components/input'
import { Textarea } from './components/textarea'
import { Edit } from 'lucide-react'
import { cn } from '@headlines/utils-client'

export const EditableCell = ({
  initialValue,
  onSave,
  placeholder = 'N/A',
  type = 'text',
  allowWrap = false,
  useTextarea = false,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  // DEFINITIVE FIX: Handle both array and primitive initial values.
  const [value, setValue] = useState(
    Array.isArray(initialValue) ? initialValue.join('\n') : initialValue || ''
  )
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)

  const handleSave = () => {
    // DEFINITIVE FIX: Correctly format the final value based on the initial data type.
    const finalValue = Array.isArray(initialValue)
      ? value
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      : type === 'number'
        ? value
          ? Number(value)
          : null
        : value.trim()

    const originalValue =
      initialValue || (Array.isArray(initialValue) ? [] : type === 'number' ? null : '')

    // A more robust change check for arrays and strings/numbers
    if (JSON.stringify(finalValue) !== JSON.stringify(originalValue)) {
      onSave(finalValue)
    }
    setIsEditing(false)
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        if (isEditing) {
          handleSave()
        }
      }
    }

    if (isEditing) {
      inputRef.current?.focus()
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isEditing, value]) // value is needed to ensure handleSave has the latest state

  if (isEditing) {
    const Component = useTextarea ? Textarea : Input
    return (
      <div ref={wrapperRef}>
        <Component
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !useTextarea) handleSave()
          }}
          className="h-auto bg-secondary"
          rows={useTextarea ? 3 : 1}
        />
      </div>
    )
  }

  // DEFINITIVE FIX: Correctly generate the display value from an array or primitive.
  let displayValue = Array.isArray(initialValue) ? initialValue.join(' ') : initialValue
  if (type === 'number' && initialValue) displayValue = `$${initialValue}M`
  if (!displayValue || (Array.isArray(initialValue) && initialValue.length === 0)) {
    displayValue = <span className="text-muted-foreground italic">{placeholder}</span>
  }

  return (
    <div
      className="group flex items-center cursor-pointer p-2 -m-2 rounded-md hover:bg-secondary/50"
      onClick={() => setIsEditing(true)}
    >
      <span className={cn(!allowWrap && 'truncate', allowWrap && 'whitespace-normal')}>
        {displayValue}
      </span>
      <Edit className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
    </div>
  )
}
