// packages/utils/src/client-helpers.js (version 1.1.0)
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges CSS classes. This is a CLIENT-SAFE utility.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates a string to a specified length, adding an ellipsis if truncated.
 * @param {string} str The string to truncate.
 * @param {number} maxLength The maximum length of the string.
 * @returns {string} The truncated string.
 */
export function truncateString(str, maxLength = 100) {
  if (typeof str !== 'string' || str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...';
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {*} unsafe - The input to sanitize.
 * @returns {string} The sanitized string.
 */
export function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * A simple promise-based sleep function.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Groups an array of items by a specified country field.
 * @param {Array<object>} items - The array of items to group.
 * @param {string} countryField - The name of the field containing the country string.
 * @returns {object} An object with country names as keys and arrays of items as values.
 */
export function groupItemsByCountry(items, countryField) {
  return items.reduce((acc, item) => {
    const country = item[countryField];
    if (country) {
      if (!acc[country]) acc[country] = [];
      acc[country].push(item);
    }
    return acc;
  }, {});
}
