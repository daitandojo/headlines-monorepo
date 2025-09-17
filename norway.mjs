import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer' // <-- Import Puppeteer
import * as cheerio from 'cheerio'
import * as readline from 'readline/promises'
import { stdin as input, stdout as output } from 'process'

// --- Configuration ---
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'norway.json')
const AUTOPILOT_DELAY = 2000 // 2-second delay between requests in autopilot mode

// --- ANSI Colors for better console logging ---
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

/**
 * Loads and parses the JSON data from the file.
 * @returns {Promise<object>} The parsed data object.
 */
const loadData = async () => {
  try {
    const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error(`${colors.red}Error loading data file: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

/**
 * Saves the updated data object back to the JSON file.
 * @param {object} data - The data object to save.
 */
const saveData = async (data) => {
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2))
}

/**
 * Extracts all available structured and unstructured data from the profile's HTML content.
 * Handles both "modern" and "legacy" page layouts.
 * @param {string} html - The HTML content of the profile page.
 * @returns {object} The scraped data.
 */
const extractProfileData = (html) => {
  const $ = cheerio.load(html)
  const scrapedData = {
    page_type: 'unknown',
    date_of_birth: null,
    city: null,
    education: null,
    current_wealth: null,
    wealth_summary: null,
    background_information: null,
    roles: [],
    latest_news: [],
    embedded_article_links: [],
  }

  // --- Helper to clean up text
  const cleanText = (text) => text.trim().replace(/\s\s+/g, ' ')

  // --- Check for "Modern" Layout ---
  if ($('main nav').length > 0) {
    scrapedData.page_type = 'modern'
    const baseUrl = 'https://www.finansavisen.no'

    // Key-value data
    $('h2:contains("Bakgrunn")')
      .parent()
      .find('div.font-medium.text-gray-500')
      .each((i, el) => {
        const key = $(el).text().trim().toLowerCase()
        const value = $(el).next('.font-semibold').text().trim()
        if (value) {
          if (key === 'født') scrapedData.date_of_birth = value
          if (key === 'bosted') scrapedData.city = value
          if (key === 'utdannelse') scrapedData.education = value
        }
      })

    // Background text and embedded links
    const backgroundProse = $('h2:contains("Bakgrunn")').parent().find('.prose')
    scrapedData.background_information = cleanText(backgroundProse.text())
    backgroundProse.find('a').each((i, el) => {
      const link = $(el).attr('href')
      if (link) {
        scrapedData.embedded_article_links.push({
          text: cleanText($(el).text()),
          url: new URL(link, baseUrl).href,
        })
      }
    })

    // Wealth summary text
    scrapedData.wealth_summary = cleanText($('div.scrollbar-hide > div > p').text())

    // Business Roles
    $('h2:contains("Roller i norsk næringsliv")')
      .parent()
      .find('h3')
      .each((i, el) => {
        const roleType = cleanText($(el).text())
        $(el)
          .next('ul')
          .find('li a')
          .each((j, linkEl) => {
            scrapedData.roles.push({
              role: roleType,
              company: cleanText($(linkEl).text()),
              url: $(linkEl).attr('href'),
            })
          })
      })

    // Latest News
    $('hegnar-market-news[title="Siste nytt"]')
      .find('div.divide-y > a')
      .each((i, el) => {
        const relativeUrl = $(el).attr('href')
        const headline = cleanText($(el).find('h3').text())
        if (relativeUrl && headline) {
          scrapedData.latest_news.push({
            headline,
            url: new URL(relativeUrl, baseUrl).href,
          })
        }
      })
  }
  // --- Check for "Legacy" Layout ---
  else if ($('.c-kapital-index-profile__main').length > 0) {
    scrapedData.page_type = 'legacy'
    const baseUrl = 'https://www.kapital.no'

    // Key-value data
    $('.c-kapital-index-profile__higlights__item').each((i, el) => {
      const label = $(el).find('.label').text().trim().toLowerCase()
      const value = $(el).find('.value').text().trim()
      if (label === 'født') scrapedData.date_of_birth = value
      if (label === 'bosted') scrapedData.city = value
      if (label === 'utdannelse') scrapedData.education = value
    })

    // Current Wealth Figure
    const wealthText = cleanText(
      $('.c-kapital-index-profile__status:contains("mrd formue")').text()
    )
    if (wealthText) scrapedData.current_wealth = wealthText

    // Background text and embedded links
    const listInfo = cleanText($('.c-kapital-index-profile__list-info').text())
    const bodyInfoEl = $('h4:contains("Bakgrunn")').next('.c-kapital-index-profile__body')
    const bodyInfoText = cleanText(bodyInfoEl.text())
    scrapedData.background_information = [listInfo, bodyInfoText].filter(Boolean).join('\n\n')
    bodyInfoEl.find('a').each((i, el) => {
      const link = $(el).attr('href')
      if (link) {
        scrapedData.embedded_article_links.push({
          text: cleanText($(el).text()),
          url: new URL(link, baseUrl).href,
        })
      }
    })

    // Latest News
    $('.c-kapital-index-profile__articles article.c-teaser').each((i, el) => {
      const linkEl = $(el).find('a.c-teaser__content__title__link')
      const relativeUrl = linkEl.attr('href')
      const headline = cleanText(linkEl.text())
      if (relativeUrl && headline) {
        scrapedData.latest_news.push({
          headline,
          url: new URL(relativeUrl, baseUrl).href,
        })
      }
    })
  } else {
    throw new Error('Could not identify page layout. Neither modern nor legacy structure found.')
  }

  return scrapedData
}

/**
 * The main function to orchestrate the scraping process.
 */
const runScraper = async () => {
  const rl = readline.createInterface({ input, output })
  const data = await loadData()
  const individuals = data.individuals
  const total = individuals.length
  const counts = { processed: 0, skipped: 0, error: 0 }

  console.clear()
  console.log(`${colors.bright}${colors.blue}--- Scraper Initialized ---${colors.reset}`)

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
  )

  let currentIndex = 0
  let isAutopilotMode = false

  try {
    while (currentIndex >= 0 && currentIndex < total) {
      const individual = individuals[currentIndex]
      const progress = `[${currentIndex + 1}/${total}]`
      let choice = ''

      if (isAutopilotMode) {
        if (individual.scraped_data) {
          console.log(
            `${colors.dim}${progress} Skipping ${individual.name} (already scraped).${colors.reset}`
          )
          counts.skipped++
          currentIndex++
          await new Promise((resolve) => setTimeout(resolve, 50))
          continue
        } else {
          console.log(`${progress} Scraping ${individual.name}...`)
          choice = 'p'
        }
      } else {
        const summary = `(Processed: ${colors.green}${counts.processed}${colors.reset}, Skipped: ${colors.yellow}${counts.skipped}${colors.reset}, Errors: ${colors.red}${counts.error}${colors.reset})`
        console.clear()
        console.log(
          `${colors.bright}${progress} Processing: ${individual.name} (Rank: ${individual.rank}) ${summary}${colors.reset}`
        )
        if (individual.scraped_data) {
          console.log(
            `${colors.yellow}Status: Already scraped (page type: ${individual.scraped_data.page_type}).${colors.reset}`
          )
        } else if (individual.scrape_error) {
          console.log(
            `${colors.red}Status: Last attempt failed: ${individual.scrape_error}${colors.reset}`
          )
        }
        console.log(`URL: ${colors.dim}${individual.profile_url}${colors.reset}\n`)
        choice = (
          await rl.question(
            `${colors.cyan}Action: (p)roceed, (r)e-scrape, (s)kip, (b)ack, [rank #], (a)ll, (e)xit -> ${colors.reset}`
          )
        ).toLowerCase()
      }

      const rankJump = parseInt(choice, 10)

      if (choice === 'e') break
      if (choice === 'a') {
        isAutopilotMode = true
        console.log(`\n${colors.bright}${colors.blue}--- Autopilot Mode Activated ---${colors.reset}`)
        await new Promise((resolve) => setTimeout(resolve, 1500))
        continue
      }
      if (!isNaN(rankJump)) {
        const targetIndex = individuals.findIndex((p) => p.rank === rankJump)
        if (targetIndex !== -1) currentIndex = targetIndex
        else {
          console.log(`${colors.red}Rank ${rankJump} not found. Press ENTER.${colors.reset}`)
          await rl.question('')
        }
        continue
      }
      if (choice === 'b') {
        currentIndex = Math.max(0, currentIndex - 1)
        continue
      }
      if (choice === 's' || ((choice === 'p' || choice === '') && individual.scraped_data)) {
        counts.skipped++
        currentIndex++
        continue
      }

      try {
        if (individual.scrape_error) delete individual.scrape_error
        if (!isAutopilotMode) console.log(`${colors.dim}Navigating to page...${colors.reset}`)
        await page.goto(individual.profile_url, { waitUntil: 'networkidle0', timeout: 60000 })
        const html = await page.content()
        const scrapedData = extractProfileData(html)
        individual.scraped_data = scrapedData
        counts.processed++
        const summary = `(Layout: ${scrapedData.page_type}, Roles: ${scrapedData.roles.length}, News: ${scrapedData.latest_news.length}, Embedded Links: ${scrapedData.embedded_article_links.length})`
        console.log(`${isAutopilotMode ? '' : '\n'}${colors.green}SUCCESS: Scraped ${individual.name} ${summary}${colors.reset}`)
      } catch (error) {
        console.error(
          `\n${colors.red}ERROR: Could not process ${individual.name}. Reason: ${error.message}${colors.reset}`
        )
        individual.scrape_error = error.message
        counts.error++
      }

      await saveData(data)
      if (!isAutopilotMode) {
        console.log(`${colors.green}Progress saved to norway.json.${colors.reset}`)
        await rl.question(`${colors.dim}Press ENTER to continue...${colors.reset}`)
      } else {
        await new Promise((resolve) => setTimeout(resolve, AUTOPILOT_DELAY))
      }
      currentIndex++
    }
  } finally {
    await browser.close()
    rl.close()
  }

  console.log(`\n${colors.bright}${colors.blue}--- Scraping Process Finished ---${colors.reset}`)
  console.log(`Successfully processed: ${colors.green}${counts.processed}${colors.reset}`)
  console.log(`Skipped (already done/user): ${colors.yellow}${counts.skipped}${colors.reset}`)
  console.log(`Failed attempts: ${colors.red}${counts.error}${colors.reset}`)
}

runScraper()