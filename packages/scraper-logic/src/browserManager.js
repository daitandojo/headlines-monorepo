// packages/scraper-logic/src/browserManager.js
import playwright from 'playwright'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { createRequire } from 'module'
import { getConfig } from './config.js'

const _require = createRequire(import.meta.url)
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

  async _ensureBrowserInstalled(logger) {
    const { chromium } = playwright
    try {
      const regularPath = chromium.executablePath()
      // Derive headless shell path: Playwright 1.56+ uses a separate binary for headless mode
      const headlessPath = regularPath
        .replace('/chromium-', '/chromium_headless_shell-')
        .replace('/chrome-linux/chrome', '/chrome-linux/headless_shell')

      const regularExists = existsSync(regularPath)
      const headlessExists = existsSync(headlessPath)

      if (regularExists && headlessExists) {
        logger.info(`[BrowserManager] ✅ Browser executables found (regular + headless shell)`)
        return
      }

      const missing = []
      if (!regularExists) missing.push(regularPath)
      if (!headlessExists) missing.push(headlessPath)

      logger.warn(`[BrowserManager] Browser executables missing: ${missing.join(', ')}`)
      logger.info('[BrowserManager] Attempting to auto-install Playwright browsers...')

      try {
        execSync('npx playwright install chromium', {
          stdio: 'pipe',
          timeout: 180000, // 3 min timeout for download
          cwd: process.cwd(),
        })
        logger.info('[BrowserManager] ✅ Playwright browsers auto-installed successfully.')
      } catch (installErr) {
        logger.error(
          { err: installErr },
          '[BrowserManager] "npx" approach failed. Trying direct CLI path from workspace...'
        )
        // Fallback: use the node_modules playwright CLI directly (matches exact workspace version)
        const playwrightCliPath = _require.resolve('playwright/cli.js')
        execSync(`node "${playwrightCliPath}" install chromium`, {
          stdio: 'pipe',
          timeout: 180000,
        })
        logger.info('[BrowserManager] ✅ Playwright browsers auto-installed via direct CLI path.')
      }

      // Verify installation succeeded
      if (!existsSync(headlessPath)) {
        logger.warn(`[BrowserManager] ⚠️ Headless shell still missing after install at: ${headlessPath}`)
      }
    } catch (checkErr) {
      logger.warn(
        { err: checkErr },
        '[BrowserManager] Could not check/install browser. Proceeding with launch attempt.'
      )
    }
  }

  async initialize() {
    if (this.browser) {
      return
    }
    const { logger } = getConfig()
    logger.info('[BrowserManager] Initializing persistent browser instance...')

    // Self-heal: auto-install browser if missing (e.g., after Playwright update)
    await this._ensureBrowserInstalled(logger)

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
