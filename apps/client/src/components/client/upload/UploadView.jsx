// apps/client/src/components/client/upload/UploadView.jsx
'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Label,
  Input,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Badge,
} from '@/components/shared'
import { Loader2, UploadCloud, FileJson, Type, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react'

async function processUploadedArticle(item) {
  const res = await fetch('/api/upload/process-article', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item }),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to process item')
  }
  return res.json()
}

async function runFileIngestion(file, options = {}) {
  const formData = new FormData()
  formData.append('file', file)
  if (options.dryRun) formData.append('dryRun', 'true')
  if (options.force) formData.append('force', 'true')

  const res = await fetch('/api/file-ingestion', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to process file')
  }
  return res.json()
}

function IngestionResult({ result }) {
  if (!result) return null
  const { summary, classification, extraction } = result

  const statusItems = [
    {
      icon: <FileSpreadsheet className="h-4 w-4 text-blue-400" />,
      label: 'File type',
      value: classification?.classification || 'Unknown',
    },
    {
      icon: <CheckCircle2 className="h-4 w-4 text-green-400" />,
      label: 'Extracted',
      value: `${extraction?.totalExtracted || 0} individuals`,
    },
    {
      icon: <CheckCircle2 className="h-4 w-4 text-green-400" />,
      label: 'New opportunities',
      value: `${summary?.newOpportunitiesCreated || 0}`,
    },
    {
      icon: result.summary?.excluded > 0
        ? <AlertTriangle className="h-4 w-4 text-amber-400" />
        : <CheckCircle2 className="h-4 w-4 text-green-400" />,
      label: 'Below UHNW threshold',
      value: `${result.summary?.excluded || 0}`,
    },
    {
      icon: result.summary?.alreadyExisting > 0
        ? <AlertTriangle className="h-4 w-4 text-slate-400" />
        : <CheckCircle2 className="h-4 w-4 text-green-400" />,
      label: 'Already in database',
      value: `${result.summary?.alreadyExisting || 0}`,
    },
  ]

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-green-400 font-medium">
        <CheckCircle2 className="h-5 w-5" />
        File ingestion complete — {summary?.newOpportunitiesCreated || 0} new opportunity
        {(summary?.newOpportunitiesCreated || 0) !== 1 ? 'ies' : ''} created
      </div>
      <div className="grid grid-cols-2 gap-2">
        {statusItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm bg-slate-800/50 rounded px-3 py-2">
            {item.icon}
            <span className="text-slate-400">{item.label}:</span>
            <span className="text-slate-100 font-medium">{item.value}</span>
          </div>
        ))}
      </div>
      {result.summary?.requiresReview > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-900/20 rounded px-3 py-2 border border-amber-500/30">
          <AlertTriangle className="h-4 w-4" />
          {result.summary.requiresReview} record
          {result.summary.requiresReview !== 1 ? 's' : ''} require manual review
        </div>
      )}
    </div>
  )
}

function classifyFileType(filename) {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  if (ext === '.txt') return 'plain text'
  if (ext === '.csv') return 'CSV spreadsheet'
  if (ext === '.json') return 'JSON data'
  return ext || 'unknown'
}

export function UploadView() {
  const [activeTab, setActiveTab] = useState('text')
  const [headlineInput, setHeadlineInput] = useState('')
  const [articleInput, setArticleInput] = useState('')
  const [file, setFile] = useState(null)
  const [dryRun, setDryRun] = useState(false)
  const [force, setForce] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ingestionResult, setIngestionResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0]
    if (!uploadedFile) return
    setFile(uploadedFile)
    setIngestionResult(null)
  }

  const handleProcessText = async () => {
    const item = { headline: headlineInput.trim(), article: articleInput.trim() }
    if (!item.headline || !item.article) {
      toast.error('Headline and Article content are both required.')
      return
    }

    setIsLoading(true)
    try {
      const toastId = toast.loading('Processing text input...')
      await processUploadedArticle(item)
      toast.success('Successfully processed text input.', { id: toastId })
      setHeadlineInput('')
      setArticleInput('')
    } catch (error) {
      toast.error('Failed to process text.', { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunFileIngestion = async () => {
    if (!file) return
    setIsLoading(true)
    setIngestionResult(null)

    const toastId = toast.loading(
      `Ingesting ${file.name} (${classifyFileType(file.name)})...`,
    )

    try {
      const result = await runFileIngestion(file, { dryRun, force })
      setIngestionResult(result)
      toast.success(
        `Ingestion complete — ${result.summary?.newOpportunitiesCreated || 0} new opportunities.`,
        { id: toastId },
      )
    } catch (error) {
      toast.error('Ingestion failed.', { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Text / Article Tab */}
      <Card className="bg-slate-900/50 border-slate-700/80">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl">Add Intelligence</CardTitle>
          <CardDescription>
            Paste a headline and article to be scored by the intelligence pipeline.
          </CardDescription>
        </CardHeader>
        <Tabs value="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-6">
            <TabsTrigger value="text">
              <Type className="w-4 h-4 mr-2" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="file">
              <FileJson className="w-4 h-4 mr-2" />
              Upload File
            </TabsTrigger>
          </TabsList>
          <TabsContent value="text">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headline-input" className="text-base">
                  Headline
                </Label>
                <Input
                  id="headline-input"
                  placeholder="Enter the article headline..."
                  className="bg-slate-900/80 border-slate-700"
                  value={headlineInput}
                  onChange={(e) => setHeadlineInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="article-input" className="text-base">
                  Article Content
                </Label>
                <Textarea
                  id="article-input"
                  placeholder="Paste the full article content here..."
                  className="min-h-[250px] bg-slate-900/80 border-slate-700"
                  value={articleInput}
                  onChange={(e) => setArticleInput(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button
                onClick={handleProcessText}
                disabled={isLoading || !headlineInput.trim() || !articleInput.trim()}
                size="lg"
                className="w-full h-12"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-5 w-5" />
                )}
                Process Text
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </Card>

      {/* File Ingestion Tab */}
      <Card className="bg-slate-900/50 border-slate-700/80">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-blue-400" />
                File Ingestion
              </CardTitle>
              <CardDescription className="mt-1">
                Upload rich lists (Forbes, etc.), individual lists (CSV/TXT), or JSON files.
                Extracted individuals are enriched and checked against the UHNW threshold.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-blue-500/40 text-blue-300 text-xs">
              TC11 / TC12
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-4 border-2 border-dashed rounded-lg border-slate-700 bg-slate-900/30">
            <Input
              id="file-upload-ingestion"
              type="file"
              accept=".txt,.csv,.json"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/30"
            />
            {file && (
              <div className="text-sm text-slate-300">
                <span className="text-slate-500">Selected:</span>{' '}
                <span className="font-medium">{file.name}</span>
                <span className="text-slate-500 ml-2">
                  ({(file.size / 1024).toFixed(1)} KB — {classifyFileType(file.name)})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded border-slate-600"
              />
              <span className="text-slate-300">Dry run (parse only, no DB writes)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="rounded border-slate-600"
              />
              <span className="text-slate-300">Force (skip dedup check)</span>
            </label>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Supported file formats:</p>
            <p>
              <span className="text-blue-300">Rich Lists</span> — plain text or CSV with columns
              (Name, Rank, Net Worth, Company, Country)
            </p>
            <p>
              <span className="text-blue-300">Individual Lists</span> — plain text or CSV with
              columns (Name, Company, Role, Country)
            </p>
            <p>
              <span className="text-blue-300">JSON</span> — array of objects with name + wealth
              fields
            </p>
          </div>

          {ingestionResult && <IngestionResult result={ingestionResult} />}
        </CardContent>

        <CardFooter className="p-6 pt-0">
          <Button
            onClick={handleRunFileIngestion}
            disabled={isLoading || !file}
            size="lg"
            className="w-full h-12 bg-blue-600 hover:bg-blue-500"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-5 w-5" />
            )}
            Run File Ingestion
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}