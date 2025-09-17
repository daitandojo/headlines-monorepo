// apps/pipeline/scripts/maintenance/pipeline-correct-countries.js (version 1.0)
'use server'

import mongoose from 'mongoose';
import { Opportunity } from '../../../../packages/models/src/index.js';
import dbConnect from '../../../../packages/data-access/src/dbConnect.js';
import { logger, reinitializeLogger } from '../../../../packages/utils/src/server.js';
import { countryCorrectionChain } from '../../../../packages/ai-services/src/index.js';
import { initializeScriptEnv } from '../seed/lib/script-init.js';
import colors from 'ansi-colors';
import cliProgress from 'cli-progress';
import path from 'path';

reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'));

async function main() {
  await initializeScriptEnv();
  logger.info('🚀 Starting Retrospective Country Data Cleanup (Efficient Mode)...');

  try {
    const allBasedInValues = await Opportunity.distinct('basedIn');
    
    if (allBasedInValues.length === 0) {
        logger.info('✅ No opportunities with country data found to scan.');
        return;
    }
    
    // Filter down to only values that look incorrect, to save on AI calls
    const invalidValues = allBasedInValues.filter(v => v && (v.includes('(') || v.includes('/') || v.length > 30 || !/^[a-zA-Z\s]+$/.test(v) ));

    if (invalidValues.length === 0) {
        logger.info('✅ No invalid-looking country names found. Data appears clean.');
        return;
    }

    logger.info(`Found ${invalidValues.length} unique potentially invalid 'basedIn' values to correct...`);
    
    const bulkOps = [];
    const progressBar = new cliProgress.SingleBar({
        format: `Correcting | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Unique Locations`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
    });
    progressBar.start(invalidValues.length, 0);

    for (const originalCountry of invalidValues) {
        // DEFINITIVE FIX: Call the chain as an async function.
        const result = await countryCorrectionChain({ location_string: originalCountry });

        if (result && !result.error && result.country && result.country !== originalCountry) {
            logger.info(`Correction found: "${originalCountry}" -> "${result.country}"`);
            bulkOps.push({
                updateMany: {
                    filter: { basedIn: originalCountry },
                    update: { $set: { basedIn: result.country } }
                }
            });
        }
        progressBar.increment();
    }
    progressBar.stop();

    if (bulkOps.length > 0) {
        logger.info(`Found ${bulkOps.length} unique corrections to apply. Applying bulk update...`);
        const result = await Opportunity.bulkWrite(bulkOps);
        logger.info(colors.green(`✅ Cleanup complete. Modified ${result.modifiedCount} opportunity documents.`));
    } else {
        logger.info('✅ No country corrections were needed.');
    }

  } catch (error) {
    logger.error({ err: error }, 'An error occurred during the country cleanup process.');
  } finally {
    if (mongoose.connection.readyState === 1){
        await mongoose.disconnect();
    }
  }
}

main();
