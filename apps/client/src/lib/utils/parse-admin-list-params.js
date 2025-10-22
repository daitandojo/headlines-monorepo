// apps/client/src/lib/utils/parse-admin-list-params.js
/**
 * Parses common list-view search parameters for admin pages.
 * @param {object} searchParams - The searchParams object from a Next.js page component.
 * @param {string} [filterId='name'] - The primary ID used for the text filter.
 * @returns {{page: number, sort: string|null, filters: object}}
 */
export function parseAdminListParams(searchParams, filterId = 'name') {
  const page = parseInt(searchParams?.page || '1', 10)
  const sort = searchParams?.sort || null
  const columnFilters = searchParams?.filters ? JSON.parse(searchParams.filters) : []

  const filters = columnFilters.reduce((acc, filter) => {
    if (filter.value) {
      // The main text filter is mapped to 'q' for the API
      const key = filter.id === filterId ? 'q' : filter.id
      acc[key] = filter.value
    }
    return acc
  }, {})

  return { page, sort, filters }
}
