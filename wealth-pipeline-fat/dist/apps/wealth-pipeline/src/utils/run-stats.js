// apps/wealth-pipeline/src/utils/run-stats.ts
// File 1 of 4
// One-line rationale: Adding `incrementBy` method and fixing key types for robust metric tracking.
import { sendErrorAlert } from '@shared/server';
export class RunStatsManager {
    stats = {
        headlinesScraped: 0,
        headlinesAssessed: 0,
        relevantHeadlines: 0,
        articlesEnriched: 0,
        eventsSynthesized: 0,
        opportunitiesSaved: 0,
        eventsEmailed: 0,
        errors: [],
    };
    increment(key) {
        if (typeof this.stats[key] === 'number') {
            ;
            this.stats[key]++;
        }
    }
    incrementBy(key, amount) {
        if (typeof this.stats[key] === 'number') {
            ;
            this.stats[key] += amount;
        }
    }
    addError(msg) {
        this.stats.errors.push(msg);
        sendErrorAlert(new Error(msg), { origin: 'RunStatsManager' });
    }
    getSummary() {
        return `
    --- RUN SUMMARY ---
    Headlines Scraped:    ${this.stats.headlinesScraped}
    Headlines Assessed:   ${this.stats.headlinesAssessed}
    Relevant Signals:     ${this.stats.relevantHeadlines}
    Articles Enriched:    ${this.stats.articlesEnriched}
    Events Created:       ${this.stats.eventsSynthesized}
    Opportunities Found:  ${this.stats.opportunitiesSaved}
    Notifications Sent:   ${this.stats.eventsEmailed}
    Errors:               ${this.stats.errors.length}
    -------------------
    `;
    }
}
//# sourceMappingURL=run-stats.js.map