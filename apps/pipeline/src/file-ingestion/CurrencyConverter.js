// apps/pipeline/src/file-ingestion/CurrencyConverter.js
// Currency conversion utilities for file ingestion

const FX_RATES_TO_EUR = {
  DKK: 0.134,
  SEK: 0.088,
  NOK: 0.086,
  CHF: 1.06,
  GBP: 1.17,
  USD: 0.92,
  EUR: 1.00,
}

export class CurrencyConverter {
  static toEURmillions(amount, currency) {
    if (amount === null || amount === undefined || !currency) {
      return null
    }
    
    const normalizedCurrency = currency.toUpperCase()
    const rate = FX_RATES_TO_EUR[normalizedCurrency]
    
    if (!rate) {
      console.warn(`  Unknown currency: ${currency}`)
      return null
    }
    
    return Math.round(amount * rate)
  }

  static parseWealthAmount(wealthString) {
    if (!wealthString) return { amount: null, currency: null }
    
    const upper = wealthString.toUpperCase()
    
    // Detect currency
    let currency = null
    if (upper.includes('KR.')) currency = 'DKK'
    else if (upper.includes('SEK')) currency = 'SEK'
    else if (upper.includes('NOK')) currency = 'NOK'
    else if (upper.includes('CHF')) currency = 'CHF'
    else if (upper.includes('£') || upper.includes('GBP')) currency = 'GBP'
    else if (upper.includes('$') || upper.includes('USD')) currency = 'USD'
    else if (upper.includes('€') || upper.includes('EUR')) currency = 'EUR'
    
    if (!currency) return { amount: null, currency: null }
    
    // Parse amount - handle Scandinavian notation
    // "38 mia. kr." = 38 billion = 38,000 million
    // "450 mio. kr." = 450 million
    
    // Remove currency and clean
    const numStr = upper
      .replace(/[A-Z€$£]/g, '')
      .replace(/\./g, '')  // Remove thousand separators
      .replace(/,/g, '.') // Convert decimal comma
      .trim()
      .replace(/[^\d.]/g, '')
    
    let rawAmount = parseFloat(numStr)
    if (isNaN(rawAmount)) return { amount: null, currency }
    
    // Detect scale: "mia" = billion, "mio" = million
    if (upper.includes('MIA') || upper.includes('MRD') || upper.includes('B')) {
      // Convert from billions to millions
      rawAmount = rawAmount * 1000
    }
    
    return { amount: rawAmount, currency }
  }
}