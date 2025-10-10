// apps/client/src/components/shared/modals/ConfirmationDialog.jsx
'use client'

import React from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  Button,
  Checkbox,
  Label,
} from '../elements'
import { AlertTriangle, Loader2 } from 'lucide-react'

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  title = 'Are you absolutely sure?',
  description,
  confirmText = 'Continue',
  showSkipOption = false,
  isSkipChecked = false,
  onSkipChange,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <AlertDialogTitle className="text-center text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col sm:items-center gap-4">
          {showSkipOption && (
            <div className="flex items-center space-x-2 justify-center">
              <Checkbox
                id="skip-confirmation"
                checked={isSkipChecked}
                onCheckedChange={onSkipChange}
              />
              <Label htmlFor="skip-confirmation" className="text-sm font-normal">
                Don't ask me again for this item type.
              </Label>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-center sm:space-x-2 w-full">
            <AlertDialogCancel disabled={isPending} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmText}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
