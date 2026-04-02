// apps/headlines-pipeline/src/worker.ts
// File 4 of 4
// One-line rationale: Importing createdWorker from @cogniti/worker correctly now that it is exported.
import 'dotenv/config';
import { createWorker } from '@cogniti/worker';
import { headlinesJobHandlers } from './jobs/handlers.js';
const ALL_JOBS = 'all';
const QUEUE_NAME = 'cogniti-tasks-reasoning';
console.log('[Headlines-Worker] Starting dedicated worker...');
createWorker(QUEUE_NAME, ALL_JOBS, headlinesJobHandlers);
const shutdown = () => {
    console.log('[Headlines-Worker] Shutting down...');
    process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
//# sourceMappingURL=worker.js.map