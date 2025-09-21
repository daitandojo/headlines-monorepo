// apps/admin/src/app/(protected)/countries/country-editor.jsx (version 2.0.1)
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Button,
  CardFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@headlines/ui'
import { toast } from 'sonner'
import { Save, Loader2, PlusCircle, X } from 'lucide-react'
import { createCountry, updateCountry } from '@/lib/api-client'

const FormField = ({ id, label, children }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-muted-foreground pl-1">
      {label}
    </Label>
    {children}
  </div>
)

export default function CountryEditor({ country, onSave, onCancel }) {
  const [formData, setFormData] = useState(country)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setFormData(country)
    setIsDirty(false)
  }, [country])

  if (!country) return null
  const isNew = !formData._id
  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = isNew
        ? await createCountry(formData)
        : await updateCountry(country._id, formData)
      if (result.error) throw new Error(result.error)
      const savedCountry = result.country
      onSave(savedCountry)
      toast.success(`Country "${savedCountry.name}" ${isNew ? 'created' : 'updated'}.`)
    } catch (error) {
      toast.error(`Error saving country: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
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
            {isNew && <PlusCircle />}
            {isNew ? 'Create New Country' : 'Edit Country'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew ? 'Add a new country to the system.' : formData.name}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto p-6 space-y-6">
        <FormField id="name" label="Country Name">
          <Input
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </FormField>
        <FormField id="isoCode" label="2-Letter ISO Code">
          <Input
            value={formData.isoCode || ''}
            onChange={(e) => handleChange('isoCode', e.target.value.toUpperCase())}
            maxLength={2}
          />
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
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
