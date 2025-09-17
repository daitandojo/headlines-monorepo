// apps/admin/src/app/scraper-ide/_components/SourceSelectorInput.jsx (version 2.3 - UX Improvement)
'use client';
import * as React from 'react';
import { Button, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, Popover, PopoverContent, PopoverTrigger } from '@headlines/ui';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@headlines/utils';

export default function SourceSelectorInput({ sources, selectedSource, onSelectSource, disabled }) {
  const [open, setOpen] = React.useState(false);
  const selectedValue = selectedSource?._id ? selectedSource.name : ""; // Only show a name if it's a real, selected source

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 text-base"
          disabled={disabled}
        >
          <span className="truncate">{selectedValue ? selectedValue : 'Select existing source to edit...'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search sources..." />
          <CommandList>
            <CommandEmpty>No source found.</CommandEmpty>
            <CommandGroup>
              {sources.map((source) => (
                <CommandItem
                  key={source._id}
                  value={source.name}
                  onSelect={(currentValue) => {
                    const sourceToSelect = sources.find(s => s.name.toLowerCase() === currentValue.toLowerCase());
                    onSelectSource(sourceToSelect ?? null); // Pass null if deselected
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', selectedValue.toLowerCase() === source.name.toLowerCase() ? 'opacity-100' : 'opacity-0')}/>
                  {source.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
