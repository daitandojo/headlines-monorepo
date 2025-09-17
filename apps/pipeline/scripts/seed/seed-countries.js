// apps/pipeline/scripts/seed/seed-countries.js (version 2.3.0)
import { reinitializeLogger as initializeLogger, logger } from '../../../../packages/utils/src/server.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Country } from '../../../../packages/models/src/index.js';
import dbConnect from '../../../../packages/data-access/src/dbConnect.js';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
initializeLogger(path.resolve(process.cwd(), 'apps/pipeline/logs'));

function loadCountriesFromFile() {
    const filePath = path.resolve(__dirname, '../../../../packages/utils/src/data/countries.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const countryData = JSON.parse(fileContent);
    return Object.entries(countryData).map(([name, isoCode]) => ({ name, isoCode }));
}

async function seedCountries() {
  await dbConnect();
  logger.info('🚀 Seeding Countries from canonical JSON file...');
  const countriesToSeed = loadCountriesFromFile();
  try {
    const bulkOps = countriesToSeed.map((country) => ({
      updateOne: {
        filter: { name: country.name },
        update: { $set: { isoCode: country.isoCode.substring(0,2) }, $setOnInsert: { name: country.name, status: 'active' } },
        upsert: true,
      },
    }));

    const result = await Country.bulkWrite(bulkOps);
    logger.info(`✅ Country seeding complete. ${result.upsertedCount} new countries added, ${result.modifiedCount} updated.`);
  } catch (error) {
    logger.fatal({ err: error }, '❌ Country seeding failed.');
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

seedCountries();
