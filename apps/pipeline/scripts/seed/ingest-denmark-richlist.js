// apps/pipeline/scripts/seed/ingest-denmark-richlist.js
import mongoose from 'mongoose'
import path from 'path'
import { reinitializeLogger, logger } from '../../../../packages/utils/src/server.js'
import { initializeScriptEnv } from './lib/script-init.js'
import { loadAndPrepareDenmarkRichlist } from './lib/denmark-richlist-data-loader.js'
import { Opportunity } from '../../../../packages/models/src/index.js'
import { contactFinderChain, performGoogleSearch } from '../../../../packages/ai-services/src/index.js'
import colors from 'ansi-colors'
import pLimit from 'p-limit'

const CONCURRENCY_LIMIT = 5;

async function createOrUpdateOpportunity(person) {
    try {
        const updateResult = await Opportunity.updateOne(
            { reachOutTo: person.name },
            {
                $setOnInsert: {
                    reachOutTo: person.name,
                    basedIn: person.country,
                    city: person.city,
                    likelyMMDollarWealth: person.wealthMillionsUSD,
                    // DEFINITIVE FIX: Always initialize contactDetails as an object on insert.
                    contactDetails: {
                        company: person.primaryCompany,
                    }
                },
                $addToSet: { whyContact: { $each: person.whyContact } }
            },
            { upsert: true }
        );

        if (updateResult.upsertedCount > 0) {
            logger.info(colors.green(`  ✅ Created new Opportunity for: ${person.name}`));
        } else if (updateResult.modifiedCount > 0) {
            logger.info(colors.yellow(`  🔄 Updated existing Opportunity for: ${person.name}`));
        } else {
            logger.info(`  ⚪️ No changes for Opportunity: ${person.name}`);
        }
        return { success: true, name: person.name };
    } catch (error) {
        logger.error({ err: error }, `❌ Failed to create/update opportunity for ${person.name}`);
        return { success: false };
    }
}

async function enrichOpportunityWithContact(name) {
    try {
        const opportunity = await Opportunity.findOne({ reachOutTo: name });
        if (!opportunity || opportunity.contactDetails?.email) {
            logger.trace(`  -> Skipping email search for ${name} (already exists or opp not found).`);
            return { success: true, found: false };
        }

        // DEFINITIVE FIX: If contactDetails somehow doesn't exist, create it.
        if (!opportunity.contactDetails) {
            opportunity.contactDetails = {};
        }

        logger.info(`  -> AI Contact Finder: Searching for email for ${name}...`);
        
        const searchQuery = `"${opportunity.reachOutTo}" "${opportunity.contactDetails?.company || ''}" email contact`;
        const searchResult = await performGoogleSearch(searchQuery);

        if (!searchResult.success || !searchResult.snippets) {
            logger.warn(`  -> Web search failed for ${name}. Cannot find email.`);
            return { success: true, found: false };
        }

        const response = await contactFinderChain({ snippets: searchResult.snippets });

        if (response && !response.error && response.email) {
            opportunity.contactDetails.email = response.email;
            await opportunity.save();
            logger.info(colors.green(`    ✅ Found and saved email for ${name}: ${response.email}`));
            return { success: true, found: true };
        } else {
            logger.warn(`    -> AI could not find an email for ${name}.`);
            return { success: true, found: false };
        }
    } catch (error) {
        logger.error({ err: error }, `❌ Failed during contact enrichment for ${name}`);
        return { success: false };
    }
}

async function main() {
  reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'))
  await initializeScriptEnv()
  logger.info('🚀 Starting Denmark Direct-to-Opportunity Ingestion Script...');

  const { allIndividuals } = await loadAndPrepareDenmarkRichlist()
  
  logger.info(`🔥 Launching concurrent processing for ${allIndividuals.length} individuals with a limit of ${CONCURRENCY_LIMIT}...`);

  const limit = pLimit(CONCURRENCY_LIMIT);
  const processingPromises = allIndividuals.map(person => 
    limit(async () => {
      logger.info(colors.cyan(`\n--- Processing: ${person.name} ---`))
      const createResult = await createOrUpdateOpportunity(person);
      if (createResult.success) {
          await enrichOpportunityWithContact(createResult.name);
      }
    })
  );

  await Promise.all(processingPromises);

  logger.info('\n--- Ingestion Summary ---');
  logger.info(colors.green('✅ Script finished. All individuals processed.'));
}

main()
  .catch((err) =>
    logger.fatal({ err }, 'A critical error occurred in the main script execution.')
  )
  .finally(() => {
    if (mongoose.connection.readyState === 1) {
      mongoose.disconnect()
    }
    process.exit(0)
  })
