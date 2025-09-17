// apps/pipeline/scripts/maintenance/recalculate-analytics.js (version 1.0.0)
import mongoose from 'mongoose';
import { Source } from '../../../../packages/models/src/index.js';
import dbConnect from '../../../../packages/data-access/src/dbConnect.js';
import { reinitializeLogger, logger } from '../../../../packages/utils/src/server.js';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'));

async function recalculateAnalytics() {
    const argv = yargs(hideBin(process.argv))
        .option('yes', { type: 'boolean', description: 'Skip confirmation prompt.' })
        .help().argv;
        
    logger.info('🚀 Starting Source Analytics Recalculation...');
    await dbConnect();

    try {
        const sources = await Source.find({}).select('analytics').lean();
        if (sources.length === 0) {
            logger.info('No sources found. Nothing to do.');
            return;
        }

        const bulkOps = sources.map(source => {
            const totalRelevant = source.analytics?.totalRelevant || 0;
            return {
                updateOne: {
                    filter: { _id: source._id },
                    update: {
                        $set: {
                            'analytics.totalRuns': 0,
                            'analytics.totalSuccesses': 0,
                            'analytics.totalFailures': 0,
                            // Set totalScraped to be at least the number of relevant articles.
                            'analytics.totalScraped': Math.max(0, totalRelevant),
                        }
                    }
                }
            };
        });

        logger.warn(`This script will perform the following actions on ${sources.length} sources:`);
        logger.warn(`  1. Correct 'totalScraped' to equal 'totalRelevant' (ensuring no negative relevance %).`);
        logger.warn(`  2. Reset 'totalRuns', 'totalSuccesses', and 'totalFailures' to 0.`);
        logger.warn('This will provide a clean slate for the new, more accurate analytics collection.');
        
        if (!argv.yes) {
            const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
            const answer = await new Promise(resolve => readline.question('Are you sure you want to proceed? (yes/no): ', resolve));
            readline.close();
            if (answer.toLowerCase() !== 'yes') {
                logger.info('Operation cancelled by user.');
                return;
            }
        }
        
        logger.info('Applying bulk update to the database...');
        const result = await Source.bulkWrite(bulkOps);
        logger.info(`✅ Analytics reset complete. Modified ${result.modifiedCount} source documents.`);

    } catch (error) {
        logger.fatal({ err: error }, '❌ Failed to recalculate source analytics.');
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

recalculateAnalytics();
