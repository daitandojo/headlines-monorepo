// packages/data-access/src/dbConnect.next.js
import 'server-only'
import { env } from '@headlines/config/next'
import dbConnectCore from './dbConnect.js'
import { logger } from '@headlines/utils-shared'

// This is the Next.js-specific implementation of dbConnect.
// It uses the core logic but provides the environment variables from the Next.js context.
export default function dbConnect() {
  return dbConnectCore(env.MONGO_URI, logger)
}
