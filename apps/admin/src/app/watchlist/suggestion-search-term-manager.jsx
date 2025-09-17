// apps/admin/src/app/watchlist/suggestion-search-term-manager.jsx (version 1.0.0)
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button, Badge, Input, Popover, PopoverContent, PopoverTrigger } from '@headlines/ui'
import { PlusCircle, X } from 'lucide-react'

const EditableTermBadge = ({ term, onUpdate, onRemove }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(term);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editText.trim() && editText.trim().toLowerCase() !== term) {
            onUpdate(term, editText.trim().toLowerCase());
        }
        setIsEditing(false);
    };
    
    if (isEditing) {
        return ( <Input ref={inputRef} value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={handleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }} className="h-6 text-xs w-auto inline-flex" style={{ width: `${Math.max(editText.length, 5)}ch` }} /> )
    }

    return (
        <Badge variant="secondary" className="group cursor-pointer" onClick={() => setIsEditing(true)}>
            {term}
            <button onClick={(e) => { e.stopPropagation(); onRemove(term); }} className="ml-1.5 opacity-50 group-hover:opacity-100 rounded-full hover:bg-background/50">
              <X className="h-3 w-3" />
            </button>
        </Badge>
    )
}

export const SuggestionSearchTermManager = ({ suggestion, onUpdate }) => {
  const [newTerm, setNewTerm] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleUpdateTerms = (newTerms) => {
    onUpdate(suggestion, { searchTerms: [...new Set(newTerms)] });
  };

  const handleAddTerm = () => {
    if (newTerm.trim()) {
      handleUpdateTerms([...(suggestion.searchTerms || []), newTerm.trim().toLowerCase()]);
      setNewTerm('');
      setIsPopoverOpen(false);
    }
  };

  const handleRemoveTerm = (termToRemove) => {
    handleUpdateTerms((suggestion.searchTerms || []).filter(t => t !== termToRemove));
  };
  
  const handleUpdateTerm = (oldTerm, newTerm) => {
    handleUpdateTerms((suggestion.searchTerms || []).map(t => t === oldTerm ? newTerm : t));
  };
  
  return (
    <div className="flex flex-wrap items-center gap-1 max-w-md">
      {(suggestion.searchTerms || []).map(term => (
        <EditableTermBadge key={term} term={term} onUpdate={handleUpdateTerm} onRemove={handleRemoveTerm} />
      ))}
       <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full">
              <PlusCircle className="h-4 w-4" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
            <div className="flex items-center gap-1">
                <Input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTerm()} placeholder="Add term..." className="h-7 text-xs" />
                <Button size="icon" variant="default" className="h-7 w-7" onClick={handleAddTerm}> <PlusCircle className="h-4 w-4" /> </Button>
            </div>
        </PopoverContent>
       </Popover>
    </div>
  )
}
