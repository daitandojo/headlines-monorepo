// apps/pipeline/scripts/sources/scrape-one.js (version 1.5.0)
undefined
import { initializeSettings } undefined;
import { truncateString } from '../../../../packages/utils/src/index.js';
import { logger, reinitializeLogger } from '../../../../packages/utils-server';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import mongoose from 'mongoose';
import { Source } from '../../../../packages/models/src/index.js';
import dbConnect from '../../../../packages/data-access/src/dbConnect.js';
import { configure as configureScraperLogic } from '@headlines/scraper-logic/config.js';
import { scrapeSiteForHeadlines, scrapeArticleContent } from '@headlines/scraper-logic/scraper/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

reinitializeLogger(path.join(PROJECT_ROOT, 'logs'));

configureScraperLogic({
  paths: { debugHtmlDir: path.join(PROJECT_ROOT, 'debug_html') },
  configStore: {},
});

// ... (rest of the script remains the same)
async function scrapeOne() {
  const argv = yargs(hideBin(process.argv))
    .option('source', {
      alias: 's',
      type: 'string',
      description: 'The name of the source to scrape.',
      demandOption: true,
    })
    .help()
    .alias('help', 'h').argv;

  const sourceName = argv.source;
  logger.info(`🚀 Starting single source scrape for: "${sourceName}"`);

  try {
    await dbConnect();
    await initializeSettings();

    const source = await Source.findOne({ name: new RegExp(`^${sourceName}$`, 'i') }).lean();
    if (!source) {
      logger.error(`❌ Source "${sourceName}" not found in the database.`);
      return;
    }

    logger.info('🔬 Source Configuration:\n' + JSON.stringify(source, null, 2));

    logger.info('\n▶️  Phase 1: Scraping Headlines...');
    const headlineResult = await scrapeSiteForHeadlines(source);

    if (!headlineResult.success || headlineResult.resultCount === 0) {
      logger.error(`❌ Headline scraping failed. Reason: ${headlineResult.error || 'No headlines found.'}`);
      return;
    }

    logger.info(`✅ Found ${headlineResult.resultCount} headlines.`);
    const firstArticle = headlineResult.articles[0];
    logger.info(`    - First Headline: "${firstArticle.headline}"\n    - Link: ${firstArticle.link}`);

    logger.info('\n▶️  Phase 2: Scraping Content for First Article...');
    const contentResult = await scrapeArticleContent(
      { ...firstArticle, source: source.name, newspaper: source.name, country: source.country },
      source
    );

    if (contentResult.articleContent && contentResult.articleContent.contents.length > 0) {
      const content = contentResult.articleContent.contents.join('\n');
      logger.info(`✅ Content scraping successful! (${content.length} chars)`);
      logger.info(`    - Snippet: "${truncateString(content, 300)}..."`);
    } else {
      logger.error(`❌ Content scraping failed. Reason: ${contentResult.enrichment_error}`);
      if (contentResult.contentPreview) {
        logger.warn(`    - Scraped Preview: "${contentResult.contentPreview}..."`);
      }
    }
  } catch (error) {
    logger.fatal({ err: error }, 'A critical error occurred during the scrape-one script.');
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      logger.info('Database connection closed.');
    }
  }
}
scrapeOne();
