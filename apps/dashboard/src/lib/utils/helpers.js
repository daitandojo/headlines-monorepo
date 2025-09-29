// packages/utils-shared/src/helpers.js (Corrected)
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function truncateString(str, maxLength = 100) {
  if (typeof str !== 'string' || str.length <= maxLength) {
    return str
  }
  return str.substring(0, maxLength) + '...'
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
    }
  })
}

// NEW FUNCTION ADDED
export function groupItemsByCountry(items, countryKey) {
  if (!items) return {}
  return items.reduce((acc, item) => {
    const country = item[countryKey] || 'Unknown'
    if (!acc[country]) {
      acc[country] = []
    }
    acc[country].push(item)
    return acc
  }, {})
}
