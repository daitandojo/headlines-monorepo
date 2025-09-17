// apps/admin/src/lib/init-shared-logic.js (version 8.0.0)
import { configure as configureScraperLogic } from '@headlines/scraper-logic/src/config.js';
import * as appConfig from '@/../app.config.js';
import { settings, initializeSettings } from '@headlines/config/server';
import { logger } from '@headlines/utils/server';
import dbConnect from '@headlines/data-access/src/dbConnect.js'; // Import dbConnect

let isInitialized = false;

export async function initializeSharedLogic() {
  if (isInitialized) {
    return;
  }

  // CRITICAL FIX: Establish database connection *before* attempting to load settings.
  await dbConnect();
  
  // Now that a connection is guaranteed, initialize settings from the database.
  await initializeSettings();
  
  configureScraperLogic({ ...appConfig, logger, settings, utilityFunctions: {} });

  isInitialized = true;
}
