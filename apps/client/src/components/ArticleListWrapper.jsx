// src/components/ArticleListWrapper.jsx (version 1.0)
'use client'

import { ArticleList } from './ArticleList'

export function ArticleListWrapper({ items, onDelete }) {
  // The 'items' prop from DataView maps to the 'articles' prop for ArticleList
  return <ArticleList articles={items} onDelete={onDelete} />
}
