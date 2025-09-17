// packages/utils/src/countries.js (version 2.7.0)
import isoCountryFlags from './data/countries.json' with { type: 'json' };

const defaultFlag = '🌍';
const countryNameToIsoMap = new Map(Object.entries(isoCountryFlags));
const isoToFlagMap = new Map();

// Pre-compute ISO to Flag mapping
for (const [name, iso] of countryNameToIsoMap.entries()) {
    if (iso.length === 2) {
        const flag = iso.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
        isoToFlagMap.set(iso, flag);
    } else {
        const specialFlags = { "Global": "🌐", "Europe": "🇪🇺", "Scandinavia": "❄️" };
        if(specialFlags[name]) isoToFlagMap.set(iso, specialFlags[name]);
    }
}

/**
 * Returns the flag emoji for a given country name in a case-insensitive manner.
 * @param {string | null | undefined} countryName - The name of the country.
 * @returns {string} The corresponding flag emoji.
 */
export function getCountryFlag(countryName) {
  if (!countryName) return defaultFlag;
  for (const [key, value] of countryNameToIsoMap.entries()) {
      if (key.toLowerCase() === countryName.trim().toLowerCase()) {
          const flag = isoToFlagMap.get(value);
          return flag || defaultFlag;
      }
  }
  return defaultFlag;
}

export const COMMON_COUNTRIES = [
  'Denmark',
  'Sweden',
  'Norway',
  'Finland',
  'Netherlands',
  'United Kingdom',
  'United States',
  'Germany',
  'Switzerland',
];
