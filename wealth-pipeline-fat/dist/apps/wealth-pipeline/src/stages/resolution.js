// apps/wealth-pipeline/src/stages/resolution.ts
// File 1 of 1
// One-line rationale: Removing the unused `dependencies` class property to fix the linter error.
import { apiClient, GraphAgent } from '@wealth/domain';
export class ResolutionStage {
    // The constructor still accepts dependencies, as it might be needed for other methods in the future,
    // but we won't store it if it's not used in this specific implementation.
    constructor(_dependencies) {
        // this.dependencies = dependencies // REMOVED
    }
    async run(enrichedEvents) {
        console.log('\n--- STAGE 5: ENTITY RESOLUTION & GRAPH LINKING ---');
        if (enrichedEvents.length === 0) {
            console.log('No high-value events to process for graph linking.');
            return;
        }
        let triplesCount = 0;
        for (const event of enrichedEvents) {
            console.log(`  -> Linking entities for event: ${event.event_key}`);
            const textContext = `Headline: ${event.synthesized_headline}\nSummary: ${event.synthesized_summary}`;
            const result = await GraphAgent.extractTriples(textContext);
            if (result && result.relationships && result.relationships.length > 0) {
                const triples = result.relationships.map((r) => ({
                    subject: r[0],
                    predicate: r[1],
                    object: r[2],
                }));
                try {
                    // This API call is self-contained and doesn't need the `dependencies` object.
                    await apiClient.executeSystemTool({
                        toolName: 'ingest-triples',
                        params: { userId: 'headlines-system', triples },
                    });
                    triplesCount += triples.length;
                }
                catch (e) {
                    console.warn(`Graph ingest failed for ${event.event_key}:`, e.message);
                }
            }
        }
        console.log(`🔗 Graph Update: Extracted and queued ${triplesCount} new relationships.`);
    }
}
//# sourceMappingURL=resolution.js.map