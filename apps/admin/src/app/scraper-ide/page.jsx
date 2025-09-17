IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

// apps/admin/src/app/scraper-ide/page.jsx (version 2.2.0)
;('use client')

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@headlines/ui/src/index.js'
import { Button } from '@headlines/ui/src/index.js'
import { Input } from '@headlines/ui/src/index.js'
import { Label } from '@headlines/ui/src/index.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@headlines/ui/src/index.js'
import { ScrollArea } from '@headlines/ui/src/index.js'
import { Card, CardContent, CardHeader, CardTitle } from '@headlines/ui/src/index.js'
import { Badge } from '@headlines/ui/src/index.js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@headlines/ui/src/index.js'
import { Alert, AlertDescription } from '@headlines/ui/src/index.js'
import { Separator } from '@headlines/ui/src/index.js'
import { toast } from 'sonner'
import {
  Save,
  Loader2,
  PlusCircle,
  X,
  Wand2,
  TestTube2,
  ExternalLink,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Info,
  Globe,
  Code,
  Zap,
  Eye,
  ArrowRight,
  Copy,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'

const FormField = ({ id, label, description, children, error, required }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {description && (
        <div className="group relative">
          <Info className="w-3 h-3 text-muted-foreground cursor-help" />
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-popover border rounded-md p-2 text-xs w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            {description}
          </div>
        </div>
      )}
    </div>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

const StatusIndicator = ({ status, label }) => {
  const statusConfig = {
    success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    error: { icon: X, color: 'text-red-500', bg: 'bg-red-500/10' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  }
  const config = statusConfig[status] || statusConfig.info
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${config.bg}`}>
      <Icon className={`w-3 h-3 ${config.color}`} />
      <span className="text-xs">{label}</span>
    </div>
  )
}

const LiveTestResultItem = ({ headline, link, sourceConfig }) => {
  const [isTestingContent, setIsTestingContent] = useState(false)
  const [content, setContent] = useState(null)
  const [contentExpanded, setContentExpanded] = useState(false)

  const handleTestContent = async () => {
    setIsTestingContent(true)
    setContent(null)
    try {
      const res = await fetch('/api/scrape/test-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceConfig, articleUrl: link }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || 'Content scrape failed.')
      setContent(data.content || 'No content found with selector.')
    } catch (err) {
      setContent(`Error: ${err.message}`)
    } finally {
      setIsTestingContent(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link)
    toast.success('Link copied to clipboard')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-white/10 rounded-lg p-3 bg-card hover:bg-card/80 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-grow min-w-0">
          <h4 className="font-medium text-sm mb-1 line-clamp-2">{headline}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 hover:text-foreground transition-colors truncate"
              title="Copy link"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{link}</span>
            </button>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleTestContent}
            disabled={isTestingContent}
            title="Test article content extraction"
          >
            {isTestingContent ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <TestTube2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => window.open(link, '_blank')}
            title="Open in new tab"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {content && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Extracted Content:
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setContentExpanded(!contentExpanded)}
                className="text-xs h-6"
              >
                {contentExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </div>
            <pre
              className={`text-xs whitespace-pre-wrap font-mono text-muted-foreground bg-black/20 rounded p-2 overflow-hidden transition-all ${
                contentExpanded ? 'max-h-none' : 'max-h-20'
              }`}
            >
              {content}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const ProgressStep = ({ step, currentStep, title, description }) => {
  const isActive = step === currentStep
  const isCompleted = step < currentStep

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        isActive
          ? 'bg-primary/10 border border-primary/20'
          : isCompleted
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-card border border-white/10'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isCompleted
            ? 'bg-green-500 text-white'
            : isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <div className="flex-grow">
        <h4
          className={`font-medium text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {title}
        </h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {isActive && <ArrowRight className="w-4 h-4 text-primary" />}
    </div>
  )
}

export default function SourceIdeModal({
  source,
  open,
  onOpenChange,
  onSave,
  countries,
}) {
  const [formData, setFormData] = useState(source)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCoPilotRunning, setIsCoPilotRunning] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResults, setTestResults] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [currentStep, setCurrentStep] = useState(1)
  const [activeTab, setActiveTab] = useState('setup')

  useEffect(() => {
    setFormData(source)
    setIsDirty(source?._id === null)
    setTestResults(null)
    setValidationErrors({})
    setCurrentStep(1)
    setActiveTab('setup')
  }, [source])

  if (!source) return null
  const isNewSource = !source._id

  const isValidUrl = (string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const validateForm = useCallback(() => {
    const errors = {}

    if (!formData.name?.trim()) errors.name = 'Source name is required'
    if (!formData.country) errors.country = 'Country selection is required'
    if (!formData.baseUrl?.trim()) errors.baseUrl = 'Base URL is required'
    else if (!isValidUrl(formData.baseUrl)) errors.baseUrl = 'Please enter a valid URL'
    if (!formData.sectionUrl?.trim()) errors.sectionUrl = 'Section URL is required'
    else if (!isValidUrl(formData.sectionUrl))
      errors.sectionUrl = 'Please enter a valid URL'

    if (currentStep >= 2) {
      if (!formData.headlineSelector || formData.headlineSelector.length === 0)
        errors.headlineSelector = 'Headline container selector is required'
      if (!formData.linkSelector?.trim())
        errors.linkSelector = 'Link selector is required'
      if (!formData.headlineTextSelector?.trim())
        errors.headlineTextSelector = 'Headline text selector is required'
    }

    if (currentStep >= 3) {
      if (!formData.articleSelector || formData.articleSelector.length === 0)
        errors.articleSelector = 'Article content selector is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData, currentStep])

  useEffect(() => {
    validateForm()
  }, [validateForm])

  useEffect(() => {
    if (formData.name && formData.country && formData.baseUrl && formData.sectionUrl) {
      if (
        formData.headlineSelector &&
        formData.linkSelector &&
        formData.headlineTextSelector
      ) {
        if (formData.articleSelector) {
          setCurrentStep(4)
        } else {
          setCurrentStep(3)
        }
      } else {
        setCurrentStep(2)
      }
    } else {
      setCurrentStep(1)
    }
  }, [formData])

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleCoPilot = async () => {
    if (!formData.sectionUrl) {
      toast.error('Please enter a Section URL to analyze.')
      setActiveTab('setup')
      return
    }

    setIsCoPilotRunning(true)
    const toastId = toast.loading(
      'AI Co-Pilot is analyzing the website and configuring selectors...'
    )

    try {
      const res = await fetch('/api/ai/full-source-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.sectionUrl }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.details || 'Co-Pilot failed.')

      setFormData((prev) => ({
        ...prev,
        ...data.configuration,
        name: prev.name || data.configuration.name,
        baseUrl: prev.baseUrl || data.configuration.baseUrl,
      }))
      setTestResults(data.testResults)
      setIsDirty(true)
      setActiveTab('test')

      toast.success('AI Co-Pilot has configured and tested the source successfully!', {
        id: toastId,
      })
    } catch (error) {
      toast.error(`Co-Pilot Failed: ${error.message}`, { id: toastId })
    } finally {
      setIsCoPilotRunning(false)
    }
  }

  const handleTest = async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors before testing')
      return
    }

    setIsTesting(true)
    setTestResults(null)
    const toastId = toast.loading('Running live test on the configured selectors...')

    try {
      const res = await fetch('/api/scrape/test-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceConfig: formData }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.details || 'Test failed.')

      setTestResults(data)
      setActiveTab('test')
      toast.success(`Test successful! Found ${data.count} headlines.`, { id: toastId })
    } catch (err) {
      toast.error('Test Failed', { id: toastId, description: err.message })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix all validation errors before saving')
      return
    }

    setIsSaving(true)
    const url = isNewSource ? '/api/sources' : `/api/sources/${source._id}`
    const method = isNewSource ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to save source.')

      onSave(data.source)
      toast.success(`Source ${isNewSource ? 'created' : 'updated'} successfully!`)
      onOpenChange(false)
    } catch (error) {
      toast.error(`Error saving source: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuickFill = (template) => {
    const templates = {
      news: {
        headlineSelector: 'article, .article, .news-item, .story',
        linkSelector: 'a[href]',
        headlineTextSelector: 'h1, h2, h3, .headline, .title',
        articleSelector: '.article-content, .story-content, .post-content, main article',
      },
      blog: {
        headlineSelector: '.post, .blog-post, article',
        linkSelector: 'a[href]',
        headlineTextSelector: '.post-title, .entry-title, h1, h2',
        articleSelector: '.post-content, .entry-content, .blog-content',
      },
      reddit: {
        headlineSelector: '[data-testid="post-container"], .Post',
        linkSelector: 'a[data-click-id="body"]',
        headlineTextSelector: '[data-testid="post-content"] h3',
        articleSelector: '[data-testid="post-content"]',
      },
    }

    const template_config = templates[template]
    if (template_config) {
      Object.entries(template_config).forEach(([key, value]) => {
        handleFieldChange(key, value)
      })
      toast.success(`Applied ${template} template`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Edit className="w-6 h-6" />
            {isNewSource ? 'Create New Source' : `Editing: ${source.name}`}
          </DialogTitle>
          <DialogDescription>
            Use this IDE to define, test, and save source scraper configurations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow min-h-0 grid grid-cols-12 gap-6">
          {/* Left Column: Progress & Actions */}
          <div className="col-span-3 flex flex-col gap-6">
            <Card className="flex-shrink-0">
              <CardHeader>
                <CardTitle>Configuration Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ProgressStep
                  step={1}
                  currentStep={currentStep}
                  title="Source Setup"
                  description="Define basic info like name and URL."
                />
                <ProgressStep
                  step={2}
                  currentStep={currentStep}
                  title="Headline Selectors"
                  description="Define selectors to find headlines."
                />
                <ProgressStep
                  step={3}
                  currentStep={currentStep}
                  title="Article Selector"
                  description="Define selector for article content."
                />
                <ProgressStep
                  step={4}
                  currentStep={currentStep}
                  title="Test & Save"
                  description="Run a live test before saving."
                />
              </CardContent>
            </Card>

            <Card className="flex-grow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCoPilot}
                  disabled={isCoPilotRunning || !formData.sectionUrl}
                >
                  {isCoPilotRunning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Run AI Co-Pilot
                </Button>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground pl-1">
                    Apply Template
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleQuickFill('news')}
                    >
                      News
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleQuickFill('blog')}
                    >
                      Blog
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleQuickFill('reddit')}
                    >
                      Reddit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Editor & Test Results */}
          <div className="col-span-9 rounded-lg border flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-grow flex flex-col min-h-0"
            >
              <TabsList className="m-2">
                <TabsTrigger value="setup">
                  <Code className="w-4 h-4 mr-2" />
                  Setup
                </TabsTrigger>
                <TabsTrigger value="test">
                  <Eye className="w-4 h-4 mr-2" />
                  Live Test Results
                </TabsTrigger>
              </TabsList>
              <TabsContent value="setup" className="flex-grow min-h-0">
                {/* Setup Form Content */}
              </TabsContent>
              <TabsContent value="test" className="flex-grow min-h-0">
                {/* Test Results Content */}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleTest}
              disabled={
                isTesting || isCoPilotRunning || Object.keys(validationErrors).length > 0
              }
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube2 className="mr-2 h-4 w-4" />
              )}
              Run Live Test
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || isSaving || Object.keys(validationErrors).length > 0}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Source
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
