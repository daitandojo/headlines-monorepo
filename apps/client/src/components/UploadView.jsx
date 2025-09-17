// src/components/UploadView.jsx (version 1.1)
"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, UploadCloud } from 'lucide-react';
import { scrapeAndExtractWithAI } from '@/actions/extract';
import { addKnowledge } from '@/actions/knowledge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function UploadView() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [extractedData, setExtractedData] = useState(null);

    const handleScrape = async () => {
        if (!url || !url.startsWith('http')) {
            toast.error("Please enter a valid, complete URL (e.g., https://...).");
            return;
        }
        setIsLoading(true);
        const result = await scrapeAndExtractWithAI(url);
        setIsLoading(false);

        if (result.success) {
            setExtractedData({
                ...result.data,
                link: url,
            });
            setIsModalOpen(true);
            toast.success("AI Analyst finished extraction!");
        } else {
            toast.error(`Extraction failed: ${result.error}`);
        }
    };

    const handleSave = async () => {
        if (!extractedData.country || !extractedData.publication) {
            toast.error("Please specify both the country and publication before saving.");
            return;
        }

        setIsLoading(true);
        const result = await addKnowledge({
            headline: extractedData.headline,
            business_summary: extractedData.business_summary,
            source: extractedData.publication,
            country: extractedData.country,
            link: extractedData.link,
        });
        setIsLoading(false);
        setIsModalOpen(false);

        if (result.success) {
            toast.success(result.message);
            setUrl('');
            setExtractedData(null);
        } else {
            toast.error(`Failed to save: ${result.message}`);
        }
    };

    return (
        <>
            <div className="max-w-4xl mx-auto">
                <Card className="bg-black/20 backdrop-blur-sm border border-white/10 shadow-2xl shadow-black/30">
                    <CardHeader className="p-8">
                        <CardTitle className="text-2xl">Upload New Knowledge</CardTitle>
                        <CardDescription>
                            Provide an article URL. A specialized AI Analyst will extract the business-critical intelligence for you to review and add to the knowledge base.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <div className="space-y-2">
                            <Label htmlFor="url" className="text-lg font-semibold">Article URL</Label>
                            <div className="flex gap-4">
                                <Input
                                    id="url"
                                    placeholder="https://example.com/article"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={isLoading}
                                    onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                                    className="h-12 text-base"
                                />
                                <Button onClick={handleScrape} disabled={isLoading} size="lg" className="h-12">
                                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                                    Analyze & Extract
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-4xl w-[95vw] bg-slate-900 border-slate-700 p-8">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Review AI Analyst's Extraction</DialogTitle>
                        <DialogDescription>
                            The AI has extracted the following intelligence. Please verify the details before adding it to the knowledge base.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-6 custom-scrollbar">
                        <div>
                            <Label className="text-slate-400">Headline</Label>
                            <p className="font-semibold text-lg text-slate-200 mt-1">{extractedData?.headline}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <Label htmlFor="modal-publication" className="text-slate-400">Publication *</Label>
                                <Input 
                                    id="modal-publication"
                                    value={extractedData?.publication || ''}
                                    onChange={(e) => setExtractedData(prev => ({...prev, publication: e.target.value}))}
                                    placeholder="e.g., The Financial Times"
                                    className="bg-slate-800 border-slate-600 mt-1 h-10"
                                />
                            </div>
                             <div>
                                <Label htmlFor="modal-country" className="text-slate-400">Country of Origin *</Label>
                                <Input 
                                    id="modal-country"
                                    value={extractedData?.country || ''}
                                    onChange={(e) => setExtractedData(prev => ({...prev, country: e.target.value}))}
                                    placeholder="e.g., Denmark"
                                    className="bg-slate-800 border-slate-600 mt-1 h-10"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-slate-400">Business Summary</Label>
                            <div className="p-4 mt-1 rounded-md bg-slate-800/50 border border-slate-700 text-sm text-slate-300 max-h-72 overflow-y-auto custom-scrollbar">
                                <div className="prose prose-sm prose-invert prose-p:my-2">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {extractedData?.business_summary}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-6">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            Add to Knowledge Base
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}