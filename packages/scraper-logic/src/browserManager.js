// packages/scraper-logic/src/browserManager.js
import playwright from 'playwright'
import { getConfig } from './config.js'

const BROWSER_HEADERS = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9,nl-NL;q=0.8,nl;q=0.7',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

class BrowserManager {
  constructor() {
    this.browser = null
    this.context = null
  }

  async initialize() {
    if (this.browser) {
      return
    }
    const { logger } = getConfig()
    logger.info('[BrowserManager] Initializing persistent browser instance...')
    try {
      this.browser = await playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })
      this.context = await this.browser.newContext({
        userAgent: BROWSER_HEADERS['User-Agent'],
        extraHTTPHeaders: BROWSER_HEADERS,
        viewport: { width: 1920, height: 1080 },
      })
      logger.info('[BrowserManager] ✅ Browser instance ready.')
    } catch (error) {
      logger.fatal({ err: error }, '[BrowserManager] CRITICAL: Failed to launch browser.')
      throw error
    }
  }

  async newPage() {
    if (!this.context) {
      throw new Error('BrowserManager not initialized. Call initialize() first.')
    }
    return this.context.newPage()
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.context = null
      getConfig().logger.info('[BrowserManager] Persistent browser instance closed.')
    }
  }
}

// Export a singleton instance of the manager
export const browserManager = new BrowserManager()
