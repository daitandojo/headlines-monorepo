// src/components/DeletionConfirmationDialog.jsx (version 1.0)
'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2 } from 'lucide-react'
import useAppStore from '@/store/use-app-store'

export function DeletionConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  itemType = 'item',
  itemDescription,
  preferenceKey,
}) {
  const [doNotAskAgain, setDoNotAskAgain] = useState(false)
  const setDeletePreference = useAppStore((state) => state.setDeletePreference)

  const handleConfirm = () => {
    if (doNotAskAgain && preferenceKey) {
      setDeletePreference(preferenceKey, true)
    }
    onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            This will permanently delete the {itemType}: <br />
            <span className="font-semibold italic text-slate-300">
              "{itemDescription}"
            </span>
            <br /> This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center space-x-2 my-4 justify-center">
          <input
            type="checkbox"
            id="do-not-ask-again"
            checked={doNotAskAgain}
            onChange={(e) => setDoNotAskAgain(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <Label
            htmlFor="do-not-ask-again"
            className="text-sm font-medium text-slate-400"
          >
            Do not ask me again for {itemType}s.
          </Label>
        </div>

        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
