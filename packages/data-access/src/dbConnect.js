// packages/data-access/src/dbConnect.js
import { env } from '@headlines/config/node'
import dbConnectCore from './dbConnectCore.js'
import { logger } from '@headlines/utils-shared'

// This is the Node.js-specific implementation of dbConnect.
// It uses the core logic but provides the environment variables from the Node.js context.
export default function dbConnect() {
  return dbConnectCore(env.MONGO_URI, logger)
}
