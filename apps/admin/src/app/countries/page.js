// src/app/countries/page.js (version 1.4.1)
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ServerCrash, PlusCircle, ChevronsRight } from 'lucide-react'
import { PageHeader, SheetHeader, SheetTitle, SheetDescription } from '@headlines/ui/src/index.js'
import { useEntityManager } from '@/hooks/use-entity-manager'
import { Button } from '@headlines/ui/src/index.js'
import { Sheet, SheetContent } from '@headlines/ui/src/index.js'
import { columns } from './columns'
import { DataTable } from '@headlines/ui/src/index.js'
import CountryEditor from './country-editor'

export default function CountriesPage() {
  const {
    entities: countries,
    isLoading,
    error,
    handleSave,
  } = useEntityManager('/api/countries', 'Country', 'name')

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const handleEdit = (id) => {
    setSelectedId(id)
    setIsEditorOpen(true)
  }

  const handleAdd = () => {
    setSelectedId('new')
    setIsEditorOpen(true)
  }

  const activeCountryData = useMemo(() => {
    if (selectedId === 'new') {
      return { _id: null, name: '', isoCode: '', status: 'active' }
    }
    return countries?.find((c) => c._id === selectedId) || null
  }, [selectedId, countries])

  const columnsWithDetails = [
    ...columns(handleEdit),
    {
      id: 'details',
      cell: ({ row }) => (
        <Button asChild variant="ghost" size="icon">
          <Link href={`/countries/${encodeURIComponent(row.original.name)}`}>
            <ChevronsRight className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ]

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-center p-4">
        <div className="p-8 rounded-lg bg-destructive/10 border border-destructive/50 max-w-md">
          <ServerCrash className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Failed to Load Countries</h1>
          <p className="text-destructive-foreground/80 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Country Management"
        description="Enable or disable countries for scraping and user subscriptions."
      >
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Country
        </Button>
      </PageHeader>
      <div className="mt-8 flex-grow min-h-0">
          <DataTable
            columns={columnsWithDetails}
            data={countries || []}
            isLoading={isLoading}
            filterColumn="name"
            filterPlaceholder="Filter by name..."
            initialSort={[{ id: 'eventCount', desc: true }]}
          />
      </div>
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-6 pb-0 sr-only">
             <SheetTitle>Country Editor</SheetTitle>
             <SheetDescription>Manage country details.</SheetDescription>
          </SheetHeader>
          <CountryEditor
            key={selectedId}
            country={activeCountryData}
            onSave={(saved) => {
              handleSave(saved)
              setIsEditorOpen(false)
            }}
            onCancel={() => setIsEditorOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
