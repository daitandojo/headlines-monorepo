// apps/pipeline/scripts/results/list-events.js (version 2.0)
import dbConnect from '../../../../packages/data-access/src/dbConnect.js';
import { SynthesizedEvent } from '../../../../packages/models/src/index.js';
import mongoose from 'mongoose';
import { formatDistanceToNow } from 'date-fns';

async function main() {
    await dbConnect();
    try {
        const events = await SynthesizedEvent.find({}).sort({ createdAt: -1 }).limit(10).lean();
        if (events.length === 0) {
            console.log('No recent events found.');
        } else {
            console.log('\n--- Last 10 Synthesized Events ---');
            console.table(events.map(e => ({
                Headline: e.synthesized_headline.substring(0, 80),
                Score: e.highest_relevance_score,
                Country: e.country,
                'Key Individuals': (e.key_individuals || []).map(k => k.name).join(', '),
                Created: `${formatDistanceToNow(new Date(e.createdAt))} ago`,
            })));
        }
    } catch (error) {
        console.error('Failed to list events:', error);
    } finally {
        await mongoose.disconnect();
    }
}
main();
