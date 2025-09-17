// apps/admin/src/app/scraper-ide/_components/ConfirmationModal.jsx (version 2.1 - Wider & Interactive)
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, ScrollArea, LoadingOverlay, Textarea } from '@headlines/ui';
import { ExternalLink, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfirmationModal({ open, onOpenChange, onConfirm, testResults, isTesting, isSaving, sourceConfig }) {
  const [contentPreview, setContentPreview] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [activeUrl, setActiveUrl] = useState(null);

  useEffect(() => {
    if (testResults) {
      setContentPreview(testResults.content.preview || "Could not fetch content from first article.");
      setActiveUrl(testResults.content.sourceUrl);
    }
  }, [testResults]);

  const fetchArticleContent = useCallback(async (article) => {
    if (!article?.link) return;
    setIsLoadingContent(true);
    setActiveUrl(article.link);
    try {
      const res = await fetch('/api/scrape/test-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceConfig, articleUrl: article.link })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.details || 'Failed to fetch content');
      setContentPreview(data.content.preview || `No content found for ${article.link}`);
    } catch (err) {
      toast.error('Failed to fetch article content', { description: err.message });
      setContentPreview(`Error: ${err.message}`);
    } finally {
      setIsLoadingContent(false);
    }
  }, [sourceConfig]);

  const hasHeadlines = testResults?.headlines?.count > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirm Source Configuration</DialogTitle>
          <DialogDescription>
            A live test was performed. Click on a headline to preview its content before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0 relative">
          <LoadingOverlay isLoading={isTesting} text="Running live test scrape..." />
          {testResults && (
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">Found {testResults.headlines.count} Headlines</h3>
                <ScrollArea className="h-full border rounded-md p-2">
                  <ul className="space-y-2">
                    {hasHeadlines ? testResults.headlines.samples.map((item, i) => (
                      <li key={i} className={`text-sm p-2 rounded bg-secondary/50 flex justify-between items-center cursor-pointer hover:bg-secondary ${activeUrl === item.link ? 'ring-2 ring-primary' : ''}`} onClick={() => fetchArticleContent(item)}>
                        <span className="truncate pr-4">{item.headline}</span>
                        <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}><ExternalLink className="h-4 w-4 text-muted-foreground" /></a>
                      </li>
                    )) : <li className="text-sm text-muted-foreground p-4 text-center">No headlines found.</li>}
                  </ul>
                </ScrollArea>
              </div>
              <div className="flex flex-col gap-2 h-full relative">
                <LoadingOverlay isLoading={isLoadingContent} text="Fetching content..." />
                <h3 className="font-semibold">Article Content Preview</h3>
                <Textarea
                    readOnly
                    value={contentPreview}
                    className="h-full w-full resize-none bg-secondary/50"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Go Back & Edit</Button>
          <Button onClick={onConfirm} disabled={!hasHeadlines || isSaving || isTesting}>
            <Save className="mr-2 h-4 w-4"/>
            {isSaving ? 'Saving...' : 'Confirm & Save Source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
