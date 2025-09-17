// apps/pipeline/scripts/migrations/V2_Clean_Opportunity_Reasons.js (version 1.1.0)
import mongoose from 'mongoose';
import { Opportunity } from '../../../../packages/models/src/index.js';
import dbConnect from '../../../../packages/data-access/src/dbConnect.js';
import { reinitializeLogger, logger } from '../../../../packages/utils/src/server.js';
import path from 'path';

reinitializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'));

async function cleanOpportunityReasons() {
    logger.info('🚀 Starting V2 Migration: Clean Opportunity `whyContact` field...');
    await dbConnect();

    try {
        // Find documents where whyContact is a string OR is an array containing strings with the date pattern.
        const opportunitiesToMigrate = await Opportunity.find({ 
            $or: [
                { whyContact: { $type: 'string' } },
                { whyContact: { $regex: /\(as of.*\)$/ } }
            ]
        });
        
        if (opportunitiesToMigrate.length === 0) {
            logger.info('✅ No documents need migration. Schema is up to date.');
            return;
        }

        logger.info(`Found ${opportunitiesToMigrate.length} opportunities to migrate...`);
        const bulkOps = [];
        for (const opp of opportunitiesToMigrate) {
            let reasons = Array.isArray(opp.whyContact) ? opp.whyContact : [opp.whyContact];
            
            // Clean each reason in the array
            const cleanedReasons = reasons
                .filter(r => typeof r === 'string') // Ensure we only process strings
                .map(r => r.replace(/\s\(as of.*\)$/, ''));

            bulkOps.push({
                updateOne: {
                    filter: { _id: opp._id },
                    update: { $set: { whyContact: cleanedReasons } } // Set the cleaned array
                }
            });
        }

        if (bulkOps.length > 0) {
            const result = await Opportunity.bulkWrite(bulkOps);
            logger.info(`✅ Migration successful. Modified ${result.modifiedCount} documents.`);
        }
    } catch (error) {
        logger.fatal({ err: error }, '❌ Migration V2 failed!');
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }
}

cleanOpportunityReasons();
