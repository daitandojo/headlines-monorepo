// packages/ui/src/ExportButton.jsx (version 1.0)
'use client'

import { useState } from 'react';
import { Button } from './components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/dropdown-menu';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ExportButton({ hasData, filename, exportActions = {} }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleExport = async (format) => {
        if (!hasData) {
            toast.info("No data available to export.");
            return;
        }
        
        const action = exportActions[format];
        if (!action) {
            toast.error(`No export action configured for format: ${format}`);
            return;
        }

        setIsLoading(true);
        const result = await action();
        setIsLoading(false);

        if (result.success) {
            // DEFINITIVE FIX: The XLSX action now returns raw XML, not base64.
            const blob = new Blob([result.data], { type: `${result.contentType};charset=utf-8;` });

            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                // Correct the extension for XML-based Excel files
                const extension = format === 'xlsx' ? 'xls' : format;
                link.setAttribute("download", `${filename}.${extension}`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Export successful!");
            }
        } else {
            toast.error("Export failed", { description: result.error });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button disabled={isLoading || !hasData}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    Export as Excel (.xls)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
