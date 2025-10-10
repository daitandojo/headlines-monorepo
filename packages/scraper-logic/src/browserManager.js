// packages/scraper-logic/src/browserManager.js
import playwright from 'playwright'
import { getConfig } from './config.js'
import { env } from '@headlines/config/node'

const GOOGLEBOT_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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

    const isSpoofing = env.DEV_SPOOF_GOOGLEBOT === 'true'
    if (isSpoofing) {
      logger.warn(
        '⚠️ [BrowserManager] DEVELOPMENT MODE: Spoofing Googlebot User-Agent to bypass paywalls.'
      )
    }

    try {
      this.browser = await playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })
      this.context = await this.browser.newContext({
        userAgent: isSpoofing ? GOOGLEBOT_USER_AGENT : DEFAULT_USER_AGENT,
        // Remove other headers that could reveal our identity when spoofing
        extraHTTPHeaders: isSpoofing
          ? {}
          : {
              'Accept-Language': 'en-US,en;q=0.9',
            },
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
