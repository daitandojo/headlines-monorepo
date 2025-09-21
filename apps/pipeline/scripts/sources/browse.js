// apps/pipeline/scripts/sources/browse.js (version 1.0)
import readline from 'readline'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as cheerio from 'cheerio'
import { fetchPageWithPlaywright } from '@headlines/scraper-logic/src/browser.js'
import { heuristicallyFindSelectors } from '@headlines/scraper-logic/src/scraper/selectorOptimizer.js'
import { sectionClassifierAgent } from '@headlines/scraper-logic/src/ai/index.js'
import { logger } from '../../../../packages/utils-server'
undefined

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const color = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
}

let currentUrl = ''
let currentLinks = []

async function listLinks(url) {
  logger.info(`Crawling ${url}...`)
  const html = await fetchPageWithPlaywright(url, 'SourceBrowser')
  if (!html) {
    logger.error('Failed to fetch page.')
    return
  }
  const $ = cheerio.load(html)
  const baseUrlObj = new URL(url)
  const linksToClassify = []
  $('a').each((_, el) => {
    const $el = $(el)
    const href = $el.attr('href')
    const text = $el.text().trim().replace(/\s+/g, ' ')
    if (href && text && !href.startsWith('#') && !href.startsWith('mailto:')) {
      try {
        const fullUrl = new URL(href, baseUrlObj.origin).href
        linksToClassify.push({ text, href: fullUrl })
      } catch (e) {
        /* ignore */
      }
    }
  })

  const uniqueLinks = [
    ...new Map(linksToClassify.map((item) => [item.href, item])).values(),
  ]
  logger.info(`Found ${uniqueLinks.length} links. Classifying with AI...`)
  const classifications = await sectionClassifierAgent(
    uniqueLinks.map((l) => ({ text: l.text, href: l.href }))
  )
  if (!classifications) {
    logger.error('AI classification failed.')
    currentLinks = []
    return
  }

  currentLinks = uniqueLinks.map((link, i) => ({
    ...link,
    type: classifications[i].classification,
  }))

  currentLinks.forEach((link, i) => {
    let typeColor = color.gray
    if (link.type === 'news_section') typeColor = color.yellow
    if (link.type === 'article_headline') typeColor = color.cyan
    console.log(
      `[${i.toString().padStart(2)}] ${typeColor}[${link.type.padEnd(16)}]${color.reset} ${link.text.substring(0, 80)}`
    )
    console.log(`    ${color.gray}${link.href}${color.reset}`)
  })
}

async function handleCommand(command) {
  const parts = command.trim().split(' ')
  const cmd = parts[0].toLowerCase()
  const arg = parts.slice(1).join(' ')

  switch (cmd) {
    case 'ls':
      await listLinks(currentUrl)
      break
    case 'cd':
      const newUrl =
        !isNaN(arg) && currentLinks[parseInt(arg, 10)]
          ? currentLinks[parseInt(arg, 10)].href
          : arg
      if (newUrl) {
        currentUrl = newUrl
        console.log(`Changed directory to: ${currentUrl}`)
        await listLinks(currentUrl)
      } else {
        console.log("Invalid argument. Use 'cd <url>' or 'cd <index>'.")
      }
      break
    case 'optimize':
      logger.info(`Optimizing selectors for ${currentUrl}...`)
      const html = await fetchPageWithPlaywright(currentUrl, 'SourceBrowser')
      const suggestions = heuristicallyFindSelectors(html)
      suggestions.forEach((cluster, i) => {
        console.log(`--- Suggestion #${i + 1} (Score: ${cluster.score}) ---`)
        console.log(`Selector: ${color.green}${cluster.selector}${color.reset}`)
        console.log(`Samples:`)
        cluster.samples.slice(0, 3).forEach((sample) => console.log(`  - "${sample}"`))
      })
      break
    case 'help':
      console.log('Commands: ls, cd <url|index>, optimize, exit, help')
      break
    case 'exit':
      rl.close()
      return
    default:
      console.log("Unknown command. Type 'help'.")
  }
  prompt()
}

function prompt() {
  const promptPath = new URL(currentUrl).pathname
  rl.question(`${color.magenta}${promptPath}>${color.reset} `, handleCommand)
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('url', { type: 'string', demandOption: true })
    .help().argv
  currentUrl = argv.url
  console.log("Welcome to the Interactive Source Browser. Type 'help' for commands.")
  await listLinks(currentUrl)
  prompt()
}

main()
