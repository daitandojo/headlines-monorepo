// apps/client/src/components/UploadView.jsx (version 1.2.0 - Import Fix)
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
} from '@headlines/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@headlines/ui'
import { Label } from '@headlines/ui'
import { Input } from '@headlines/ui'
import { Button } from '@headlines/ui'
import { Loader2, Wand2, UploadCloud, FileJson } from 'lucide-react'
// DEFINITIVE FIX: Import server actions from the correct data-access package.
import { scrapeAndExtractWithAI, addKnowledge } from '@headlines/data-access'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function UploadView() {
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [extractedData, setExtractedData] = useState(null)

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0]
    if (uploadedFile && uploadedFile.type === 'application/json') {
      setFile(uploadedFile)
      setUrl('') // Clear URL input if a file is selected
    } else {
      toast.error('Please select a valid JSON file.')
      setFile(null)
    }
  }

  const handleSubmit = async () => {
    if (file) {
      await handleProcessFile()
    } else {
      toast.error('File upload not yet implemented.')
    }
  }

  const handleProcessFile = async () => {
    setIsLoading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target.result)
        if (!Array.isArray(content)) throw new Error('JSON must be an array.')

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
          const result = await processUploadedArticle(item)
          if (!result.success) {
            toast.error(
              `Failed to process item ${i + 1}: ${item.headline.substring(0, 30)}...`,
              { description: result.error }
            )
          }
          toast.loading(
            `Processing ${totalItems} items from file... (${i + 1}/${totalItems})`,
            { id: toastId }
          )
        }

        toast.success(`Successfully processed ${totalItems} items from the file.`, {
          id: toastId,
        })
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
    <div className="max-w-4xl mx-auto">
      <Card className="bg-black/20 backdrop-blur-sm border border-white/10 shadow-2xl shadow-black/30">
        <CardHeader className="p-8">
          <CardTitle className="text-2xl">Upload New Knowledge</CardTitle>
          <CardDescription>
            {
              'Upload a JSON file with an array of `{"headline": "...", "article": "..."}` objects to batch-process intelligence.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="text-lg font-semibold">
              JSON File Upload
            </Label>
            <div className="flex items-center p-2 border-2 border-dashed rounded-lg border-slate-700 bg-slate-900/50">
              <FileJson className="h-10 w-10 text-slate-500 mr-4 flex-shrink-0" />
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
          </div>
        </CardContent>
        <CardFooter className="p-8 pt-0">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !file}
            size="lg"
            className="h-12 w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-5 w-5" />
            )}
            {isLoading ? 'Processing...' : `Process ${file ? file.name : 'File'}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
