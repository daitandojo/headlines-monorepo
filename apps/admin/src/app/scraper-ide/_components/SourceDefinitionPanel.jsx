// apps/admin/src/app/scraper-ide/_components/SourceDefinitionPanel.jsx (version 3.8 - Relative Selectors)
'use client';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator, Textarea } from '@headlines/ui';
import { Save, Loader2, TestTube2 } from 'lucide-react';
import { SOURCE_STATUSES, SOURCE_FREQUENCIES } from '@headlines/models/src/constants.js';

const FormField = ({ id, label, children, description }) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
    {children}
    {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
  </div>
);

export default function SourceDefinitionPanel({ sourceData, onDataChange, onTest, onUpdate, isSaving, countries, isSavable }) {
  
  const handleSelectorChange = (key, value) => {
    const selectors = value.split(',').map(s => s.trim()).filter(Boolean);
    onDataChange({ [key]: selectors });
  };
  
  const handleChange = (key, value) => {
    onDataChange({ [key]: value });
  };
  
  if (!sourceData) return null;

  return (
    <div className="p-4 flex flex-col h-full">
      <h3 className="font-semibold mb-2 px-2 text-lg">Source Definition</h3>
      <div className="flex-grow overflow-y-auto pr-2 space-y-3">
        <FormField label="Headline Container Selectors" id="headlineSelector">
            <Textarea 
                value={(sourceData.headlineSelector || []).join(', ')} 
                onChange={e => handleSelectorChange('headlineSelector', e.target.value)}
                placeholder="e.g., .article-container, .news-item"
                className="font-mono text-sm"
                rows={3}
            />
        </FormField>
         <FormField label="Link Selector (relative)" id="linkSelector" description="Relative to the container. Leave blank if container is the link.">
            <Input 
                value={sourceData.linkSelector || ''} 
                onChange={e => handleChange('linkSelector', e.target.value)}
                placeholder="e.g., a.headline-link"
                className="font-mono text-sm"
            />
        </FormField>
         <FormField label="Headline Text Selector (relative)" id="headlineTextSelector" description="Relative to the container. Leave blank for default text extraction.">
            <Input 
                value={sourceData.headlineTextSelector || ''} 
                onChange={e => handleChange('headlineTextSelector', e.target.value)}
                placeholder="e.g., h2, .title-text"
                className="font-mono text-sm"
            />
        </FormField>
         <FormField label="Article Body Selectors" id="articleSelector">
            <Textarea 
                value={(sourceData.articleSelector || []).join(', ')} 
                onChange={e => handleSelectorChange('articleSelector', e.target.value)}
                placeholder="e.g., div.prose, main > article"
                className="font-mono text-sm"
                rows={3}
            />
        </FormField>
        <Separator className="my-2"/>
        <FormField label="Source Name" id="name"><Input value={sourceData.name || ''} onChange={e => handleChange('name', e.target.value)} /></FormField>
        <div className="grid grid-cols-2 gap-2">
            <FormField label="Country" id="country">
                <Select value={sourceData.country || ''} onValueChange={v => handleChange('country', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
            </FormField>
            <FormField label="Language" id="language"><Input value={sourceData.language || 'en'} onChange={e => handleChange('language', e.target.value)} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <FormField label="Status" id="status">
                <Select value={sourceData.status || 'active'} onValueChange={v => handleChange('status', v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{SOURCE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
            </FormField>
            <FormField label="Frequency" id="scrapeFrequency">
                <Select value={sourceData.scrapeFrequency || 'high'} onValueChange={v => handleChange('scrapeFrequency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCE_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
            </FormField>
        </div>
      </div>
      <div className="flex-shrink-0 pt-4 flex gap-2">
        <Button onClick={onTest} disabled={isSaving || !isSavable} className="w-full" variant="outline">
            <TestTube2 className="mr-2 h-4 w-4"/>
            Test Source
        </Button>
        <Button onClick={onUpdate} disabled={isSaving || !isSavable} className="w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
            {sourceData._id ? 'Update Source' : 'Create Source'}
        </Button>
      </div>
    </div>
  );
}
