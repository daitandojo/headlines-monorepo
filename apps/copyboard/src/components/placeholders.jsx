// File: apps/copyboard/src/components/placeholders.jsx
'use client'

// Simple placeholders to make the login page render without the full UI library.
export const Card = ({ className, children, ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
)
export const CardHeader = ({ className, children, ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
)
export const CardContent = ({ className, children, ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
)
export const CardFooter = ({ className, children, ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
)
export const Input = (props) => (
  <input {...props} className="p-2 border rounded w-full bg-gray-800 text-white" />
)
export const Button = ({ children, ...props }) => (
  <button {...props} className="p-2 bg-blue-600 text-white rounded w-full">
    {children}
  </button>
)
export const Label = (props) => <label {...props} className="block mb-1 text-sm" />
export const LoadingOverlay = ({ text }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center text-white">
    {text || 'Loading...'}
  </div>
)
