// packages/ui/src/page-header.jsx (version 2.0.0)
'use client'

import { motion } from 'framer-motion'

export function PageHeader({ title, description, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="flex-shrink-0 flex justify-between items-start"
    >
      <div>
        <h1 className="text-4xl font-bold tracking-tighter">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </motion.div>
  )
}
// This is a default export now.
export default PageHeader;
