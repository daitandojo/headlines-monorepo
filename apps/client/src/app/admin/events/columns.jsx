// apps/client/src/app/admin/events/columns.jsx (MODIFIED with MultiSelect)
'use client'

import React, { useState, useCallback } from 'react'
import {
  Button,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTableColumnHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Label,
  Textarea,
  MultiSelect, // ACTION: Import MultiSelect
} from '@/components/shared'
import { Loader2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { RelationshipManager } from '@/components/admin/RelationshipManager'
import { toast } from 'sonner'
import { EditableCell } from '@/components/shared/elements/EditableCell'

const eventCategories = [
  'New Wealth',
  'Future Wealth',
  'Wealth Mentioned',
  'Legal/Dispute',
  'Background',
  'Other',
]

const FormField = ({ id, label, children }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-muted-foreground pl-1">
      {label}
    </Label>
    {children}
  </div>
)

export const EventListItem = ({
  event,
  onUpdate,
  onDelete,
  isExpanded,
  onDetailsNeeded,
  availableCountries, // ACTION: Accept the new prop
}) => {
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  const loadDetails = useCallback(async () => {
    if (event.details) return
    setIsLoadingDetails(true)
    try {
      await onDetailsNeeded(event._id)
    } catch (err) {
      toast.error('Failed to load event details', { description: err.message })
    } finally {
      setIsLoadingDetails(false)
    }
  }, [event, onDetailsNeeded])

  React.useEffect(() => {
    if (isExpanded && !event.details && !isLoadingDetails) {
      loadDetails()
    }
  }, [isExpanded, event.details, isLoadingDetails, loadDetails])

  return (
    <AccordionItem value={event._id} className="border-b border-white/10 group">
      <AccordionTrigger className="w-full text-left hover:bg-white/5 px-2 hover:no-underline">
        <div className="flex items-center w-full text-sm">
          <div className="w-[180px] flex-shrink-0 text-muted-foreground group-hover:text-foreground">
            {format(new Date(event.createdAt), 'dd MMM yyyy, HH:mm')}
          </div>
          <div className="w-[140px] flex-shrink-0">
            {(event.country || []).join(', ')}
          </div>
          <div className="w-[180px] flex-shrink-0">
            {event.eventClassification || 'N/A'}
          </div>
          <div className="w-[80px] text-center flex-shrink-0">
            {event.highest_relevance_score}
          </div>
          <div className="flex-grow min-w-0 pr-4 whitespace-normal font-medium">
            {event.synthesized_headline}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 bg-black/20">
        {isLoadingDetails ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : event.details ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>
                  View and edit the core synthesized data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Synthesized Headline">
                  <EditableCell
                    useTextarea={true}
                    initialValue={event.details.synthesized_headline}
                    onSave={(newValue) =>
                      onUpdate(event.details, { synthesized_headline: newValue })
                    }
                  />
                </FormField>

                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Country">
                    {/* ACTION: Replace EditableCell with MultiSelect */}
                    <MultiSelect
                      options={availableCountries}
                      selected={event.details.country || []}
                      onChange={(newCountries) =>
                        onUpdate(event.details, { country: newCountries.sort() })
                      }
                      placeholder="Select countries..."
                    />
                  </FormField>
                  <FormField label="Classification">
                    <Select
                      value={event.details.eventClassification}
                      onValueChange={(newValue) =>
                        onUpdate(event.details, { eventClassification: newValue })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {eventCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Relevance Score">
                    <EditableCell
                      initialValue={event.details.highest_relevance_score}
                      onSave={(newValue) =>
                        onUpdate(event.details, {
                          highest_relevance_score: Number(newValue),
                        })
                      }
                    />
                  </FormField>
                </div>

                <FormField label="Synthesized Summary">
                  <EditableCell
                    useTextarea={true}
                    initialValue={event.details.synthesized_summary}
                    onSave={(newValue) =>
                      onUpdate(event.details, { synthesized_summary: newValue })
                    }
                  />
                </FormField>
              </CardContent>
              <CardFooter>
                <Button variant="destructive" onClick={() => onDelete(event.details._id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Event
                </Button>
              </CardFooter>
            </Card>
            <RelationshipManager
              item={event.details}
              itemType="event"
              refetch={loadDetails}
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            Click to load details.
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

export const ListHeader = ({ sorting, setSorting }) => {
  const mockColumn = (id) => ({
    getCanSort: () => true,
    getIsSorted: () =>
      sorting.find((s) => s.id === id)?.desc
        ? 'desc'
        : sorting.find((s) => s.id === id)
          ? 'asc'
          : false,
    toggleSorting: (desc) => setSorting([{ id, desc }]),
    getCanFilter: () => false,
    getFilterValue: () => undefined,
    setFilterValue: () => {},
  })

  return (
    <div className="flex items-center p-2 border-b font-medium text-muted-foreground text-sm sticky top-0 bg-background z-10">
      <div className="w-[180px] flex-shrink-0">
        <DataTableColumnHeader column={mockColumn('createdAt')} title="Discovered" />
      </div>
      <div className="w-[140px] flex-shrink-0">
        <DataTableColumnHeader column={mockColumn('country')} title="Country" />
      </div>
      <div className="w-[180px] flex-shrink-0">
        <DataTableColumnHeader
          column={mockColumn('eventClassification')}
          title="Classification"
        />
      </div>
      <div className="w-[80px] flex-shrink-0 text-center">
        <DataTableColumnHeader
          column={mockColumn('highest_relevance_score')}
          title="Score"
        />
      </div>
      <div className="flex-grow min-w-0">
        <DataTableColumnHeader
          column={mockColumn('synthesized_headline')}
          title="Headline"
        />
      </div>
    </div>
  )
}
