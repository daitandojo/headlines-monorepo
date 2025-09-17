// apps/admin/src/app/scraper-ide/_components/TabsBar.jsx (version 1.1)
'use client';

import { cn } from '@headlines/utils';
import { LayoutList, FileText, X } from 'lucide-react';

export default function TabsBar({ tabs, activeTabId, onSelectTab, onCloseTab }) {
  if (!tabs || tabs.length === 0) {
    return null;
  }

  const handleTabClick = (e, tabId) => {
    // If middle-clicked or ctrl/cmd-clicked, open in new tab and don't switch active tab
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) window.open(tab.url, '_blank');
      return;
    }
    onSelectTab(tabId);
  };

  return (
    <div className="flex-shrink-0 border-b bg-secondary/30">
      <ul className="flex items-center gap-1 p-1">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const Icon = tab.type === 'discovery' ? LayoutList : FileText;
          return (
            <li
              key={tab.id}
              onMouseDown={(e) => handleTabClick(e, tab.id)} // Use onMouseDown for middle-click
              className={cn(
                'flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-t-md cursor-pointer border-b-2',
                isActive
                  ? 'bg-background border-primary text-primary'
                  : 'bg-secondary border-transparent hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate max-w-48">{tab.url.replace(/^https?:\/\//, '')}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
