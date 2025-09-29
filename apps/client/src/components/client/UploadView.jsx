// File: apps/client/src/components/client/UploadView.jsx (Redesigned Version)

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
} from '@/components/shared'
import { Loader2, UploadCloud, FileJson, Type } from 'lucide-react'

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

export function UploadView() {
  const [file, setFile] = useState(null)
  const [headlineInput, setHeadlineInput] = useState('')
  const [articleInput, setArticleInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0]
    if (uploadedFile && uploadedFile.type === 'application/json') {
      setFile(uploadedFile)
    } else {
      toast.error('Please select a valid JSON file.')
      setFile(null)
    }
  }

  const handleProcessText = async () => {
    const item = { headline: headlineInput.trim(), article: articleInput.trim() }
    if (!item.headline || !item.article) {
      toast.error('Headline and Article content are both required.')
      return
    }

    setIsLoading(true)
    try {
      const toastId = toast.loading(`Processing text input...`)
      await processUploadedArticle(item)
      toast.success(`Successfully processed text input.`, { id: toastId })
      setHeadlineInput('')
      setArticleInput('')
    } catch (error) {
      toast.error('Failed to process text.', { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessFile = async () => {
    if (!file) return
    setIsLoading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target.result)
        if (!Array.isArray(content)) throw new Error('JSON must be an array of objects.')

        const totalItems = content.length
        const toastId = toast.loading(
          `Processing ${totalItems} items from file... (0/${totalItems})`
        )

        for (let i = 0; i < totalItems; i++) {
          const item = content[i]
          if (!item.headline || !item.article) {
            toast.warning(`Skipping item ${i + 1}: missing headline or article.`)
            continue
          }
          await processUploadedArticle(item)
          toast.loading(`Processing ${totalItems} items... (${i + 1}/${totalItems})`, {
            id: toastId,
          })
        }

        toast.success(
          `Successfully processed file. ${totalItems} items were sent to the pipeline.`,
          { id: toastId }
        )
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (error) {
        toast.error('Failed to process file.', { description: error.message })
      } finally {
        setIsLoading(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    // Increased max-width of the container
    <div className="max-w-4xl mx-auto">
      <Card className="bg-slate-900/50 border-slate-700/80">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl">Upload New Knowledge</CardTitle>
          <CardDescription>
            Process external intelligence by uploading a file or pasting text directly.
          </CardDescription>
        </CardHeader>
        <Tabs defaultValue="text" className="w-full">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">
                <Type className="w-4 h-4 mr-2" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="file">
                <FileJson className="w-4 h-4 mr-2" />
                Upload File
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="text">
            <CardContent className="p-6 space-y-4">
              {/* Two separate inputs for headline and article */}
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
          <TabsContent value="file">
            {/* File upload content remains the same */}
            <CardContent className="p-6 space-y-4">
              <Label htmlFor="file-upload" className="text-base font-semibold">
                JSON File Upload
              </Label>
              <div className="flex items-center p-2 border-2 border-dashed rounded-lg border-slate-700 bg-slate-900/50">
                <div className="flex-grow">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/30"
                  />
                  {file && (
                    <p className="text-xs text-slate-400 mt-1">Selected: {file.name}</p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button
                onClick={handleProcessFile}
                disabled={isLoading || !file}
                size="lg"
                className="h-12 w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-5 w-5" />
                )}
                Process File
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
