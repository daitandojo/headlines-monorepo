// src/components/admin/sources/EstablishSourceDialog.jsx (version 1.0)
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Step1_InitialUrl } from './steps/Step1_InitialUrl'
import { Step2_SelectSection } from './steps/Step2_SelectSection'
import { Step3_ConfigureSelectors } from './steps/Step3_ConfigureSelectors'

const TOTAL_STEPS = 3

export function EstablishSourceDialog({
  isOpen,
  setIsOpen,
  onSave,
  isSaving,
  allCountries,
}) {
  const [step, setStep] = useState(1)
  const [sourceConfig, setSourceConfig] = useState({
    name: '',
    baseUrl: '',
    sectionUrl: '',
    country: '',
    language: 'en',
    status: 'active',
    extractionMethod: 'llm', // Default to LLM
    headlineSelector: '',
    articleSelector: '',
    imageUrlSelector: '',
    notes: 'Established via AI Admin Workflow',
  })

  const updateConfig = (newData) => {
    setSourceConfig((prev) => ({ ...prev, ...newData }))
  }

  const handleNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleSave = () => {
    onSave(sourceConfig)
    if (!isSaving) {
      handleClose()
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    // Reset state on a timer to allow for exit animation
    setTimeout(() => {
      setStep(1)
      setSourceConfig({
        name: '',
        baseUrl: '',
        sectionUrl: '',
        country: '',
        language: 'en',
        status: 'active',
        extractionMethod: 'llm',
        headlineSelector: '',
        articleSelector: '',
        imageUrlSelector: '',
        notes: 'Established via AI Admin Workflow',
      })
    }, 300)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>
            Establish New Data Source (Step {step} of {TOTAL_STEPS})
          </DialogTitle>
          <DialogDescription>
            Use this AI-powered workflow to discover and configure a new source.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 min-h-[60vh]">
          {step === 1 && (
            <Step1_InitialUrl
              onNext={handleNext}
              sourceConfig={sourceConfig}
              updateConfig={updateConfig}
              allCountries={allCountries}
            />
          )}
          {step === 2 && (
            <Step2_SelectSection
              onNext={handleNext}
              onBack={handleBack}
              sourceConfig={sourceConfig}
              updateConfig={updateConfig}
            />
          )}
          {step === 3 && (
            <Step3_ConfigureSelectors
              onSave={handleSave}
              onBack={handleBack}
              sourceConfig={sourceConfig}
              updateConfig={updateConfig}
              isSaving={isSaving}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
