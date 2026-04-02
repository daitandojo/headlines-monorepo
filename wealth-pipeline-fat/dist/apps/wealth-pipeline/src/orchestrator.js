// apps/wealth-pipeline/src/orchestrator.ts
// File 4 of 4
// One-line rationale: Full unabridged orchestrator with corrected stage method calls and RunStatsManager usage.
import { HeadlinesScraper } from './scraper/index.js';
import { dbConnect } from '@wealth/access';
import { EmailService } from '@wealth/domain';
import { TriageStage } from './stages/triage.js';
import { ClusteringStage } from './stages/clustering.js';
import { DeepDiveStage } from './stages/deep-dive.js';
import { ResolutionStage } from './stages/resolution.js';
import { RunStatsManager } from './utils/run-stats.js';
export class PipelineOrchestrator {
    scraper;
    emailer;
    stats;
    resolution;
    triage;
    clustering;
    deepDive;
    constructor(dependencies) {
        this.scraper = new HeadlinesScraper();
        this.emailer = new EmailService();
        this.stats = new RunStatsManager();
        this.triage = new TriageStage(this.stats);
        this.clustering = new ClusteringStage(this.stats);
        this.deepDive = new DeepDiveStage(this.scraper, this.stats);
        this.resolution = new ResolutionStage(dependencies);
    }
    async run(dependencies, params = {}) {
        console.log('🚀 [Wealth Pipeline] Starting run...');
        const ghostMode = params.ghostMode ?? true;
        try {
            await dbConnect();
            await this.scraper.init();
            const freshArticles = await this.triage.run();
            if (freshArticles.length === 0) {
                console.log('No new articles to process. Ending run early.');
                return this.stats.getSummary();
            }
            const newEvents = await this.clustering.run(freshArticles);
            if (newEvents.length === 0) {
                console.log('No new events created from clusters. Ending run.');
                return this.stats.getSummary();
            }
            const { opportunities, events: enrichedEvents } = await this.deepDive.run(newEvents);
            await this.resolution.run(enrichedEvents);
            console.log(`\n--- STAGE 5: NOTIFICATION (${ghostMode ? 'Ghost Mode' : 'Live Mode'}) ---`);
            if (ghostMode) {
                console.log(`👻  Ghost Mode: ${opportunities.length} new opportunities and ${enrichedEvents.length} new events were saved.`);
            }
            else if (opportunities.length > 0 || enrichedEvents.length > 0) {
                const sentCount = await this.emailer.dispatchNotifications(enrichedEvents, opportunities);
                this.stats.incrementBy('eventsEmailed', sentCount);
                console.log(`📧  Live Mode: Dispatched notifications to ${sentCount} subscribers.`);
            }
            else {
                console.log('No new actionable intelligence to report.');
            }
        }
        catch (err) {
            console.error('🔥 [Wealth Pipeline] Fatal error:', err);
            this.stats.addError(`Orchestrator_Fatal: ${err.message}`);
        }
        finally {
            await this.scraper.close();
            const summary = this.stats.getSummary();
            console.log(summary);
            if (dependencies?.operation?.addJob) {
                await dependencies.operation.addJob('send-supervisor-report', {
                    statsSummary: summary,
                });
            }
            console.log('🏁 [Wealth Pipeline] Run complete.');
            return summary;
        }
    }
}
export const orchestrator = new PipelineOrchestrator(undefined);
//# sourceMappingURL=orchestrator.js.map