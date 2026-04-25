// apps/pipeline/src/file-ingestion/normalise.js
// Shared name normalisation for dedup consistency

export const normaliseName = (name) => {
  if (!name) return null
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-''.]/g, ' ')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}