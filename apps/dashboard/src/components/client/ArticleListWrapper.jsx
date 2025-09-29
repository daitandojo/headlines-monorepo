// Full Path: headlines/src/components/client/ArticleListWrapper.jsx
'use client'

import { ArticleList } from './ArticleList'

export function ArticleListWrapper({ items, onDelete }) {
  return <ArticleList articles={items} onDelete={onDelete} />
}
