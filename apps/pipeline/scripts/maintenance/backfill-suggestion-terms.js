// apps/pipeline/scripts/maintenance/backfill-suggestion-terms.js
'use server'

import mongoose from 'mongoose';
import { WatchlistSuggestion } from '../../../../packages/models/src/index.js';
import dbConnect from '../../../../packages/data-access/src/dbConnect.js';
import { initializeScriptEnv } from '../seed/lib/script-init.js';
import { logger } from '../../../../packages/utils/src/server.js';
import { callLanguageModel } from '../../../../packages/ai-services/src/index.js';
import colors from 'ansi-colors';
import cliProgress from 'cli-progress';
import pLimit from 'p-limit';

const CONCURRENCY_LIMIT = 5;

const getSearchTermPrompt = () => `
You are a search query generation expert for a financial intelligence firm. Your task is to analyze an entity's name, type, and context to generate a list of likely search terms (or "crums") that would identify this entity in news headlines.
**CRITICAL Instructions:**
1.  Analyze the Input: You will receive the entity's formal name, its type (person, family, company), and a brief rationale.
2.  Generate Aliases and Keywords: Think of common abbreviations, alternative spellings, key individuals, or related company names.
3.  Return a List: Your output MUST be an array of 2-4 lowercase strings.
4.  Simplicity is Key: The terms should be simple and likely to appear in text. Good examples: 'haugland', 'syversen', 'nordic capital'. Bad examples: 'the', 'capital', 'family'.
5.  Your response MUST be a valid JSON object with the following structure: { "searchTerms": ["term1", "term2"] }
`;

async function main() {
    await initializeScriptEnv();
    logger.info('🚀 Starting one-off backfill of search terms for watchlist suggestions...');

    try {
        const suggestionsToUpdate = await WatchlistSuggestion.find({
            status: 'candidate',
            $or: [
                { searchTerms: { $exists: false } },
                { searchTerms: { $size: 0 } }
            ]
        }).lean();

        if (suggestionsToUpdate.length === 0) {
            logger.info('✅ No suggestions found that need backfilling. All items are up to date.');
            return;
        }

        logger.info(`Found ${suggestionsToUpdate.length} suggestions to update. Processing in parallel...`);
        const progressBar = new cliProgress.SingleBar({
            format: `Backfilling | ${colors.cyan('{bar}')} | {percentage}% || {value}/{total} Suggestions`,
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
        });
        progressBar.start(suggestionsToUpdate.length, 0);

        const limit = pLimit(CONCURRENCY_LIMIT);
        const bulkOps = [];

        const processingPromises = suggestionsToUpdate.map(suggestion => 
            limit(async () => {
                try {
                    const userContent = `Entity Name: ${suggestion.name}\nEntity Type: ${suggestion.type}\nRationale: ${suggestion.rationale}`;
                    const result = await callLanguageModel({
                        modelName: process.env.LLM_MODEL_UTILITY || 'gpt-5-nano',
                        systemPrompt: getSearchTermPrompt(),
                        userContent,
                        isJson: true
                    });
                    
                    if (result && !result.error && result.searchTerms) {
                        bulkOps.push({
                            updateOne: {
                                filter: { _id: suggestion._id },
                                update: { $set: { searchTerms: result.searchTerms } }
                            }
                        });
                        logger.trace(`Generated terms for "${suggestion.name}": ${result.searchTerms.join(', ')}`);
                    } else {
                        logger.warn(`Failed to generate terms for "${suggestion.name}".`);
                    }
                } catch (error) {
                     logger.error({ err: error }, `Error processing suggestion ${suggestion.name}`);
                } finally {
                    progressBar.increment();
                }
            })
        );

        await Promise.all(processingPromises);
        progressBar.stop();
        
        if (bulkOps.length > 0) {
            logger.info(`Applying ${bulkOps.length} updates to the database...`);
            const updateResult = await WatchlistSuggestion.bulkWrite(bulkOps);
            logger.info(colors.green(`✅ Backfill complete. Successfully updated ${updateResult.modifiedCount} suggestions.`));
        } else {
            logger.warn('Backfill process finished, but no successful updates were generated.');
        }

    } catch (error) {
        logger.error({ err: error }, 'A critical error occurred during the backfill process.');
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

main();
