// packages/utils-shared/src/helpers.js (NEW FILE)
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
