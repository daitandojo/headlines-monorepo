// packages/utils-shared/src/languages.js (NEW FILE)
import languageData from './data/languages.json' with { type: 'json' }

export const languageList = Object.keys(languageData).sort()
export const languageMap = new Map(Object.entries(languageData))
