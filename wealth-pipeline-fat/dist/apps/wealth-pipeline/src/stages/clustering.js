// apps/wealth-pipeline/src/stages/clustering.ts
// File 3 of 4
// One-line rationale: Correcting the `run` method signature to accept articles and return created events.
import { createEvent } from '@wealth/access';
import { ClusterAgent } from '@wealth/domain';
import { Types } from 'mongoose';
export class ClusteringStage {
    stats;
    constructor(stats) {
        this.stats = stats;
    }
    async run(articles) {
        // CORRECTED: Accepts and returns data
        console.log('\n--- STAGE 3: CLUSTERING ---');
        if (articles.length === 0) {
            console.log('No relevant articles pending clustering.');
            return [];
        }
        return this.processBatch(articles);
    }
    async processBatch(articles) {
        console.log(`Clustering ${articles.length} articles...`);
        const newEvents = [];
        try {
            const clusteredEvents = await ClusterAgent.cluster(articles);
            for (const evt of clusteredEvents) {
                const eventKey = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                const newEvent = await createEvent({
                    event_key: eventKey,
                    synthesized_headline: evt.headline,
                    synthesized_summary: evt.summary,
                    articles: evt.article_ids.map((id) => new Types.ObjectId(id)),
                    highest_relevance_score: evt.score,
                    country: ['Global'], // Placeholder
                });
                newEvents.push(newEvent);
            }
            this.stats.incrementBy('eventsSynthesized', newEvents.length);
            console.log(`🔗 Created ${clusteredEvents.length} clusters.`);
        }
        catch (e) {
            console.error('Clustering failed:', e.message);
            this.stats.addError(`Clustering error: ${e.message}`);
        }
        return newEvents;
    }
}
//# sourceMappingURL=clustering.js.map