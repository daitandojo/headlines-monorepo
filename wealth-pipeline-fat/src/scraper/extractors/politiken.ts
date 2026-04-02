import * as cheerio from 'cheerio'

export const politikenExtractor = (html: string) => {
  const $ = cheerio.load(html)
  const articles: any[] = []

  $('.article-teaser').each((_, el) => {
    const $el = $(el)
    const headline = $el.find('.headline').text().trim()
    const link = $el.find('a').attr('href')

    if (headline && link) {
      articles.push({ headline, link })
    }
  })
  return articles
}
