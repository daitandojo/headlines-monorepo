// packages/utils-shared/src/apiCallTracker.js (version 1.0.0)
import { logger } from './logger.js'

// Prices per 1000 calls in USD.
const servicePricing = {
  serper_news: 2.5,
  serper_search: 2.5,
  newsapi_search: 0, // Developer plan is free
  wikipedia: 0,
}

class ApiCallTracker {
  constructor() {
    this.usage = {}
    this.reset()
  }

  reset() {
    this.usage = {}
    Object.keys(servicePricing).forEach((service) => {
      this.usage[service] = { calls: 0, cost: 0 }
    })
  }

  recordCall(service) {
    if (!service) return

    if (!this.usage[service]) {
      logger.warn(
        `API call recorded for an un-priced service: ${service}. Calls will be tracked, but cost will be $0.`
      )
      this.usage[service] = { calls: 0, cost: 0 }
    }

    this.usage[service].calls += 1

    const pricePer1000 = servicePricing[service]
    if (pricePer1000) {
      this.usage[service].cost += pricePer1000 / 1000
    }
  }

  getStats() {
    return this.usage
  }
}

export const apiCallTracker = new ApiCallTracker()
