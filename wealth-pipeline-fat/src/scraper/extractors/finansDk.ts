import * as cheerio from 'cheerio'

export const finansDkExtractor = (html: string) => {
  const $ = cheerio.load(html)
  const articles: any[] = []

  // Example selector logic based on legacy code
  $('.article-teaser').each((_, el) => {
    const $el = $(el)
    const headline = $el.find('h2').text().trim()
    const link = $el.find('a').attr('href')

    if (headline && link) {
      articles.push({ headline, link })
    }
  })
  return articles
}
