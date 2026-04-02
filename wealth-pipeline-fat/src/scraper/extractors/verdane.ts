import * as cheerio from 'cheerio'

export const verdaneExtractor = (html: string) => {
  const $ = cheerio.load(html)
  const articles: any[] = []

  $('.news-item').each((_, el) => {
    const $el = $(el)
    const headline = $el.find('h3').text().trim()
    const link = $el.find('a').attr('href')

    if (headline && link) {
      articles.push({ headline, link })
    }
  })
  return articles
}
