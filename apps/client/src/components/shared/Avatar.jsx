// apps/client/src/components/shared/Avatar.jsx
'use client'

import React from 'react'
import Image from 'next/image'

function getInitialsColor(name) {
  if (!name) return '#6366f1'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  ]
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}

export function Avatar({ name, imageUrl, size = 40, className = '' }) {
  const initials = getInitials(name)
  const bgColor = getInitialsColor(name)
  const fontSize = Math.round(size / 2.5)

  if (imageUrl) {
    return (
      <div className={`relative shrink-0 rounded-full overflow-hidden ${className}`}
           style={{ width: size, height: size }}>
        <Image
          src={imageUrl}
          alt={name || 'Avatar'}
          fill
          unoptimized
          className="object-cover"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      </div>
    )
  }

  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-bold text-white select-none ${className}`}
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize }}
      title={name || 'Unknown'}
    >
      {initials}
    </div>
  )
}

export function AvatarWithFallback({ name, imageUrl, size = 40, className = '' }) {
  const [imgError, setImgError] = React.useState(false)
  if (imageUrl && !imgError) {
    return (
      <div className={`relative shrink-0 rounded-full overflow-hidden ${className}`}
           style={{ width: size, height: size }}>
        <Image
          src={imageUrl}
          alt={name || 'Avatar'}
          fill
          unoptimized
          className="object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }
  return <Avatar name={name} size={size} className={className} />
}