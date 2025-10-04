// packages/utils-shared/src/countries.js (CORRECTED)
import isoCountryFlags from './data/countries.json' with { type: 'json' }

const defaultFlag = '🌍'
const countryNameToIsoMap = new Map(Object.entries(isoCountryFlags))
const isoToFlagMap = new Map()

for (const [name, iso] of countryNameToIsoMap.entries()) {
  if (iso.length === 2) {
    const flag = iso
      .toUpperCase()
      .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    isoToFlagMap.set(iso, flag)
  } else {
    const specialFlags = { Global: '🌐', Europe: '🇪🇺', Scandinavia: '❄️' }
    if (specialFlags[name]) isoToFlagMap.set(iso, specialFlags[name])
  }
}

export function getCountryFlag(countryName) {
  // DEFINITIVE FIX: Add a type check to prevent crashes on invalid input.
  if (!countryName || typeof countryName !== 'string') {
    return defaultFlag
  }
  for (const [key, value] of countryNameToIsoMap.entries()) {
    if (key.toLowerCase() === countryName.trim().toLowerCase()) {
      const flag = isoToFlagMap.get(value)
      return flag || defaultFlag
    }
  }
  return defaultFlag
}
