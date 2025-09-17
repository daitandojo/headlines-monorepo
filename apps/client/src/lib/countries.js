// A map of country names to their flag emojis.
const countryFlagMap = {
  'denmark': '🇩🇰',
  'norway': '🇳🇴',
  'sweden': '🇸🇪',
  'finland': '🇫🇮',
  'netherlands': '🇳🇱',
  'belgium': '🇧🇪',
  'united states': '🇺🇸',
  'united kingdom': '🇬🇧',
  'germany': '🇩🇪',
  'switzerland': '🇨🇭',
  // Special categories from your backend
  'global pe': '🌐',
  'm&a aggregators': '🤝',
};

const defaultFlag = '🌍'; // Fallback for any country not in the map

/**
 * Returns the flag emoji for a given country name in a case-insensitive manner.
 * @param {string | null | undefined} countryName - The name of the country (e.g., "Denmark").
 * @returns {string} The corresponding flag emoji.
 */
export function getCountryFlag(countryName) {
  if (!countryName) return defaultFlag;
  const normalizedName = countryName.trim().toLowerCase();
  return countryFlagMap[normalizedName] || defaultFlag;
}

// You can expand this list as needed
export const COMMON_COUNTRIES = [
    "Denmark",
    "Sweden",
    "Norway",
    "Finland",
    "Netherlands",
    "United Kingdom",
    "United States",
    "Germany",
    "Switzerland",
];