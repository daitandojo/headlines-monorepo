// apps/client/src/components/client/events/KeyIndividualsDialog.jsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shared'
import { Users, Mail, Building, Briefcase } from 'lucide-react'

export function KeyIndividualsDialog({ individuals, open, onOpenChange }) {
  if (!individuals || individuals.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Key Individuals Identified
          </DialogTitle>
          <DialogDescription>
            The following individuals were identified by the AI as principal actors in
            this event.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {individuals.map((person, index) => (
            <div
              key={index}
              className="p-3 rounded-md bg-slate-800/50 border border-slate-700/50"
            >
              <p className="font-bold text-slate-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" /> {person.name}
              </p>
              <div className="pl-6 space-y-1 mt-1 text-sm text-slate-400">
                {person.role_in_event && (
                  <p className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3" /> {person.role_in_event}
                  </p>
                )}
                {person.company && (
                  <p className="flex items-center gap-2">
                    <Building className="h-3 w-3" /> {person.company}
                  </p>
                )}
                {person.email_suggestion && (
                  <a
                    href={`mailto:${person.email_suggestion}`}
                    className="flex items-center gap-2 text-blue-400 hover:underline"
                  >
                    <Mail className="h-3 w-3" /> {person.email_suggestion}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
