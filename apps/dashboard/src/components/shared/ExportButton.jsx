// packages/ui/src/ExportButton.jsx (version 2.0.0)
'use client'

import { useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../shared'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ExportButton({ hasData, onExport }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExportClick = async (format) => {
    if (!hasData) {
      toast.info('No data available to export.')
      return
    }

    if (typeof onExport !== 'function') {
      toast.error('Export action is not configured correctly.')
      return
    }

    setIsLoading(true)
    const result = await onExport(format)
    setIsLoading(false)

    if (result?.success) {
      toast.success('Your download will begin shortly.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isLoading || !hasData}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExportClick('csv')}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportClick('xlsx')}>
          Export as Excel (.xls)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
