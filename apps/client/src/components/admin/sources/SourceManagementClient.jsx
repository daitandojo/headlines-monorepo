// src/components/admin/sources/SourceManagementClient.jsx (version 1.0)
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createSource,
  updateSource,
  deleteSource,
  getAllSources,
} from '@/actions/adminSources'
import { SourceDataTable } from './SourceDataTable'
import { columns } from './columns'
import { toast } from 'sonner'
import { EstablishSourceDialog } from './EstablishSourceDialog'

export function SourceManagementClient({ initialSources, allCountries }) {
  const queryClient = useQueryClient()
  const [isEstablishDialogOpen, setIsEstablishDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState(null)

  const {
    data: sources,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['admin-sources'],
    queryFn: async () => {
      const result = await getAllSources()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    initialData: initialSources,
    refetchOnWindowFocus: false,
  })

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sources'] })
      setEditingSource(null)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  }

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: createSource,
    ...mutationOptions,
    onSuccess: () => {
      toast.success('Source created successfully.')
      mutationOptions.onSuccess()
    },
  })

  const { mutate: edit, isPending: isEditing } = useMutation({
    mutationFn: (vars) => updateSource(vars.id, vars.data),
    ...mutationOptions,
    onSuccess: () => {
      toast.success('Source updated successfully.')
      mutationOptions.onSuccess()
    },
  })

  const { mutate: remove } = useMutation({
    mutationFn: deleteSource,
    ...mutationOptions,
    onSuccess: () => {
      toast.success('Source deleted successfully.')
      mutationOptions.onSuccess()
    },
  })

  return (
    <div>
      {isError && <p className="text-red-500">Failed to load sources.</p>}
      <SourceDataTable
        columns={columns({ removeSource: remove })}
        data={sources || []}
        isLoading={isLoading}
        onOpenEstablishDialog={() => setIsEstablishDialogOpen(true)}
      />
      <EstablishSourceDialog
        isOpen={isEstablishDialogOpen}
        setIsOpen={setIsEstablishDialogOpen}
        onSave={create}
        isSaving={isCreating}
        allCountries={allCountries}
      />
    </div>
  )
}
