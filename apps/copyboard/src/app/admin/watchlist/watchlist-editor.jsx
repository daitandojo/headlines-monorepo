'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Button,
  CardFooter,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared'
import { toast } from 'sonner'
import { Save, Loader2, PlusCircle, X, Sparkles } from 'lucide-react'
import { createEntityAction, updateEntityAction } from './actions'
// NOTE: AI enrichment features are part of ai-services and would need separate client-side API routes or actions if needed here.
// For now, we will omit them to keep the port clean.

const FormField = ({ id, label, children }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-muted-foreground pl-1">
      {label}
    </Label>
    {children}
  </div>
)

export default function WatchlistEditor({ entity, onSave, onCancel, countries = [] }) {
  const [formData, setFormData] = useState(entity)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setFormData(entity)
    setIsDirty(false)
  }, [entity])

  if (!entity) return null

  const isNewEntity = !entity._id

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const action = isNewEntity
      ? createEntityAction
      : (data) => updateEntityAction(entity._id, data)

    const result = await action(formData)

    if (result.success) {
      toast.success(
        `Entity "${result.entity.name}" ${isNewEntity ? 'created' : 'updated'}.`
      )
      onSave(result.entity)
    } else {
      toast.error(`Error saving entity: ${result.error}`)
    }
    setIsSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      <div className="flex justify-between items-center flex-shrink-0 p-6 border-b border-white/10">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {isNewEntity && <PlusCircle />}
            {isNewEntity ? 'Create New Entity' : 'Edit Entity'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNewEntity ? 'Add a new target to the watchlist.' : formData.name}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto p-6 space-y-6">
        <FormField id="name" label="Name">
          <Input
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Type">
            <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="person">Person</SelectItem>
                <SelectItem value="family">Family</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select
              value={formData.status}
              onValueChange={(v) => handleChange('status', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candidate">Candidate</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <FormField id="context" label="Context / AKA">
          <Input
            value={formData.context || ''}
            onChange={(e) => handleChange('context', e.target.value)}
            placeholder="e.g., The Lego Family"
          />
        </FormField>
        <FormField id="searchTerms" label="Search Terms (comma-separated)">
          <Textarea
            value={(formData.searchTerms || []).join(', ')}
            onChange={(e) =>
              handleChange(
                'searchTerms',
                e.target.value.split(',').map((s) => s.trim().toLowerCase())
              )
            }
            placeholder="e.g., hanni, kasprzak, ecco"
          />
        </FormField>
      </div>
      <CardFooter className="mt-auto border-t border-white/10 p-6 flex justify-end">
        <Button onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardFooter>
    </motion.div>
  )
}
