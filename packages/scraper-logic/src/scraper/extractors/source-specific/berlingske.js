// packages/scraper-logic/src/scraper/extractors/source-specific/berlingske.js (version 1.0.0)
// Custom extractor for Berlingske - extracts from __NEXT_DATA__ embedded JSON
// Berlingske uses Next.js with hashed class names, so CSS selectors fail.
// All headlines are embedded as NewsArticle JSON-LD in the inline __NEXT_DATA__ script tag.
export const berlingskeExtractor = (html, $) => {
  const articles = []
  const seenUrls = new Set()

  // Find __NEXT_DATA__ script tag
  const nextDataEl = $('script[id="__NEXT_DATA__"]')
  if (!nextDataEl.length) return articles

  try {
    const nextData = JSON.parse(nextDataEl.html())
    const props = nextData.props?.pageProps || {}
    const data = props.data || {}

    // Extract from @graph arrays (JSON-LD structured data)
    const graphs = data['@graph'] || (Array.isArray(data) ? data : [])
    const itemLists = Array.isArray(graphs) ? graphs : [graphs]

    for (const list of itemLists) {
      if (!list) continue

      // ItemList structure
      const items = list.itemListElement || (Array.isArray(list) ? list : [list])
      const itemArray = Array.isArray(items) ? items : [items]

      for (const item of itemArray) {
        if (!item || typeof item !== 'object') continue

        // NewsArticle in @graph
        const article = item['@type'] === 'NewsArticle' ? item : null
        // Or item in itemListElement that is a NewsArticle
        const altArticle = item.item?.['@type'] === 'NewsArticle' ? item.item : null
        const target = article || altArticle

        if (target) {
          // headline: could be string or array of TextNode objects
          let headline = target.headline || target.name || ''
          if (Array.isArray(headline)) {
            for (const h of headline) {
              if (h?.value) { headline = h.value; break }
            }
          }
          if (typeof headline !== 'string') headline = ''

          // URL from @id or paths
          let url = target['@id'] || ''
          if (!url && target.publications?.length > 0) {
            const path = target.publications[0]?.paths?.[0]
            if (path) url = new URL(path, site.baseUrl).href
          }

          if (headline && url && !seenUrls.has(url)) {
            seenUrls.add(url)
            articles.push({
              headline: headline.trim(),
              link: url,
              description: null,
            })
          }
        }
      }
    }

    // Also check __APOLLO_STATE__ if present
    const apolloState = $('script[id="__APOLLO_STATE__"]')
    if (apolloState.length && articles.length === 0) {
      try {
        const apollo = JSON.parse(apolloState.html())
        for (const [key, value] of Object.entries(apollo)) {
          if (
            value?.__typename === 'NewsArticle' &&
            value.headline &&
            value.publications?.[0]?.paths?.[0]
          ) {
            let headline = value.headline
            if (Array.isArray(headline)) {
              for (const h of headline) {
                if (h?.value) { headline = h.value; break }
              }
            }
            const path = value.publications[0].paths[0]
            const url = new URL(path, site.baseUrl).href
            if (headline && !seenUrls.has(url)) {
              seenUrls.add(url)
              articles.push({ headline, link: url, description: null })
            }
          }
        }
      } catch (e) {
        // ignore apollo parse errors
      }
    }
  } catch (error) {
    // Return whatever was extracted before the error
  }

  return articles
}