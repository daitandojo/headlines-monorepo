// packages/scraper-logic/src/browser.js
import fs from 'fs/promises'
import path from 'path'
import { getConfig } from './config.js'
import { browserManager } from './browserManager.js'

const CONSENT_SELECTORS = [
  'button:has-text("Accepteer alles")',
  'button:has-text("Alles accepteren")',
  'button:has-text("Toestemming geven")',
  'button:has-text("Akkoord")',
  'button:has-text("Accept all")',
  'button:has-text("Accept All")',
  'button:has-text("I accept")',
  'button:has-text("Accept")',
  'button:has-text("Godkend alle")',
  'button:has-text("Tillad alle")',
]

async function ensureDebugDirectory() {
  const config = getConfig()
  const debugDir = config.paths?.debugHtmlDir
  if (!debugDir) {
    getConfig().logger.warn('Debug HTML directory not configured. Saving disabled.')
    return null
  }
  try {
    await fs.mkdir(debugDir, { recursive: true })
    return debugDir
  } catch (error) {
    getConfig().logger.warn('Failed to create debug directory: ' + error.message)
    return null
  }
}

async function saveDebugHtml(page, caller, prefix, url) {
  const debugDir = await ensureDebugDirectory()
  if (!debugDir) return null
  try {
    const html = await page.content()
    const urlPart = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_')
    const filename = `${prefix}_${caller}_${urlPart}.html`
    const filePath = path.join(debugDir, filename)
    await fs.writeFile(filePath, html)
    getConfig().logger.warn(`[Playwright:${caller}] Saved debug HTML to ${filePath}`)
    return filePath
  } catch (error) {
    getConfig().logger.error(
      `[Playwright:${caller}] Failed to save debug HTML: ${error.message}`
    )
    return null
  }
}

async function handleConsent(page, caller) {
  for (const selector of CONSENT_SELECTORS) {
    try {
      const button = page.locator(selector).first()
      if (await button.isVisible({ timeout: 1500 })) {
        await button.click({ timeout: 2000 })
        getConfig().logger.info(
          `[Playwright:${caller}] Clicked consent button with selector: "${selector}"`
        )
        await page.waitForTimeout(1500)
        return true
      }
    } catch (e) {
      // Selector not found, continue
    }
  }
  getConfig().logger.trace(`[Playwright:${caller}] No actionable consent modal found.`)
  return false
}

export async function fetchPageWithPlaywright(url, caller = 'Unknown', options = {}) {
  const { timeout = 60000, waitForSelector } = options
  let page = null
  try {
    getConfig().logger.trace(
      `[Playwright:${caller}] Requesting new page for: ${url} (Timeout: ${timeout}ms)`
    )
    page = await browserManager.newPage()

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
    await handleConsent(page, caller)

    if (waitForSelector) {
      getConfig().logger.info(
        `[Playwright:${caller}] Waiting for selector "${waitForSelector}"...`
      )
      await page.waitForSelector(waitForSelector, { timeout: timeout - 5000 })
      getConfig().logger.info(`[Playwright:${caller}] Selector found. Page is ready.`)
    } else {
      await page
        .waitForLoadState('networkidle', { timeout: 5000 })
        .catch(() =>
          getConfig().logger.trace(
            `[Playwright:${caller}] Network idle timeout reached, proceeding anyway.`
          )
        )
    }

    return await page.content()
  } catch (error) {
    let reason = error.message.split('\n')[0]
    if (error.message.includes('net::ERR')) {
      reason = `Network Error: ${reason}`
    } else if (error.name === 'TimeoutError') {
      reason = `Timeout after ${timeout / 1000}s. The page may be too slow or blocked.`
    } else if (page) {
      const pageContent = await page.content()
      if (pageContent.includes('captcha') || pageContent.includes('challenge-platform')) {
        reason = 'Potential CAPTCHA or bot detection wall encountered.'
      }
    }

    getConfig().logger.error(
      `[Playwright:${caller}] Critical failure during fetch for ${url}: ${reason}`
    )
    if (page) {
      await saveDebugHtml(page, caller, 'CRITICAL_FAIL', url)
    }
    return null
  } finally {
    if (page) {
      await page.close()
      getConfig().logger.trace(`[Playwright:${caller}] Page closed for: ${url}`)
    }
  }
}

export async function fetchPageContentFromPopup(pageUrl, buttonSelector) {
  let page = null
  try {
    page = await browserManager.newPage()
    await page.goto(pageUrl, { waitUntil: 'networkidle' })
    await handleConsent(page, 'PopupFetcher')

    await page.waitForSelector(buttonSelector, { timeout: 10000 })
    const button = page.locator(buttonSelector).first()
    await button.click()

    await page.waitForSelector('.popup-overlay--opened', {
      state: 'visible',
      timeout: 5000,
    })

    const popupElement = await page.locator('.popup__box')
    const popupHtml = await popupElement.innerHTML()
    return popupHtml
  } catch (error) {
    getConfig().logger.error(
      { err: error, url: pageUrl, selector: buttonSelector },
      'Failed to fetch content from popup.'
    )
    return null
  } finally {
    if (page) {
      await page.close()
    }
  }
}
