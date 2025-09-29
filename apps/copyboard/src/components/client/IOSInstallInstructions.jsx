// src/components/IOSInstallInstructions.jsx (version 1.0)
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../shared'
import { Share, PlusSquare } from 'lucide-react'

export function IOSInstallInstructions({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle>Install on your iPhone</DialogTitle>
          <DialogDescription>
            To install the app, please follow these steps:
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 text-sm text-slate-300">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
              <Share className="h-5 w-5" />
            </div>
            <p>
              1. Tap the <span className="font-bold">Share</span> button in Safari's
              bottom toolbar.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
              <PlusSquare className="h-5 w-5" />
            </div>
            <p>
              2. Scroll down and tap '
              <span className="font-bold">Add to Home Screen</span>'.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
