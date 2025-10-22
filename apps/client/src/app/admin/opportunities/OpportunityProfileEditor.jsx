// apps/client/src/app/admin/opportunities/OpportunityProfileEditor.jsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  CardFooter,
  Input,
  Label,
  Textarea,
  Separator,
  ScrollArea,
} from '@/components/shared'
import { toast } from 'sonner'
import { Save, Loader2, X, User, DollarSign, Briefcase, Info } from 'lucide-react'
import { updateOpportunityAction } from './actions'

const FormField = ({ id, label, children, description }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">
      {label}
    </Label>
    {children}
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
  </div>
)

const ArrayField = ({ id, label, value = [], onChange }) => (
  <FormField id={id} label={label}>
    <Textarea
      value={value.join('\n')}
      onChange={(e) => onChange(id, e.target.value.split('\n').filter(Boolean))}
      placeholder={`One item per line...`}
      rows={3}
    />
  </FormField>
)

async function fetchOpportunity(opportunityId) {
  const res = await fetch(`/api/opportunities/${opportunityId}`)
  if (!res.ok) throw new Error('Failed to fetch opportunity details')
  const result = await res.json()
  return result.data
}

export default function OpportunityProfileEditor({ opportunityId, onSave, onCancel }) {
  const { data: initialData, isLoading: isLoadingData } = useQuery({
    queryKey: ['opportunity-details', opportunityId],
    queryFn: () => fetchOpportunity(opportunityId),
    enabled: !!opportunityId,
  })

  const [formData, setFormData] = useState(initialData || {})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  if (!formData?._id) return <div className="p-8 text-center">Opportunity not found.</div>

  const handleChange = (key, value) => {
    const keys = key.split('.')
    setFormData((prev) => {
      const newData = { ...prev }
      let current = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = current[keys[i]] || {}
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateOpportunityAction(opportunityId, formData)
    if (result.success) {
      toast.success('Opportunity profile updated.')
      onSave()
    } else {
      toast.error('Update failed', { description: result.error })
    }
    setIsSaving(false)
  }

  const profile = formData.profile || {}

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="flex justify-between items-center flex-shrink-0 p-4 border-b">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <User />
            Edit Profile: {formData.reachOutTo}
          </h1>
          <p className="text-sm text-muted-foreground">
            Fine-tune the intelligence profile for this opportunity.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-6 space-y-6">
          <section className="space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Briefcase /> Core Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" id="reachOutTo">
                <Input
                  value={formData.reachOutTo || ''}
                  onChange={(e) => handleChange('reachOutTo', e.target.value)}
                />
              </FormField>
              <FormField label="Profile Photo URL" id="profile.profilePhotoUrl">
                <Input
                  value={profile.profilePhotoUrl || ''}
                  onChange={(e) =>
                    handleChange('profile.profilePhotoUrl', e.target.value)
                  }
                  placeholder="https://..."
                />
              </FormField>
              <FormField label="Year of Birth" id="profile.yearOfBirth">
                <Input
                  type="number"
                  value={profile.yearOfBirth || ''}
                  onChange={(e) =>
                    handleChange('profile.yearOfBirth', Number(e.target.value))
                  }
                />
              </FormField>
              <FormField label="Based In (Countries)" id="basedIn">
                <Input
                  value={(Array.isArray(formData.basedIn)
                    ? formData.basedIn
                    : [formData.basedIn]
                  )
                    .filter(Boolean)
                    .join(', ')}
                  onChange={(e) =>
                    handleChange(
                      'basedIn',
                      e.target.value.split(',').map((s) => s.trim())
                    )
                  }
                />
              </FormField>
            </div>
            <FormField label="Biography" id="profile.biography">
              <Textarea
                value={profile.biography || ''}
                onChange={(e) => handleChange('profile.biography', e.target.value)}
                rows={4}
              />
            </FormField>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign /> Financial Profile
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Est. Net Worth ($M)" id="profile.estimatedNetWorthMM">
                <Input
                  type="number"
                  value={profile.estimatedNetWorthMM || ''}
                  onChange={(e) =>
                    handleChange('profile.estimatedNetWorthMM', Number(e.target.value))
                  }
                />
              </FormField>
              <FormField label="Wealth Origin" id="profile.wealthOrigin">
                <Input
                  value={profile.wealthOrigin || ''}
                  onChange={(e) => handleChange('profile.wealthOrigin', e.target.value)}
                />
              </FormField>
              <FormField label="Family Office Name" id="profile.familyOffice.name">
                <Input
                  value={profile.familyOffice?.name || ''}
                  onChange={(e) =>
                    handleChange('profile.familyOffice.name', e.target.value)
                  }
                />
              </FormField>
              <FormField label="Family Officer" id="profile.familyOffice.officer">
                <Input
                  value={profile.familyOffice?.officer || ''}
                  onChange={(e) =>
                    handleChange('profile.familyOffice.officer', e.target.value)
                  }
                />
              </FormField>
            </div>
            <FormField label="Asset Allocation Notes" id="profile.assetAllocation">
              <Textarea
                value={profile.assetAllocation || ''}
                onChange={(e) => handleChange('profile.assetAllocation', e.target.value)}
                rows={2}
              />
            </FormField>
            <ArrayField
              id="investmentInterests"
              label="Investment Interests"
              value={profile.investmentInterests}
              onChange={handleChange}
            />
            <ArrayField
              id="directInvestments"
              label="Direct Investments Held"
              value={profile.directInvestments}
              onChange={handleChange}
            />
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Info /> Personal Details
            </h2>
            <ArrayField
              id="philanthropicInterests"
              label="Philanthropic Interests"
              value={profile.philanthropicInterests}
              onChange={handleChange}
            />
            <ArrayField
              id="hobbies"
              label="Hobbies"
              value={profile.hobbies}
              onChange={handleChange}
            />
            <ArrayField
              id="specialInterests"
              label="Special Interests"
              value={profile.specialInterests}
              onChange={handleChange}
            />
            <ArrayField
              id="children"
              label="Children"
              value={profile.children}
              onChange={handleChange}
            />
          </section>
        </div>
      </ScrollArea>

      <CardFooter className="mt-auto border-t p-4 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </CardFooter>
    </div>
  )
}
