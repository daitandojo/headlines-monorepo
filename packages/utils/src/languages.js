// packages/utils/src/languages.js (version 1.0.0)
import languageData from './data/languages.json' with { type: 'json' };

/**
 * An array of language names.
 * @type {string[]}
 */
export const languageList = Object.keys(languageData).sort();

/**
 * A map of language names to their two-letter ISO codes.
 * @type {Map<string, string>}
 */
export const languageMap = new Map(Object.entries(languageData));
