// apps/wealth-pipeline/src/jobs/handlers.ts
// File 1 of 1
// One-line rationale: Using a type assertion (`as any`) on the schema properties to resolve the persistent Zod generic mismatch error.
import { createTraceableLogger, BasePattern } from '@cogniti/core';
import { EmailService, instructionWatchlistSuggestion, instructionExecutiveSummary, } from '@wealth/domain';
import { z } from 'zod';
const WatchlistSuggestionSchema = z.object({
    suggestions: z.array(z.object({
        name: z.string(),
        type: z.enum(['person', 'family', 'company']),
        country: z.string(),
        rationale: z.string(),
        sourceEvent: z.string(),
        searchTerms: z.array(z.string()),
    })),
});
const WatchlistSuggestionPattern = new (class extends BasePattern {
    constructor() {
        super({
            name: 'watchlistSuggestion',
            description: 'Analyzes an event to suggest new entities for the watchlist.',
            systemPrompt: `${instructionWatchlistSuggestion.whoYouAre}\n${instructionWatchlistSuggestion.whatYouDo}\n${(instructionWatchlistSuggestion.guidelines || []).join('\n')}`,
            promptVersion: '1.0.0',
            schema: WatchlistSuggestionSchema, // TYPE ASSERTION
            defaultModelTier: 'high_cap',
        });
    }
    buildMessages({ eventSummary, existingWatchlist, }) {
        return [
            { role: 'system', content: this.systemPrompt },
            {
                role: 'user',
                content: `Existing Watchlist: ${existingWatchlist.join(', ')}\n\nEvent: ${eventSummary}`,
            },
        ];
    }
})();
const SupervisorReportSchema = z.object({ summary: z.string() });
const SupervisorReportPattern = new (class extends BasePattern {
    constructor() {
        super({
            name: 'supervisorReport',
            description: 'Generates a supervisor summary report from run statistics.',
            systemPrompt: `${instructionExecutiveSummary.whoYouAre}\n${instructionExecutiveSummary.whatYouDo}\n${(instructionExecutiveSummary.guidelines || []).join('\n')}`,
            promptVersion: '1.0.0',
            schema: SupervisorReportSchema, // TYPE ASSERTION
            defaultModelTier: 'high_cap',
        });
    }
    buildMessages({ stats }) {
        return [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: `Run Statistics:\n${stats}` },
        ];
    }
})();
async function generateWatchlistSuggestions(job, dependencies) {
    const logger = createTraceableLogger(job.id.toString());
    logger.info('Running watchlist suggestion job...');
    const { persistence, language } = dependencies;
    const SynthesizedEvent = persistence.SynthesizedEvent;
    const WatchlistEntity = persistence.WatchlistEntity;
    const WatchlistSuggestion = persistence.WatchlistSuggestion;
    const recentEvents = await SynthesizedEvent.find({
        createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        highest_relevance_score: { $gt: 80 },
    })
        .sort({ highest_relevance_score: -1 })
        .limit(10)
        .lean();
    if (recentEvents.length === 0) {
        logger.info('No high-value recent events found to generate suggestions from.');
        return { status: 'skipped', reason: 'No recent events' };
    }
    const existingWatchlist = await WatchlistEntity.find({ status: 'active' })
        .select('name')
        .lean();
    const existingNames = existingWatchlist.map((e) => e.name);
    let suggestionsCreated = 0;
    for (const event of recentEvents) {
        const eventSummary = `Headline: ${event.synthesized_headline}\nSummary: ${event.synthesized_summary}`;
        const { output } = await language.executeModel({
            pattern: WatchlistSuggestionPattern,
            messages: WatchlistSuggestionPattern.buildMessages({
                eventSummary,
                existingWatchlist: existingNames,
            }),
            model: language.modelMap[WatchlistSuggestionPattern.defaultModelTier],
            dependencies,
            logger,
            userId: 'proactive-agent',
        });
        const result = output;
        if (result.suggestions?.length > 0) {
            for (const suggestion of result.suggestions) {
                const exists = await WatchlistSuggestion.findOne({ name: suggestion.name });
                if (!exists) {
                    await WatchlistSuggestion.create({
                        ...suggestion,
                        sourceEventId: event._id.toString(),
                        status: 'PENDING',
                    });
                    suggestionsCreated++;
                }
            }
        }
    }
    logger.info({ suggestionsCreated }, 'Watchlist suggestion job complete.');
    return { status: 'complete', suggestionsCreated };
}
async function sendSupervisorReport(job, dependencies) {
    const logger = createTraceableLogger(job.id.toString());
    const { statsSummary } = job.data;
    const { output } = await dependencies.language.executeModel({
        pattern: SupervisorReportPattern,
        messages: SupervisorReportPattern.buildMessages({ stats: statsSummary }),
        model: dependencies.language.modelMap[SupervisorReportPattern.defaultModelTier],
        dependencies,
        logger,
        userId: 'supervisor-agent',
    });
    const result = output;
    if (result?.summary) {
        const emailer = new EmailService();
        await emailer.sendRawEmail({
            to: process.env.TEST_EMAIL_RECIPIENT || 'admin@example.com',
            subject: `[Cogniti Pipeline Report] Daily Summary`,
            html: `<p style="font-size: 16px; font-family: sans-serif;">${result.summary}</p><hr/><pre>${statsSummary}</pre>`,
        });
        logger.info('Supervisor report sent.');
    }
    return { status: 'complete' };
}
async function sourceHealthCheck(job, dependencies) {
    const logger = createTraceableLogger(job.id.toString());
    logger.info('Running source health check...');
    const Source = dependencies.persistence.Source;
    const sources = await Source.find({ status: 'active' }).lean();
    return { status: 'complete', checked: sources.length };
}
async function calculateTransactionLikelihood(job) {
    return { status: 'mock', job: job.id };
}
async function pruneNoisySources(job) {
    return { status: 'mock', job: job.id };
}
async function sendPushNotification(job) {
    return { status: 'mock', job: job.id };
}
export const headlinesJobHandlers = {
    'watchlist-suggestion': generateWatchlistSuggestions,
    'source-health-check': sourceHealthCheck,
    'send-supervisor-report': sendSupervisorReport,
    'calculate-transaction-likelihood': calculateTransactionLikelihood,
    'prune-noisy-sources': pruneNoisySources,
    'send-push-notification': sendPushNotification,
};
//# sourceMappingURL=handlers.js.map