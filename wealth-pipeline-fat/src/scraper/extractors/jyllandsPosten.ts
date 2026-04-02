import * as cheerio from 'cheerio'

export const jyllandsPostenExtractor = (html: string) => {
  const $ = cheerio.load(html)
  const articles: any[] = []

  $('article.teaser').each((_, el) => {
    const $el = $(el)
    const headline = $el.find('h2.teaser__title').text().trim()
    const link = $el.find('a.teaser__link').attr('href')

    if (headline && link) {
      articles.push({ headline, link })
    }
  })
  return articles
}
