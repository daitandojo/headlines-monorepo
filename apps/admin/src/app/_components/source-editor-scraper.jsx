// src/app/_components/source-editor-scraper.jsx (version 1.1)
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@headlines/ui'

const FormField = ({ id, label, children, description }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-muted-foreground pl-1">
      {label}
    </Label>
    {children}
    {description && <p className="text-xs text-muted-foreground pl-1">{description}</p>}
  </div>
)

export default function SourceEditorScraper({
  formData,
  handleFieldChange,
  handleSelectChange,
}) {
  return (
    <Card className="bg-black/20 border-white/10 flex flex-col h-full">
      <CardHeader>
        <CardTitle>Scraper Logic</CardTitle>
        <CardDescription>
          Selectors for extracting headlines and article content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow flex flex-col">
        <FormField label="Extraction Method">
          <Select
            value={formData.extractionMethod || 'declarative'}
            onValueChange={(v) => handleSelectChange('extractionMethod', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="declarative">Declarative (CSS)</SelectItem>
              <SelectItem value="json-ld">JSON-LD</SelectItem>
              <SelectItem value="custom">Custom (Legacy)</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        {formData.extractionMethod === 'declarative' && (
          <>
            <FormField id="headlineSelector" label="Headline Container Selector">
              <Input
                id="headlineSelector"
                value={formData.headlineSelector || ''}
                onChange={(e) => handleFieldChange('headlineSelector', e.target.value)}
                placeholder="e.g., article.teaser"
              />
            </FormField>
            <FormField id="linkSelector" label="Link Selector (relative)">
              <Input
                id="linkSelector"
                value={formData.linkSelector || ''}
                onChange={(e) => handleFieldChange('linkSelector', e.target.value)}
                placeholder="e.g., a.title-link (optional)"
              />
            </FormField>
            <FormField
              id="headlineTextSelector"
              label="Headline Text Selector (relative)"
            >
              <Input
                id="headlineTextSelector"
                value={formData.headlineTextSelector || ''}
                onChange={(e) =>
                  handleFieldChange('headlineTextSelector', e.target.value)
                }
                placeholder="e.g., h3 (optional)"
              />
            </FormField>
          </>
        )}
        {formData.extractionMethod === 'custom' && (
          <FormField
            id="extractorKey"
            label="Custom Extractor Key"
            description="Legacy key for hardcoded extractor functions."
          >
            <Input
              id="extractorKey"
              value={formData.extractorKey || ''}
              onChange={(e) => handleFieldChange('extractorKey', e.target.value)}
            />
          </FormField>
        )}
        <FormField id="articleSelector" label="Article Content Selector">
          <Textarea
            id="articleSelector"
            value={formData.articleSelector || ''}
            onChange={(e) => handleFieldChange('articleSelector', e.target.value)}
            placeholder="e.g., div.article-body, main > article"
            rows={3}
          />
        </FormField>
      </CardContent>
    </Card>
  )
}
