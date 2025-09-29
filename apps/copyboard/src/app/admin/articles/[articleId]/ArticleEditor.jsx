'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
  Label,
  Input,
  Textarea,
} from '@/components/shared'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { updateArticleAction } from '../actions'

const FormField = ({ id, label, children }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
)

export default function ArticleEditor({ initialArticle }) {
  const [article, setArticle] = useState(initialArticle)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  const handleChange = (key, value) => {
    setArticle((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const result = await updateArticleAction(article._id, {
      headline: article.headline,
      relevance_headline: article.relevance_headline,
      relevance_article: article.relevance_article,
      assessment_headline: article.assessment_headline,
      assessment_article: article.assessment_article,
    })

    if (result.success) {
      toast.success('Article updated successfully.')
      router.push('/admin/articles')
    } else {
      toast.error(`Update failed: ${result.error}`)
    }
    setIsSaving(false)
  }, [article, router])

  return (
    <div className="max-w-4xl mx-auto">
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/admin/articles">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Articles
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit Article</CardTitle>
          <CardDescription>
            Fine-tune the AI's assessment and details for this article.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="headline" label="Headline">
            <Textarea
              value={article.headline}
              onChange={(e) => handleChange('headline', e.target.value)}
              rows={3}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField id="relevance_headline" label="Headline Score">
              <Input
                type="number"
                value={article.relevance_headline}
                onChange={(e) =>
                  handleChange('relevance_headline', Number(e.target.value))
                }
              />
            </FormField>
            <FormField id="relevance_article" label="Article Score">
              <Input
                type="number"
                value={article.relevance_article}
                onChange={(e) =>
                  handleChange('relevance_article', Number(e.target.value))
                }
              />
            </FormField>
          </div>
          <FormField id="assessment_headline" label="Headline Assessment">
            <Textarea
              value={article.assessment_headline}
              onChange={(e) => handleChange('assessment_headline', e.target.value)}
              rows={2}
            />
          </FormField>
          <FormField id="assessment_article" label="Article Assessment">
            <Textarea
              value={article.assessment_article}
              onChange={(e) => handleChange('assessment_article', e.target.value)}
              rows={4}
            />
          </FormField>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
